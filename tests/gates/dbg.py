import http.server, socketserver, threading, functools, time
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

PORT = 8797
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1280,"height":720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.on("requestfailed", lambda r: print("FAILED:", r.url[:120]))
    pg.on("pageerror", lambda e: print("PAGEERR:", str(e)[:200]))
    pg.route("**/*", lambda route: route.continue_() if "127.0.0.1" in route.request.url else route.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Clock/i").first.click()
    time.sleep(8)
    # is a canvas there, and what's drawn?
    print(pg.evaluate("""() => {
      const c = document.querySelector('canvas');
      if (!c) return 'NO CANVAS';
      const g = c.getContext('webgl2') || c.getContext('webgl');
      return 'canvas ' + c.width + 'x' + c.height + ' ctx=' + !!g;
    }"""))
    snap(pg, "dbg-clock.png")
    b.close()
