"""F2 gate: scripted S22 titration to endpoint via real UI clicks.

Asserts: burette drains, titre updates, endpoint pink appears at 23.85,
UI shows endpoint state. Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys
from playwright.sync_api import sync_playwright

import os
from pathlib import Path
DIST = os.environ.get("CHEMLAB_DIST", str(Path(__file__).resolve().parents[2] / "dist"))
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
os.makedirs(SHOTS, exist_ok=True)

TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))
SHOT_TIMEOUT_MS = int(os.environ.get("CHEMLAB_SHOT_TIMEOUT_MS", str(TIMEOUT_MS)))

# CI probes force the LOW graphics preset (CHEMLAB_QUALITY=low): SwiftShader
# software rendering is far slower than any student device, and slow frames
# would delay clicks past timing-sensitive windows. No product assertion
# changes; gfx.py owns the quality-tier checks and never seeds this.
_QUALITY_SEED = os.environ.get("CHEMLAB_QUALITY", "")
if _QUALITY_SEED:
    from playwright.sync_api import Browser as _Browser, BrowserContext as _Ctx

    def _seeding(new_page):
        def wrapped(self, **kwargs):
            _pg = new_page(self, **kwargs)
            _pg.add_init_script(
                "try { localStorage.setItem('chemlab-quality', '%s') } catch (e) {}"
                % _QUALITY_SEED
            )
            return _pg
        return wrapped

    _Browser.new_page = _seeding(_Browser.new_page)
    _Ctx.new_page = _seeding(_Ctx.new_page)


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=SHOT_TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


PORT = 8797
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
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
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Titration/i").first.click()
    time.sleep(16)

    def reading():
        return pg.locator("text=CURRENT READING").locator("..").inner_text()

    # 4 x 5cm3 = 20.00
    for i in range(4):
        pg.locator("button", has_text="5 cm³").click()
        time.sleep(0.4)
    r1 = reading()
    check("reading after 4x5cm3 = 20.00", "20.00" in r1, r1.replace("\n", " "))

    # 3 x 1 = 23.00
    for i in range(3):
        pg.locator("button", has_text="1 cm³").click()
        time.sleep(0.3)
    # 8 x 0.10 = 23.80
    for i in range(8):
        pg.locator("button", has_text="0.10").click()
        time.sleep(0.2)
    r2 = reading()
    check("reading 23.80 before endpoint", "23.80" in r2, r2.replace("\n", " "))
    ep_before = pg.evaluate("() => document.body.innerText.includes('ENDPOINT') || document.body.innerText.includes('endpoint')")
    # one 0.05 -> 23.85 = endpoint
    pg.locator("button", has_text="0.05").click()
    time.sleep(1.5)
    # F16: at the endpoint the numeric reading is MASKED — the student must
    # read the burette themselves before the titre records.
    r3 = reading()
    check("reading masked at endpoint", "?.??" in r3, r3.replace("\n", " "))
    body = pg.locator("body").inner_text()
    check("UI signals endpoint", ("ndpoint" in body) or ("pink" in body.lower() and "permanent" in body.lower()))
    # complete the read-check with the true reading -> titre records
    pg.fill('[data-testid="burette-read-input"]', "23.85")
    pg.click('[data-testid="burette-read-check"]')
    time.sleep(1.0)
    body2 = pg.locator("body").inner_text()
    check("titre 23.85 recorded after read-check", "Run 1" in body2 and "23.85" in body2)
    time.sleep(10)
    snap(pg, "f2-endpoint.png")
    b.close()

sys.exit(1 if fails else 0)
