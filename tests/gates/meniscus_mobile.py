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

PORT=8797
h=functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address=True
httpd=socketserver.TCPServer(("",PORT),h)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
fails=[]
def check(n,c,d=""):
    print(("PASS " if c else "FAIL ")+n+(" "+d if d else ""),flush=True)
    if not c: fails.append(n)
with sync_playwright() as p:
    b=p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
    pg=b.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
    pg.route("**/*",lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html",wait_until="load")
    time.sleep(2)
    pg.locator("text=/Titration/i").first.click()
    time.sleep(16)
    tog=pg.locator('[data-testid=meniscus-toggle-mobile]')
    check("mobile toggle visible",tog.is_visible())
    tog.click(); time.sleep(0.5)
    svg=pg.locator('[data-testid=meniscus-svg]')
    check("panel opens on mobile",svg.count()==1 and svg.is_visible())
    t=float(svg.get_attribute("data-target"))
    pg.fill('[data-testid=meniscus-input]',f"{t:.2f}")
    pg.locator('[data-testid=meniscus-check]').click(); time.sleep(0.3)
    r=pg.locator('[data-testid=meniscus-result]').inner_text()
    check("exact graded correct on mobile","Correct" in r,r)
    snap(pg, "meniscus-mobile.png")
    b.close()
httpd.shutdown()
sys.exit(1 if fails else 0)
