"""F30 gate: simple distillation apparatus, physics and safe technique.

Flow: card -> no-cooling/no-granules preflight scores 0/3 -> reversed cooling
warning -> reset -> lower-inlet water + granules -> heat -> temperature rises
to 100 C -> >=5 cm3 colourless distillate -> 3/3 -> guide 5/5 -> reset ->
no granules creates bumping warning and granules cannot be added while hot ->
mobile first controls tappable. Exit 1 on any failure.
"""
import functools
import http.server
import os
from pathlib import Path
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

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


DIST = os.environ.get("CHEMLAB_DIST", DIST)
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
os.makedirs(SHOTS, exist_ok=True)

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


def number(text):
    return float(text.split()[0])


def wait_volume(pg, minimum, timeout_s=600):
    """simClock.js clamps sim deltas, so a slow renderer stretches the run
    arbitrarily in wall time — generous cap with a temperature/volume stall
    guard instead of a tight wall deadline (CI 2026-08-12: 90 s collected 0)."""
    t0 = time.time()
    last_sig, last_progress = None, time.time()
    while time.time() - t0 < timeout_s:
        v = number(pg.locator('[data-testid="distill-volume"]').inner_text())
        if v >= minimum:
            return v
        sig = (v, number(pg.locator('[data-testid="distill-temp"]').inner_text()))
        if sig != last_sig:
            last_sig, last_progress = sig, time.time()
        elif time.time() - last_progress > 20:
            break  # sim stalled; caller's checks report precisely
        time.sleep(0.5)
    return number(pg.locator('[data-testid="distill-volume"]').inner_text())


with sync_playwright() as p:
    b = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    card = pg.locator("button", has_text="Simple Distillation")
    check("menu shows distillation card", card.count() >= 1)
    card.first.click()
    pg.wait_for_selector('[data-testid="distill-cooling-lower"]', timeout=30000)
    time.sleep(3)

    check("initial vapour 22 C", abs(number(pg.locator('[data-testid="distill-temp"]').inner_text()) - 22) < 0.1)
    check("initial distillate zero", number(pg.locator('[data-testid="distill-volume"]').inner_text()) == 0)
    check("record disabled before distillate", pg.locator('[data-testid="distill-record"]').is_disabled())
    pg.locator('[data-testid="distill-submit"]').click()
    res = pg.locator('[data-testid="distill-result"]')
    check("preflight scores 0/3", res.get_attribute("data-score") == "0" and res.get_attribute("data-ok") == "0")

    # Reversed condenser direction is allowed as a diagnostic, but warned.
    pg.locator('[data-testid="distill-cooling-upper"]').click()
    check("reversed-flow warning shown", "air pockets" in pg.locator("body").inner_text())

    # Correct technique.
    pg.locator('[data-testid="distill-reset"]').click()
    pg.locator('[data-testid="distill-cooling-lower"]').click()
    pg.locator('[data-testid="distill-granules"]').click()
    check("granules marked added", "Anti-bumping granules added" in pg.locator('[data-testid="distill-granules"]').inner_text())
    pg.locator('[data-testid="distill-heat"]').click()
    # temp rises per clamped SIM frame — poll instead of one fixed sleep
    t0 = time.time()
    temp_now = number(pg.locator('[data-testid="distill-temp"]').inner_text())
    while temp_now <= 22 and time.time() - t0 < 60:
        time.sleep(0.5)
        temp_now = number(pg.locator('[data-testid="distill-temp"]').inner_text())
    check("temperature starts rising", temp_now > 22, str(temp_now))
    check("cooling controls lock while hot", pg.locator('[data-testid="distill-cooling-upper"]').is_disabled())
    v = wait_volume(pg, 5.0)
    temp = number(pg.locator('[data-testid="distill-temp"]').inner_text())
    check("vapour plateau is 100 C", 99.9 <= temp <= 100.1, str(temp))
    check("at least 5 cm3 collected", v >= 5, str(v))
    pg.locator('[data-testid="distill-record"]').click()
    row = pg.locator('[data-testid="distill-obs-row"]')
    check("observation recorded", row.count() == 1)
    check("distillate recorded colourless", "colourless" in row.inner_text())
    pg.locator('[data-testid="distill-submit"]').click()
    check("correct technique scores 3/3", res.get_attribute("data-score") == "3" and res.get_attribute("data-ok") == "1")
    snap(pg, "distill-correct.png")

    steps = pg.locator('[data-testid="guide-step"]')
    if steps.count() == 0:
        pg.locator('[data-testid="guide-toggle"]').click()
        time.sleep(0.2)
        steps = pg.locator('[data-testid="guide-step"]')
    done_steps = sum(
        1 for i in range(steps.count())
        if steps.nth(i).get_attribute("data-done") == "1"
    )
    check("guide finished 5/5", steps.count() == 5 and done_steps == 5, f"{done_steps}/{steps.count()}")

    # Safety defect path: no granules -> bumping near boiling. Controls must
    # not offer adding granules to hot liquid.
    pg.locator('[data-testid="distill-reset"]').click()
    pg.locator('[data-testid="distill-cooling-lower"]').click()
    pg.locator('[data-testid="distill-heat"]').click()
    # bumping appears near boiling — sim-paced, so guard on temp progress
    t0 = time.time()
    last_temp, last_progress = -1.0, time.time()
    while time.time() - t0 < 300 and pg.locator('[data-testid="distill-bumping"]').count() == 0:
        cur = number(pg.locator('[data-testid="distill-temp"]').inner_text())
        if cur > last_temp:
            last_temp, last_progress = cur, time.time()
        elif time.time() - last_progress > 20:
            break  # sim stalled; check below reports
        time.sleep(0.5)
    check("missing granules produces bumping warning", pg.locator('[data-testid="distill-bumping"]').count() == 1)
    check("cannot add granules while heating", pg.locator('[data-testid="distill-granules"]').is_disabled())
    snap(pg, "distill-bumping.png")

    # Keep only one WebGL canvas alive at a time. Two SwiftShader pages can
    # starve the newly opened phone page on Actions before React mounts.
    pg.close()

    # Mobile first actions reachable.
    pg2 = b.new_page(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    )
    pg2.set_default_timeout(TIMEOUT_MS)  # secondary page: same CI-aware budget as pg
    pg2.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg2.locator("button", has_text="Simple Distillation").first.click()
    pg2.wait_for_selector('[data-testid="distill-cooling-lower"]', timeout=30000)
    time.sleep(2)
    pg2.locator('[data-testid="distill-cooling-lower"]').click()
    pg2.locator('[data-testid="distill-granules"]').click()
    check("mobile setup controls tappable", "Anti-bumping granules added" in pg2.locator('[data-testid="distill-granules"]').inner_text())
    snap(pg2, "distill-mobile.png")
    b.close()

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"))
sys.exit(1 if fails else 0)
