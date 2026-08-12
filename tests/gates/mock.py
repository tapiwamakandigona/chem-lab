"""F18 gate: mock paper with ECF marking (S22 titration).

Two concordant runs (23.85 / 23.85) via the read-the-burette flow, then:
- mock paper opens only after concordance; 5 parts + submit
- all-correct answers -> 6/6
- wrong (b) but carried forward -> b marked x, c/d/e still score (5/6, ecf)
- mean titre outside +-0.05 rejected (relTol=0 on part a)
Exit 1 on any failure.
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


def run_titration(pg, final_reading):
    for _ in range(4):
        pg.locator("button", has_text="5 cm³").click(); time.sleep(0.3)
    for _ in range(3):
        pg.locator("button", has_text="1 cm³").click(); time.sleep(0.25)
    for _ in range(8):
        pg.locator("button", has_text="0.10").click(); time.sleep(0.2)
    pg.locator("button", has_text="0.05").click()
    time.sleep(1.2)
    pg.fill('[data-testid="burette-read-input"]', final_reading)
    pg.click('[data-testid="burette-read-check"]')
    time.sleep(0.8)


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

    check("no mock button before results", pg.locator('[data-testid="mock-open"]').count() == 0)

    run_titration(pg, "23.85")   # run 1
    check("run 1 recorded", "Run 1" in pg.locator("body").inner_text())
    check("still no mock button (need concordance)", pg.locator('[data-testid="mock-open"]').count() == 0)

    run_titration(pg, "47.70")   # run 2 -> titre 23.85, concordant
    body = pg.locator("body").inner_text()
    check("run 2 recorded + concordant mean", "Run 2" in body and "23.85" in body)
    check("mock button appears", pg.locator('[data-testid="mock-open"]').count() == 1)

    pg.click('[data-testid="mock-open"]')
    time.sleep(0.6)
    check("paper opens", pg.locator('[data-testid="mock-paper"]').count() == 1)
    check("5 parts", pg.locator('[data-testid^="mock-input-"]').count() == 5)

    # --- all correct: mean 23.85 -> b,c = 2.6235e-3, d = 0.10494, e = 100.06
    answers = {"a": "23.85", "b": "0.0026235", "c": "0.0026235", "d": "0.10494", "e": "100.06"}
    for k, v in answers.items():
        pg.fill(f'[data-testid="mock-input-{k}"]', v)
    pg.click('[data-testid="mock-submit"]')
    time.sleep(0.5)
    score = pg.locator('[data-testid="mock-score"]').inner_text()
    check("all-correct scores 6/6", score.strip() == "6/6", score)

    # --- ECF path: wrong b, carried through c/d/e
    ecf = {"a": "23.85", "b": "0.0030", "c": "0.0030", "d": "0.120", "e": "87.5"}
    for k, v in ecf.items():
        pg.fill(f'[data-testid="mock-input-{k}"]', v)
    pg.click('[data-testid="mock-submit"]')
    time.sleep(0.5)
    score = pg.locator('[data-testid="mock-score"]').inner_text()
    check("ecf scores 5/6", score.strip() == "5/6", score)
    check("b marked wrong", pg.locator('[data-testid="mock-mark-b"]').get_attribute("data-ok") == "0")
    check("c scores via ecf", pg.locator('[data-testid="mock-mark-c"]').get_attribute("data-ok") == "1"
          and "ecf" in pg.locator('[data-testid="mock-mark-c"]').inner_text())
    check("e scores via ecf", pg.locator('[data-testid="mock-mark-e"]').get_attribute("data-ok") == "1")

    # --- sloppy mean rejected (24.00 is NOT within 0.05 of 23.85)
    pg.fill('[data-testid="mock-input-a"]', "24.00")
    pg.click('[data-testid="mock-submit"]')
    time.sleep(0.5)
    check("sloppy mean rejected", pg.locator('[data-testid="mock-mark-a"]').get_attribute("data-ok") == "0")

    snap(pg, "mock-paper.png")
    b.close()

sys.exit(1 if fails else 0)
