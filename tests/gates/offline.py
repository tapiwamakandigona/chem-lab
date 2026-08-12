"""F-offline gate: PWA must fully work with the network DEAD after first load.

1. Serve dist, load app, wait for service worker to activate + precache.
2. Shut the HTTP server down completely (TCP-level offline, SW can't cheat).
3. Reload page, open the Titration scene, verify 3D content actually renders
   (content-fraction on screenshot, PIL — never gl.readPixels).
Exit 1 on any failure.
"""
import functools
import http.server
import io
import re
import socketserver
import sys
import threading
import time

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

import os
from pathlib import Path
DIST = os.environ.get("CHEMLAB_DIST", str(Path(__file__).resolve().parents[2] / "dist"))
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
os.makedirs(SHOTS, exist_ok=True)

TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


PORT = 8797
DIST = DIST

socketserver.TCPServer.allow_reuse_address = True
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + detail if detail else ""), flush=True)
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport={"width": 1280, "height": 720})
    pg = ctx.new_page()
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")

    # Expected = unique URLs in the generated precache manifest (sw.js).
    expected = len(set(re.findall(r'url:\s*"([^"]+)"', open(f"{DIST}/sw.js").read())))
    check("sw.js precache manifest sane", expected >= 12, f"unique entries={expected}")

    # Wait for SW active, then poll until precache holds every manifest entry.
    pg.evaluate("() => navigator.serviceWorker.ready.then(() => true)")
    precached = 0
    for _ in range(60):
        precached = pg.evaluate("""async () => {
            const names = await caches.keys();
            const pre = names.find(n => n.includes('precache'));
            if (!pre) return 0;
            return (await (await caches.open(pre)).keys()).length;
        }""")
        if precached >= expected:
            break
        time.sleep(1)
    check("service worker precached full app shell", precached >= expected,
          f"cached={precached} expected={expected}")

    # ---- NETWORK GOES DARK ----
    httpd.shutdown()
    httpd.server_close()
    print("HTTP server DOWN — everything below is offline", flush=True)

    pg.reload(wait_until="load")
    time.sleep(2)
    menu_ok = pg.evaluate("() => document.body.innerText.includes('Titration')")
    check("menu loads offline after reload", menu_ok)

    pg.locator("text=/Titration/i").first.click()
    # Poll content fraction AND contrast — SwiftShader render time varies
    # 8-40 s, and a flat light canvas (fog bg, no geometry) must not pass.
    frac, std, t0 = 0.0, 0.0, time.time()
    while time.time() - t0 < 75:
        im = Image.open(io.BytesIO(pg.screenshot(timeout=TIMEOUT_MS))).convert("L").crop((200, 100, 900, 650))
        hist = im.histogram()
        frac = 1 - sum(hist[:25]) / sum(hist)
        std = ImageStat.Stat(im).stddev[0]
        if frac > 0.5 and std > 25:
            break
        time.sleep(3)
    check("titration 3D scene renders offline", frac > 0.5 and std > 25,
          f"frac={frac:.3f} std={std:.1f} at {time.time()-t0:.0f}s")

    body = pg.locator("body").inner_text()
    check("burette UI present offline", "READING" in body.upper(), "")

    snap(pg, "offline-titration.png")

    b.close()

sys.exit(1 if fails else 0)
