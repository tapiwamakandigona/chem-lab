"""ChemLab peroxide kinetics gate.

Complete control and high-concentration runs, assert automatic 20 s readings,
two graph curves, initial-rate comparison, evidence-based 3/3 conclusion,
guide completion, alternate-condition labels and mobile start controls.
"""
import os
import subprocess
import sys
import time
from pathlib import Path
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
        page.screenshot(path=str(SHOTS) + "/" + name, timeout=SHOT_TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


DIST = Path(DIST)
SHOTS = Path(SHOTS)
PORT = 8797
URL = f"http://127.0.0.1:{PORT}"
SHOTS.mkdir(parents=True, exist_ok=True)

def check(name, ok, detail=""):
    if not ok:
        raise AssertionError(f"FAIL {name}: {detail}")
    print(f"PASS {name}{' ' + str(detail) if detail else ''}", flush=True)

def wait_complete(page, hard_cap_s=600):
    """Wait for the 180 sim-s run to finish, pacing on the SIM clock.

    simClock.js clamps per-frame delta, so under a slow software renderer
    the sim legitimately runs slower than wall time. Fail only on a real
    stall (20 s wall with no sim progress) or the hard cap.
    """
    deadline = time.time() + hard_cap_s
    last, last_progress = -1.0, time.time()
    while time.time() < deadline:
        if "180 s run complete" in page.locator('[data-testid="peroxide-start"]').inner_text():
            return
        try:
            t = float(page.locator('[data-testid="peroxide-time"]').inner_text().split()[0])
        except Exception:  # noqa: BLE001 - display mid-update
            t = last
        if t > last:
            last, last_progress = t, time.time()
        elif time.time() - last_progress > 20:
            raise AssertionError(f"peroxide run stalled: sim clock stuck at {last}s")
        time.sleep(0.3)
    raise AssertionError(f"peroxide run did not complete within {hard_cap_s}s wall")

server = subprocess.Popen(
    [sys.executable, "-m", "http.server", str(PORT), "--directory", str(DIST)],
    stdout=subprocess.DEVNULL,
    stderr=subprocess.STDOUT,
)
time.sleep(0.8)

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.set_default_timeout(TIMEOUT_MS)
        page.goto(URL, wait_until="networkidle")
        page.get_by_text("Catalytic Decomposition Kinetics", exact=True).click()
        page.wait_for_selector('[data-testid="peroxide-start"]')
        check("menu opens kinetics practical", "0 s" in page.locator('[data-testid="peroxide-time"]').inner_text())
        conditions = page.locator('[data-testid="peroxide-conditions"]').inner_text()
        check("control conditions explicit", "5.0 cm³" in conditions and "0.50 mol" in conditions and "0.20 g" in conditions and "22 °C" in conditions)
        check("conclusion locked before curves", page.locator('[data-testid="peroxide-submit"]').is_disabled())

        page.locator('[data-testid="peroxide-start"]').click()
        page.wait_for_function(
            "() => parseInt(document.querySelector('[data-testid=\"peroxide-time\"]')?.textContent) >= 20",
            timeout=TIMEOUT_MS,
        )
        check("first automatic 20 s reading", page.locator('[data-testid="peroxide-reading-count"]').inner_text().startswith("2/"))
        wait_complete(page)
        count = page.locator('[data-testid="peroxide-reading-count"]').inner_text()
        check("control records t=0 plus nine intervals", count == "10/10", count)
        v_control = float(page.locator('[data-testid="peroxide-volume"]').inner_text().split()[0])
        check("control approaches stoichiometric 30 cm3", 28 <= v_control <= 30, v_control)
        check("control curve plotted", page.locator('[data-testid="peroxide-curve-control"]').count() == 1)

        page.locator('[data-testid="peroxide-run-high-conc"]').click()
        conditions = page.locator('[data-testid="peroxide-conditions"]').inner_text()
        check("comparison changes concentration only", "1.00 mol" in conditions and "0.20 g" in conditions and "22 °C" in conditions)
        page.locator('[data-testid="peroxide-start"]').click()
        wait_complete(page)
        check("second curve plotted", page.locator('[data-testid="peroxide-curve-high-conc"]').count() == 1)
        check("two curves present", page.locator('[data-testid^="peroxide-curve-"]').count() == 2)
        v_conc = float(page.locator('[data-testid="peroxide-volume"]').inner_text().split()[0])
        check("double concentration approaches stoichiometric 60 cm3", 59 <= v_conc <= 60, v_conc)
        page.locator('[data-testid="peroxide-reason-surface"]').click()
        check("submit unlocks after two full runs + reason", not page.locator('[data-testid="peroxide-submit"]').is_disabled())
        page.locator('[data-testid="peroxide-submit"]').click()
        result = page.locator('[data-testid="peroxide-result"]')
        check("wrong mechanism loses mark", result.get_attribute("data-score") == "2")
        page.locator('[data-testid="peroxide-reason-collisions"]').click()
        page.locator('[data-testid="peroxide-submit"]').click()
        check("correct comparison scores 3/3", result.get_attribute("data-score") == "3")
        check("result passes", result.get_attribute("data-ok") == "1")
        check("guide finished 5/5", page.locator('[data-testid="guide-step"][data-done="1"]').count() == 5)
        snap(page, "peroxide-marked.png")

        # Alternate configurations remain fair-test presets with clear labels.
        page.locator('[data-testid="peroxide-run-no-catalyst"]').click()
        check("no-catalyst condition explicit", "no catalyst" in page.locator('[data-testid="peroxide-conditions"]').inner_text())
        page.locator('[data-testid="peroxide-run-granules"]').click()
        check("granule surface condition explicit", "granules" in page.locator('[data-testid="peroxide-conditions"]').inner_text())
        page.locator('[data-testid="peroxide-run-warm"]').click()
        check("warm condition explicit", "35 °C" in page.locator('[data-testid="peroxide-conditions"]').inner_text())

        page.set_viewport_size({"width": 390, "height": 844})
        page.goto(URL + "/", wait_until="load")
        page.wait_for_selector('[data-testid="experiment-library"]', timeout=30_000)
        page.get_by_text("Catalytic Decomposition Kinetics", exact=True).click()
        page.locator('[data-testid="peroxide-start"]').scroll_into_view_if_needed()
        page.locator('[data-testid="peroxide-start"]').click()
        check("mobile start control tappable", "Collecting" in page.locator('[data-testid="peroxide-start"]').inner_text())
        snap(page, "peroxide-mobile.png")
        browser.close()
        print("GATE PASS", flush=True)
finally:
    server.terminate()
    try:
        server.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server.kill()
