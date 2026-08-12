"""F12 gate: drag the weighing boat into the calorimeter cup to start.

Real pointer drag: grab the Na2CO3 weighing boat off the balance pan,
drag onto the polystyrene cup, release. Asserts the run starts (Running
UI state, T2 rising) and that Reset restores the button path. Exit 1 on
any failure.
"""
import http.server, socketserver, threading, functools, time, sys, re
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


def t2_of(pg):
    m = re.search(r"Final temperature[^\d]*([\d.]+)", pg.locator("body").inner_text(), re.S)
    return float(m.group(1)) if m else None


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Enthalpy/i").first.click()
    time.sleep(16)

    body = pg.locator("body").inner_text()
    check("starts in setup", "Add Na" in body and t2_of(pg) == 22.0)

    # drag boat (balance pan, right) onto the cup (left)
    pg.mouse.move(790, 360)
    pg.mouse.down()
    for x, y in [(720, 350), (620, 340), (520, 335), (440, 330), (420, 335)]:
        pg.mouse.move(x, y, steps=4)
        time.sleep(0.05)
    snap(pg, "tip-drag.png")
    pg.mouse.up()

    # Poll: the 5 s run can finish before fixed sleeps under SwiftShader,
    # so catch ANY evidence the run started (Running state or T2 above T1).
    started, shot = False, False
    t0 = time.time()
    while time.time() - t0 < 12:
        body = pg.locator("body").inner_text()
        t2 = t2_of(pg)
        if "Running" in body or (t2 is not None and t2 > 22.0):
            started = True
            if not shot:
                snap(pg, "tip-stream.png")
                shot = True
        if t2 == 32.1 and "Running" not in body:
            break
        time.sleep(0.15)
    check("drag-to-tip started run", started)
    check("run completes (T2 32.1)", t2_of(pg) == 32.1, f"T2={t2_of(pg)}")
    pg.locator("button", has_text="Reset").click()
    time.sleep(0.5)
    body = pg.locator("body").inner_text()
    check("reset returns to setup", "Add Na" in body and t2_of(pg) == 22.0)

    b.close()

httpd.shutdown()
sys.exit(1 if fails else 0)
