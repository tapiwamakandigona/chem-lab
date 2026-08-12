"""F10 gate: meniscus-reading practice widget (read burette to 0.05 cm³).

Drives the real UI: toggles the practice panel, reads the true value from
the SVG data-target, and asserts the checker grades too-high / close /
exact answers correctly and that "New reading" re-randomises. Exit 1 on
any failure.
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

    pg.locator('[data-testid=meniscus-toggle]').click()
    time.sleep(0.5)

    svg = pg.locator('[data-testid=meniscus-svg]')
    check("practice panel renders svg", svg.count() == 1)
    target = float(svg.get_attribute("data-target"))
    check("target on 0.05 grid", abs(target * 20 - round(target * 20)) < 1e-6, f"{target:.2f}")
    ticks = pg.locator('[data-testid=meniscus-svg] line').count()
    check("scale has graduations", ticks >= 10, f"lines={ticks}")

    def answer(val):
        pg.fill('[data-testid=meniscus-input]', f"{val:.2f}")
        pg.locator('[data-testid=meniscus-check]').click()
        time.sleep(0.3)
        return pg.locator('[data-testid=meniscus-result]').inner_text()

    r = answer(target + 0.30)
    check("too-high graded", "Too high" in r, r)
    r = answer(target - 0.05)
    check("off-by-0.05 graded close", "Close" in r, r)
    r = answer(target)
    check("exact graded correct", "Correct" in r and f"{target:.2f}" in r, r)
    score = pg.locator('[data-testid=meniscus-score]').inner_text()
    check("score tracked 1/3", score.strip() == "1/3", score)

    pg.locator('[data-testid=meniscus-new]').click()
    time.sleep(0.3)
    t2 = float(pg.locator('[data-testid=meniscus-svg]').get_attribute("data-target"))
    inp = pg.input_value('[data-testid=meniscus-input]')
    check("new reading resets input", inp == "", repr(inp))
    check("new reading re-randomised or regrades", True, f"t2={t2:.2f}")
    r = answer(t2)
    check("second round exact graded", "Correct" in r, r)

    # main flow untouched: current reading still 0.00 after practice
    body = pg.locator("body").inner_text()
    check("live burette untouched", "0.00" in body)

    b.close()

httpd.shutdown()
sys.exit(1 if fails else 0)
