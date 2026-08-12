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
    pg.on("console", lambda m: print("CON:", m.type, m.text[:160]))
    pg.on("pageerror", lambda e: print("PAGEERR:", str(e)[:200]))
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    print(pg.evaluate("""async () => {
      const r = await fetch('/fonts/chemlab-mono.woff');
      const b = await r.arrayBuffer();
      return 'font fetch ' + r.status + ' bytes=' + b.byteLength;
    }"""))
    pg.locator("text=/Clock/i").first.click()
    time.sleep(10)
    b.close()
