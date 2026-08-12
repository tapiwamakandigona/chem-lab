"""ChemLab probe: serve dist/, screenshot menu + each experiment.

Usage: uv run python shot.py [tag] [--mobile]
Deterministic: polls screenshots until the canvas shows content (SwiftShader
render time varies 8-40s; fixed sleeps give false blanks — iter-6 lesson).
Shots -> /work/build/chemlab/shots/{tag}-*.png
"""
import http.server, socketserver, threading, functools, time, sys, os

from playwright.sync_api import sync_playwright

import os
DIST = os.environ.get("CHEMLAB_DIST", "/work/build/chemlab/main/dist")
SHOTS = os.environ.get("CHEMLAB_SHOTS", "/work/build/chemlab/shots")
os.makedirs(SHOTS, exist_ok=True)

TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)

from PIL import Image

PORT = 8797
DIST = DIST
OUT = "/work/build/chemlab/shots"
TAG = sys.argv[1] if len(sys.argv) > 1 else "iter"
MOBILE = "--mobile" in sys.argv

os.makedirs(OUT, exist_ok=True)
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()


def content_frac(path, box):
    im = Image.open(path).convert("L").crop(box)
    hist = im.histogram()
    return 1 - sum(hist[:25]) / sum(hist)


def wait_for_render(pg, path, box, timeout=75):
    """Screenshot repeatedly until the 3D area isn't near-black."""
    t0 = time.time()
    while True:
        snap(pg, os.path.basename(path))
        f = content_frac(path, box)
        el = time.time() - t0
        if f > 0.5:
            return True, f, el
        if el > timeout:
            return False, f, el
        time.sleep(4)


def main():
    vp = {"width": 390, "height": 844} if MOBILE else {"width": 1280, "height": 720}
    box = (10, 90, 380, 420) if MOBILE else (200, 100, 900, 650)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                    "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport=vp, is_mobile=MOBILE, has_touch=MOBILE)
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        # Offline-first gate: kill every non-localhost request
        pg.route("**/*", lambda route: route.continue_()
                 if "127.0.0.1" in route.request.url else route.abort())
        pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load", timeout=60000)
        time.sleep(3)
        pg.screenshot(path=f"{OUT}/{TAG}-menu.png")
        print("menu shot ok", flush=True)

        for name, key in [("Titration", "titration"), ("Clock", "clock"),
                          ("Enthalpy", "enthalpy")]:
            try:
                pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
                time.sleep(2)
                pg.locator(f"text=/{name}/i").first.click(timeout=8000)
                ok, f, el = wait_for_render(pg, f"{OUT}/{TAG}-{key}.png", box)
                print(f"{key} shot {'ok' if ok else 'BLANK'} frac={f:.3f} at {el:.0f}s", flush=True)
            except Exception as e:
                print(f"{key} FAILED: {e}", flush=True)
        b.close()
    for e in errors[:10]:
        print("ERR:", e, flush=True)


if __name__ == "__main__":
    main()
