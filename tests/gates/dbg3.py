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

def probe(pg, name, wait):
    for t in range(wait):
        time.sleep(1)
        # sample center-left pixel block via canvas readback
        px = pg.evaluate("""() => {
          const c = document.querySelector('canvas');
          if (!c) return null;
          const gl = c.getContext('webgl2') || c.getContext('webgl');
          const buf = new Uint8Array(4);
          gl.readPixels(Math.floor(c.width*0.35), Math.floor(c.height*0.5), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
          return Array.from(buf);
        }""")
        if px and (px[0]+px[1]+px[2]) > 60:
            print(f"{name}: content at t={t+1}s px={px}")
            return True
    print(f"{name}: STILL BLANK after {wait}s px={px}")
    return False

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1280,"height":720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Clock/i").first.click()
    probe(pg, "clock", 30)
    snap(pg, "dbg3-clock.png")
    b.close()
