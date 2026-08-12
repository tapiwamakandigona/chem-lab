"""F28 gate: paper chromatography — Rf identification of a food-dye unknown.

Flow: menu card → scene loads → FB 21 (E110+E122) default: submit disabled
with no dyes picked → premature identification (before developing) scores
1 max and flags missing evidence → start development → progress bar →
complete shows readings 2.8 / 4.0 cm vs 8.0 cm front → wrong Rf rejected
(dyes right, rf wrong → 1/2 not-ok) → correct Rf 0.35 / 0.50 → 2/2 ok →
switch unknown resets → FB 20 readings 1.4 / 5.4 cm → guide 5/5 → mobile
390x844 start tappable. Exit 1 on any failure.
"""
import functools
import http.server
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
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + detail if detail else ""), flush=True)
    if not cond:
        fails.append(name)


def wait_complete(pg, timeout_s=90):
    """Development is ~14 s of sim animation; SwiftShader may stretch it."""
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        if pg.locator('[data-testid="chroma-readings"]').count() > 0:
            return True
        time.sleep(1.0)
    return False


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    card = pg.locator("button", has_text="Paper Chromatography")
    check("menu shows chroma card", card.count() >= 1)
    card.first.click()
    pg.wait_for_selector('[data-testid="chroma-start"]', timeout=30000)
    time.sleep(3)

    check("FB 21 selected by default",
          "border-lab-accent" in (pg.locator('[data-testid="chroma-unknown-fb21"]').get_attribute("class") or ""))
    check("submit disabled with no dyes",
          pg.locator('[data-testid="chroma-submit"]').is_disabled())

    # --- premature identification: right dyes, no chromatogram ---
    pg.locator('[data-testid="chroma-dye-E110"]').click()
    pg.locator('[data-testid="chroma-dye-E122"]').click()
    pg.locator('[data-testid="chroma-submit"]').click()
    time.sleep(0.3)
    res = pg.locator('[data-testid="chroma-result"]')
    check("undeveloped scores at most 1 and not ok",
          res.get_attribute("data-ok") == "0" and res.get_attribute("data-score") in ("0", "1"))
    check("undeveloped flags missing evidence", "Develop the chromatogram" in res.inner_text())

    # --- develop ---
    pg.locator('[data-testid="chroma-start"]').click()
    time.sleep(1.5)
    body = pg.locator("body").inner_text()
    check("development running", "Solvent rising" in body or "ready to measure" in body)
    check("chromatogram completes", wait_complete(pg))
    snap(pg, "chroma-complete.png")

    d0 = pg.locator('[data-testid="chroma-dist-0"]').inner_text()
    d1 = pg.locator('[data-testid="chroma-dist-1"]').inner_text()
    check("FB 21 spot distances 2.8 / 4.0 cm", "2.8" in d0 and "4.0" in d1, f"{d0} {d1}")
    check("front distance shown", "8.0 cm" in pg.locator('[data-testid="chroma-readings"]').inner_text())

    # --- wrong Rf rejected: dyes right, rf nonsense -> 1/2 not ok ---
    pg.locator('[data-testid="chroma-rf-0"]').fill("0.9")
    pg.locator('[data-testid="chroma-rf-1"]').fill("0.9")
    pg.locator('[data-testid="chroma-submit"]').click()
    time.sleep(0.3)
    check("wrong Rf scores 1/2 not ok",
          res.get_attribute("data-score") == "1" and res.get_attribute("data-ok") == "0")

    # --- correct Rf -> 2/2 ---
    pg.locator('[data-testid="chroma-rf-0"]').fill("0.35")
    pg.locator('[data-testid="chroma-rf-1"]').fill("0.50")
    pg.locator('[data-testid="chroma-submit"]').click()
    time.sleep(0.3)
    check("correct identification scores 2/2 ok",
          res.get_attribute("data-score") == "2" and res.get_attribute("data-ok") == "1")
    check("names both dyes", "sunset yellow + carmoisine" in res.inner_text())

    # --- guide completes ---
    steps = pg.locator('[data-testid="guide-step"]')
    if steps.count() == 0:  # panel collapsed — reopen via pill
        pg.locator('[data-testid="guide-toggle"]').click()
        time.sleep(0.3)
        steps = pg.locator('[data-testid="guide-step"]')
    done_steps = sum(1 for i in range(steps.count())
                     if steps.nth(i).get_attribute("data-done") == "1")
    check("guide finished 5/5", steps.count() == 5 and done_steps == 5,
          f"{done_steps}/{steps.count()}")

    # --- switching unknown resets to setup, FB 20 distances differ ---
    pg.locator('[data-testid="chroma-unknown-fb20"]').click()
    time.sleep(0.3)
    check("switch unknown resets", pg.locator('[data-testid="chroma-start"]').count() == 1)
    pg.locator('[data-testid="chroma-start"]').click()
    check("second run completes", wait_complete(pg))
    d0 = pg.locator('[data-testid="chroma-dist-0"]').inner_text()
    d1 = pg.locator('[data-testid="chroma-dist-1"]').inner_text()
    check("FB 20 spot distances 1.4 / 5.4 cm", "1.4" in d0 and "5.4" in d1, f"{d0} {d1}")

    # --- mobile: start button tappable, panel reachable ---
    pg2 = b.new_page(viewport={"width": 390, "height": 844},
                     user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")
    pg2.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg2.locator("button", has_text="Paper Chromatography").first.click()
    pg2.wait_for_selector('[data-testid="chroma-start"]', timeout=30000)
    time.sleep(2)
    pg2.locator('[data-testid="chroma-start"]').click()
    time.sleep(1.0)
    check("mobile development starts", "Solvent rising" in pg2.locator("body").inner_text()
          or pg2.locator('[data-testid="chroma-readings"]').count() > 0)
    snap(pg2, "chroma-mobile.png")

    b.close()

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"))
sys.exit(1 if fails else 0)
