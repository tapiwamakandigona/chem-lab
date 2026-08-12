"""Gate: F14 rate graph in clock calc sheet.

Runs two real clock experiments (0.100 and 0.080 M), records both, opens
Show Calculations, and asserts the SVG rate graph: 2 plotted points, a
best-fit line through the origin, and gradient ~= 250 (t = 4.0/[S2O3] s
=> 1000/t = 250*conc). Exit 0 on pass.
"""
import functools
import http.server
import re
import socketserver
import sys
import threading
import time

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
URL = f"http://127.0.0.1:{PORT}/"
_h = functools.partial(http.server.SimpleHTTPRequestHandler,
                       directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
_httpd = socketserver.TCPServer(("", PORT), _h)
threading.Thread(target=_httpd.serve_forever, daemon=True).start()
SHOT = SHOTS + "/graph-calc.png"


def run_one(page, conc_label, expect_secs, hard_cap_s=600):
    """Wait for the run to auto-stop, pacing on the SIMULATED clock.

    The sim clock clamps per-frame delta (src/lib/simClock.js), so under a
    slow software renderer the sim legitimately runs slower than wall time.
    Waiting on a fixed wall deadline would fail a correct product; instead
    keep waiting while the displayed sim timer advances, and fail only on a
    genuine stall (20 s wall with no sim progress) or an absurd hard cap.
    The recorded time itself is still asserted against the chemistry model.
    """
    page.get_by_role("button", name=conc_label, exact=True).click()
    page.get_by_role("button", name=re.compile("Mix & start")).click()
    deadline = time.time() + hard_cap_s
    last_sim, last_progress = -1.0, time.time()
    while time.time() < deadline:
        btn = page.get_by_role("button", name=re.compile(r"Record [\d.]+ s"))
        if btn.count() > 0:
            label = btn.first.inner_text()
            secs = float(re.search(r"([\d.]+)\s*s", label).group(1))
            btn.first.click()
            return secs
        try:
            sim = float(page.locator('[data-testid="clock-time"]').inner_text().split("s")[0])
        except Exception:  # noqa: BLE001 — display mid-update
            sim = last_sim
        if sim > last_sim:
            last_sim, last_progress = sim, time.time()
        elif time.time() - last_progress > 20:
            raise AssertionError(
                f"run at {conc_label} stalled: sim clock stuck at {last_sim}s for 20s wall")
        time.sleep(0.25)
    raise AssertionError(f"run at {conc_label} did not complete in {hard_cap_s}s")


def main():
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.set_default_timeout(TIMEOUT_MS)
        page.route(re.compile(r".*"), lambda route, req:
                   route.continue_() if "127.0.0.1" in req.url else route.abort())
        page.goto(URL)
        page.get_by_text("Iodine Clock", exact=False).first.click()
        page.wait_for_timeout(1500)

        t1 = run_one(page, "0.100", 40.0)
        checks.append(("run1 time ~40s", abs(t1 - 40.0) <= 2.0, f"{t1}"))
        t2 = run_one(page, "0.080", 50.0)
        checks.append(("run2 time ~50s", abs(t2 - 50.0) <= 2.5, f"{t2}"))

        page.get_by_role("button", name=re.compile("Show Calculations")).click()
        page.wait_for_selector("[data-testid=rate-graph]", timeout=5000)

        n_pts = page.locator("[data-testid=rate-point]").count()
        checks.append(("2 plotted points", n_pts == 2, f"{n_pts}"))

        fit = page.locator("[data-testid=rate-fit]")
        checks.append(("fit line present", fit.count() == 1, f"{fit.count()}"))

        grad_txt = page.locator("[data-testid=rate-gradient]").inner_text()
        mval = float(re.search(r"gradient = ([\d.]+)", grad_txt).group(1))
        checks.append(("gradient ~250", 240.0 <= mval <= 260.0, f"{mval}"))

        # fit line passes through the plotted origin (x1,y1 == scaled 0,0)
        x1 = float(fit.get_attribute("x1"))
        y1 = float(fit.get_attribute("y1"))
        # origin in SVG coords: x=M.l=44, y=M.t+PH=240-40=200 (from RateGraph constants)
        checks.append(("fit through origin", abs(x1 - 44) < 0.5 and abs(y1 - 200) < 0.5,
                       f"({x1},{y1})"))

        snap(page, os.path.basename(SHOT))
        browser.close()

    ok = True
    for name, passed, detail in checks:
        print(f"{'PASS' if passed else 'FAIL'} {name}: {detail}")
        ok = ok and passed
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
