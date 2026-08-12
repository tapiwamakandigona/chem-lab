import http.server, socketserver, threading, functools, time, sys
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
BLOCK = "--block" in sys.argv
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()


def frac(path):
    im = Image.open(path).convert("L").crop((100, 100, 900, 650))
    hist = im.histogram()
    return round(1 - sum(hist[:25]) / sum(hist), 3)


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.on("pageerror", lambda e: print("PAGEERR:", str(e)[:300], flush=True))
    pg.on("console", lambda m: print("CON:", m.text[:200], flush=True)
          if m.type in ("error", "warning") and "GSUB" not in m.text else None)
    if BLOCK:
        pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Titration/i").first.click()
    prev = 0
    for t in (8, 16, 30):
        time.sleep(t - prev); prev = t
        path = f"{SHOTS}/dbg5-titr-{t}s{'-blk' if BLOCK else ''}.png"
        snap(pg, os.path.basename(path))
        print(f"t={t}s frac={frac(path)}", flush=True)
    b.close()
