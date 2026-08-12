"""ChemLab solubility-curve gate.

Flow: open SC2 → heat to a clear solution → cool slowly to first crystals →
record the temperature → calculate 50.0 g KNO3 / 100 g H2O → score 3/3.
Also checks premature recording, crash-cooling feedback, graph point,
guide completion, reset and 390x844 mobile controls.
"""
import os
import subprocess
import time
from pathlib import Path
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


ROOT = Path(os.environ.get("DIST", DIST))
SHOTS = Path(os.environ.get("SHOTS", "/work/build/chemlab/shots"))
PORT = int(os.environ.get("PORT", "8797"))
URL = f"http://127.0.0.1:{PORT}"
SHOTS.mkdir(parents=True, exist_ok=True)

def check(name, ok, detail=""):
    if not ok:
        raise AssertionError(f"FAIL {name}: {detail}")
    print(f"PASS {name}{' ' + str(detail) if detail else ''}", flush=True)

server = subprocess.Popen(
    ["python3", "-m", "http.server", str(PORT), "--directory", str(ROOT)],
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
        page.goto(URL, wait_until="networkidle")
        page.get_by_text("Solubility & Crystallisation", exact=True).click()
        page.wait_for_selector('[data-testid="solubility-temp"]')
        check("menu shows solubility practical", "22.0" in page.locator('[data-testid="solubility-temp"]').inner_text())
        check("SC2 default is 10 g in 20 g water", "10.0 g KNO" in page.locator("body").inner_text())

        record = page.locator('[data-testid="solubility-record"]')
        check("cannot record before first crystals", record.is_disabled())

        # Submit the right arithmetic before doing the experiment: calculation
        # mark only, proving evidence cannot be guessed.
        page.locator('[data-testid="solubility-answer"]').fill("50.0")
        page.locator('[data-testid="solubility-submit"]').click()
        result = page.locator('[data-testid="solubility-result"]')
        check("answer alone earns 1/3", result.get_attribute("data-score") == "1")

        page.locator('[data-testid="solubility-heat"]').click()
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"solubility-appearance\"]')?.textContent.includes('clear solution')",
            timeout=25_000,
        )
        temp_clear = page.locator('[data-testid="solubility-temp"]').inner_text()
        check("heating produces clear solution", "clear solution" in page.locator('[data-testid="solubility-appearance"]').inner_text(), temp_clear)
        check("guide records dissolution", page.locator('[data-testid="guide-step"][data-done="1"]').count() >= 2)

        # A learner can explore crash cooling, gets honest quality feedback,
        # then switch back to slow cooling before collecting evidence.
        page.locator('[data-testid="solubility-cool-fast"]').click()
        check("crash-cooling warning shown", page.locator('[data-testid="solubility-rushing"]').is_visible())
        page.wait_for_timeout(250)
        page.locator('[data-testid="solubility-cool-fast"]').click()
        page.locator('[data-testid="solubility-cool-slow"]').click()
        page.locator('[data-testid="solubility-nucleate"]').click()
        check("nucleation action works", "seeded" in page.locator('[data-testid="solubility-nucleate"]').inner_text())

        page.wait_for_function(
            "() => !document.querySelector('[data-testid=\"solubility-record\"]')?.disabled",
            timeout=25_000,
        )
        first_temp = float(page.locator('[data-testid="solubility-temp"]').inner_text().split()[0])
        check("SC2 first crystals near 31.4 C", 29.0 <= first_temp <= 32.0, first_temp)
        check("appearance identifies first crystals", "first crystals" in page.locator('[data-testid="solubility-appearance"]').inner_text())
        page.locator('[data-testid="solubility-record"]').click()
        check("observation row recorded", page.locator('[data-testid="solubility-obs-row"]').count() == 1)
        check("graph plots measured cross", page.locator('[data-testid="solubility-point"]').count() == 1)

        page.locator('[data-testid="solubility-submit"]').click()
        check("complete investigation scores 3/3", result.get_attribute("data-score") == "3")
        check("result passes", result.get_attribute("data-ok") == "1")
        check("guide finished 5/5", page.locator('[data-testid="guide-step"][data-done="1"]').count() == 5)
        page.screenshot(path=str(SHOTS / "solubility-marked.png"), full_page=True)
        print("shot: solubility-marked.png", flush=True)

        # A second assigned mass persists alongside the first, building a real
        # multi-point curve rather than replacing prior data.
        page.locator('[data-testid="solubility-run-sc3"]').click()
        check("new run resets apparatus to 22 C", "22.0" in page.locator('[data-testid="solubility-temp"]').inner_text())
        check("prior curve point persists", page.locator('[data-testid="solubility-point"]').count() == 1)
        page.locator('[data-testid="solubility-heat"]').click()
        page.wait_for_function(
            "() => document.querySelector('[data-testid=\"solubility-appearance\"]')?.textContent.includes('clear solution')",
            timeout=25_000,
        )
        page.locator('[data-testid="solubility-cool-slow"]').click()
        page.wait_for_function(
            "() => !document.querySelector('[data-testid=\"solubility-record\"]')?.disabled",
            timeout=25_000,
        )
        page.locator('[data-testid="solubility-record"]').click()
        check("second curve point added", page.locator('[data-testid="solubility-point"]').count() == 2)

        # Mobile: reset current run, then ensure the core control is tappable.
        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle")
        page.get_by_text("Solubility & Crystallisation", exact=True).click()
        page.wait_for_selector('[data-testid="solubility-heat"]')
        page.locator('[data-testid="solubility-heat"]').scroll_into_view_if_needed()
        page.locator('[data-testid="solubility-heat"]').click()
        check("mobile heating control tappable", "Stop heating" in page.locator('[data-testid="solubility-heat"]').inner_text())
        page.screenshot(path=str(SHOTS / "solubility-mobile.png"), full_page=True)
        print("shot: solubility-mobile.png", flush=True)
        browser.close()
        print("GATE PASS", flush=True)
finally:
    server.terminate()
    try:
        server.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server.kill()
