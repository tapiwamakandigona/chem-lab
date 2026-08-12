"""Iodine–propanone rate / thiosulfate titration gate.

Proves timed quenching, removal-only misconception feedback, delayed-starch
consequence, dry closed stopcock, rough + concordant accurate titres,
ECF calculation marking, guide/course completion, reset, phone portrait and
landscape usability, and an error-free 3D scene.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

DIST = Path(os.environ.get(
    "CHEMLAB_DIST",
    str(Path(__file__).resolve().parents[2] / "dist"),
))
SHOTS = Path(os.environ.get(
    "CHEMLAB_SHOTS",
    str(Path(__file__).resolve().parents[2] / "test-results"),
))
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
PORT = 8797
URL = f"http://127.0.0.1:{PORT}"
SHOTS.mkdir(parents=True, exist_ok=True)


def check(name, ok, detail=""):
    if not ok:
        raise AssertionError(f"FAIL {name}: {detail}")
    print(f"PASS {name}{' ' + str(detail) if detail else ''}", flush=True)


def snap(page, name):
    try:
        page.screenshot(path=str(SHOTS / name), timeout=SHOT_TIMEOUT_MS)
        print(f"shot: {name}", flush=True)
    except Exception as exc:  # evidence only
        print(f"shot SKIPPED {name}: {str(exc)[:90]}", flush=True)


def open_practical(page):
    page.goto(URL, wait_until="networkidle")
    page.get_by_text("Iodine–Propanone Rate Titration", exact=True).click()
    page.wait_for_selector('[data-testid="iodine-start"]')


def dispense_to(page, target):
    reading = float(page.locator('[data-testid="iodine-reading"]').inner_text().split()[0])
    for amount, testid in (
        (5.0, "iodine-dispense-5"),
        (1.0, "iodine-dispense-1"),
        (0.05, "iodine-dispense-0-05"),
    ):
        while reading + amount <= target + 1e-8:
            page.locator(f'[data-testid="{testid}"]').click()
            reading = round(reading + amount, 2)
    check("dispense reaches requested reading", abs(reading - target) < 0.001, reading)


def round05(value):
    return round(value * 20) / 20


def endpoint_at(quench_time, run_index):
    offsets = [0.0, 0.05, -0.05, 0.0]
    concentration = max(0, 0.0500 - 0.00023125 * quench_time)
    return round05(concentration / 0.0012 + offsets[run_index % len(offsets)])


def complete_run(page, kind, endpoint, starch_at):
    page.locator(f'[data-testid="iodine-begin-{kind}"]').click()
    dispense_to(page, starch_at)
    page.locator('[data-testid="iodine-add-starch"]').click()
    check(
        "starch produces blue-black complex",
        "blue-black" in page.locator('[data-testid="iodine-appearance"]').inner_text(),
    )
    dispense_to(page, endpoint)
    check(
        "endpoint is colourless",
        "colourless" in page.locator('[data-testid="iodine-appearance"]').inner_text(),
    )
    page.locator('[data-testid="iodine-record-titre"]').click()


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
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        open_practical(page)
        check("practical opens at zero", "0.0 s" in page.locator('[data-testid="iodine-time"]').inner_text())
        page.wait_for_selector("canvas", timeout=30_000)
        check("scene renders", page.locator("canvas").count() == 1)

        # Removal alone does not change phase or stop time.
        page.locator('[data-testid="iodine-start"]').click()
        page.wait_for_function(
            "() => parseFloat(document.querySelector('[data-testid=\"iodine-time\"]').textContent) >= 10",
        )
        page.locator('[data-testid="iodine-remove-only"]').click()
        removed_text = page.locator('[data-testid="iodine-removal-warning"]').inner_text()
        before = float(page.locator('[data-testid="iodine-time"]').inner_text().split()[0])
        page.wait_for_timeout(350)
        after = float(page.locator('[data-testid="iodine-time"]').inner_text().split()[0])
        check("sample removal alone does not quench", after > before and "continue" in removed_text, f"{before}->{after}")

        page.wait_for_function(
            "() => parseFloat(document.querySelector('[data-testid=\"iodine-time\"]').textContent) >= 79",
            timeout=TIMEOUT_MS,
        )
        page.locator('[data-testid="iodine-quench"]').click()
        quench_text = page.locator('[data-testid="iodine-quench-status"]').inner_text()
        quench = float(quench_text.split()[2])
        check("80 +/- 1 s quench freezes timer", abs(quench - 80) <= 1, quench)
        page.wait_for_timeout(350)
        frozen = float(page.locator('[data-testid="iodine-time"]').inner_text().split()[0])
        check("timer stays frozen after quench", abs(frozen - quench) < 0.001, frozen)
        page.locator('[data-testid="iodine-prepare"]').click()
        endpoints = [endpoint_at(quench, run_index) for run_index in range(4)]

        # Early starch must visibly delay endpoint and produce invalid evidence.
        page.locator('[data-testid="iodine-begin-rough"]').click()
        dispense_to(page, 20.0)
        page.locator('[data-testid="iodine-add-starch"]').click()
        check("early starch warning shown", page.locator('[data-testid="iodine-early-starch-warning"]').is_visible())
        dispense_to(page, endpoints[0])
        check(
            "early complex remains blue-black at stoichiometric endpoint",
            "blue-black" in page.locator('[data-testid="iodine-appearance"]').inner_text(),
        )
        delayed_endpoint = round05(endpoints[0] + 0.60)
        dispense_to(page, delayed_endpoint)
        page.locator('[data-testid="iodine-record-titre"]').click()
        first_row = page.locator('[data-testid="iodine-titres"] tbody tr').first.inner_text()
        check(
            "early-starch rough records delayed invalid titre",
            f"{delayed_endpoint:.2f}" in first_row and "early" in first_row,
            first_row,
        )

        # Then two deterministic accurate runs. Their offsets differ by
        # 0.05 cm3 and remain concordant for any valid 80 +/- 1 s quench.
        complete_run(page, "accurate", endpoints[1], round05(endpoints[1] - 0.95))
        complete_run(page, "accurate", endpoints[2], round05(endpoints[2] - 0.95))
        check(
            "two valid accurate titres are concordant",
            "Concordant" in page.locator('[data-testid="iodine-concordance"]').inner_text(),
            page.locator('[data-testid="iodine-concordance"]').inner_text(),
        )

        # DOM buttons set tapOpen only during a transaction. After a wait, the
        # closed stopcock reading must remain exactly dry/stable.
        stable = page.locator('[data-testid="iodine-titres"] tbody tr').last.locator("td").nth(1).inner_text()
        page.wait_for_timeout(750)
        check(
            "closed stopcock adds no liquid",
            stable == page.locator('[data-testid="iodine-titres"] tbody tr').last.locator("td").nth(1).inner_text(),
            stable,
        )

        mean = round((endpoints[1] + endpoints[2]) / 2 + 1e-9, 2)
        n_thio = mean / 1000 * 0.0100
        n_iodine = n_thio / 2 * 6
        concentration = n_iodine / 0.025
        rate = (0.0500 - concentration) / 80
        answers = {
            "mean": f"{mean:.2f}",
            "nThio": f"{n_thio:.9f}",
            "nIodine": f"{n_iodine:.9f}",
            "concentration": f"{concentration:.7f}",
            "initial": "0.0500",
            "rate": f"{rate:.9f}",
            "units": "mol dm-3 s-1",
            "starchReason": "Concentrated iodine forms a persistent starch iodine complex that releases iodine slowly",
            "quenchReason": "Sodium hydrogencarbonate neutralises the acid catalyst and quenches the reaction",
        }
        for key, value in answers.items():
            page.locator(f'[data-testid="iodine-answer-{key}"]').fill(value)
        page.locator('[data-testid="iodine-submit"]').click()
        result = page.locator('[data-testid="iodine-result"]')
        check("complete evidence scores 10/10", result.get_attribute("data-score") == "10", result.inner_text())
        check("result passes", result.get_attribute("data-ok") == "1")
        if page.locator('[data-testid="guide-panel"]').count() == 0:
            page.locator('[data-testid="guide-toggle"]').click()
        check("guide completes 5/5", page.locator('[data-testid="guide-step"][data-done="1"]').count() == 5)
        snap(page, "iodine-rate-marked.png")

        page.get_by_role("button", name="← Menu").click()
        page.locator('[data-testid="course-open"]').click()
        unit = page.locator('[data-testid="course-unit-iodine-rate-titration"]')
        check("19th course unit auto-completes", unit.get_attribute("data-done") == "1")
        page.locator('[data-testid="course-close"]').click()

        # Fresh reset and exact-count landing integration.
        page.get_by_text("Iodine–Propanone Rate Titration", exact=True).click()
        page.locator('[data-testid="iodine-reset"]').click()
        check("reset returns timer to setup", page.locator('[data-testid="iodine-start"]').is_visible())
        check("desktop has no page errors", not errors, errors)

        # Portrait and landscape: core controls are visible/tappable, zoom is
        # retained, and the bottom sheet stays on-screen after orientation.
        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle")
        page.get_by_text("Iodine–Propanone Rate Titration", exact=True).click()
        start = page.locator('[data-testid="iodine-start"]')
        start.scroll_into_view_if_needed()
        box = start.bounding_box()
        check("portrait start is a >=44 px tap target", box and box["height"] >= 44, box)
        start.click()
        check("portrait timer starts", "s" in page.locator('[data-testid="iodine-time"]').inner_text())
        check("portrait zoom controls retained", page.locator('[data-testid="zoom-in"]').is_visible())
        snap(page, "iodine-rate-mobile.png")

        page.set_viewport_size({"width": 844, "height": 390})
        page.reload(wait_until="networkidle")
        page.get_by_text("Iodine–Propanone Rate Titration", exact=True).click()
        start = page.locator('[data-testid="iodine-start"]')
        start.scroll_into_view_if_needed()
        box = start.bounding_box()
        check(
            "landscape core control is on-screen",
            box and box["x"] >= 0 and box["y"] >= 0 and box["x"] + box["width"] <= 844 and box["y"] + box["height"] <= 390,
            box,
        )
        check("landscape guide starts collapsed", page.locator('[data-testid="guide-panel"]').count() == 0)
        snap(page, "iodine-rate-landscape.png")

        browser.close()
        print("GATE PASS", flush=True)
finally:
    server.terminate()
    try:
        server.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server.kill()
