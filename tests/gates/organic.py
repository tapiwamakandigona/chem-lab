"""F26 gate: organic analysis — functional-group deduction (P3 Q4 style).

Flow: menu card → scene loads → FA 11 (propanal): DNPH orange ppt, Tollens'
silver mirror recorded in observations → wrong class (ketone) rejected 0 →
aldehyde accepted 2/2 → evidence rule: FA 14 alkene answer WITHOUT bromine
test scores 1/2 not ok → after bromine water decolourises → 2/2 → FA 13
acid: Na2CO3 effervescence → guide 5/5 → duplicate test buttons disable →
mobile 390x844: guide starts collapsed, tests tappable. Exit 1 on failure.
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


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    # --- menu card exists, opens the experiment ---
    card = pg.locator("button", has_text="Organic Analysis")
    check("menu shows organic card", card.count() >= 1)
    card.first.click()
    pg.wait_for_selector('[data-testid="organic-submit"]', timeout=30000)
    time.sleep(3)  # scene mount

    # --- default unknown FA 11 (propanal, aldehyde) ---
    check("FA 11 selected by default",
          "border-lab-accent" in (pg.locator('[data-testid="organic-unknown-fa11"]').get_attribute("class") or ""))

    # submit disabled until a class is chosen
    check("submit disabled with no conclusion",
          pg.locator('[data-testid="organic-submit"]').is_disabled())

    # --- run DNPH: orange ppt row appears ---
    pg.locator('[data-testid="organic-test-dnph"]').click()
    time.sleep(0.4)
    rows = pg.locator('[data-testid="organic-obs-row"]')
    check("DNPH observation recorded", rows.count() == 1)
    check("DNPH gives orange ppt for propanal",
          "orange precipitate" in rows.first.inner_text())
    check("DNPH button disables after use",
          pg.locator('[data-testid="organic-test-dnph"]').is_disabled())

    # --- Tollens': silver mirror ---
    pg.locator('[data-testid="organic-test-tollens"]').click()
    time.sleep(0.4)
    check("Tollens observation recorded", rows.count() == 2)
    check("Tollens gives silver mirror for propanal",
          "silver mirror" in rows.nth(1).inner_text())
    snap(pg, "organic-mirror.png")

    # --- wrong class rejected ---
    pg.locator('[data-testid="organic-class"]').select_option("ketone")
    pg.locator('[data-testid="organic-submit"]').click()
    time.sleep(0.3)
    res = pg.locator('[data-testid="organic-result"]')
    check("wrong class scores 0", res.get_attribute("data-score") == "0")
    check("wrong class not ok", res.get_attribute("data-ok") == "0")

    # --- right class accepted 2/2 with evidence ---
    pg.locator('[data-testid="organic-class"]').select_option("aldehyde")
    pg.locator('[data-testid="organic-submit"]').click()
    time.sleep(0.3)
    check("aldehyde scores 2/2", res.get_attribute("data-score") == "2")
    check("aldehyde marked ok", res.get_attribute("data-ok") == "1")
    check("compound named in feedback", "propanal" in res.inner_text())
    snap(pg, "organic-marked.png")

    # --- guide completes ---
    # remaining guide steps: dichromate, bromine+na2co3
    for t in ("dichromate", "bromine", "na2co3"):
        pg.locator(f'[data-testid="organic-test-{t}"]').click()
        time.sleep(0.3)
    # re-submit (running tests clears result)
    pg.locator('[data-testid="organic-submit"]').click()
    time.sleep(0.3)
    steps = pg.locator('[data-testid="guide-step"]')
    if steps.count() == 0:  # coach collapsed? open it
        pill = pg.locator('[data-testid="guide-toggle"]')
        if pill.count():
            pill.click()
            time.sleep(0.3)
        steps = pg.locator('[data-testid="guide-step"]')
    done_steps = sum(
        1 for i in range(steps.count())
        if steps.nth(i).get_attribute("data-done") == "1"
    )
    check("guide 5/5 complete", steps.count() == 5 and done_steps == 5,
          f"{done_steps}/{steps.count()}")

    # --- evidence rule on FA 14 (cyclohexene, alkene) ---
    pg.locator('[data-testid="organic-unknown-fa14"]').click()
    time.sleep(0.3)
    check("switching unknown clears observations", rows.count() == 0)
    pg.locator('[data-testid="organic-test-dnph"]').click()  # unrelated test only
    time.sleep(0.3)
    pg.locator('[data-testid="organic-class"]').select_option("alkene")
    pg.locator('[data-testid="organic-submit"]').click()
    time.sleep(0.3)
    check("alkene without bromine test scores 1/2 (no evidence)",
          res.get_attribute("data-score") == "1" and res.get_attribute("data-ok") == "0")
    pg.locator('[data-testid="organic-test-bromine"]').click()
    time.sleep(0.3)
    check("bromine water decolourises for cyclohexene",
          "decolourises" in pg.locator('[data-testid="organic-obs-row"]').last.inner_text())
    pg.locator('[data-testid="organic-submit"]').click()
    time.sleep(0.3)
    check("alkene with bromine evidence 2/2",
          res.get_attribute("data-score") == "2" and res.get_attribute("data-ok") == "1")

    # --- FA 13 acid: effervescence with Na2CO3 ---
    pg.locator('[data-testid="organic-unknown-fa13"]').click()
    time.sleep(0.3)
    pg.locator('[data-testid="organic-test-na2co3"]').click()
    time.sleep(0.3)
    check("Na2CO3 effervescence for ethanoic acid",
          "effervescence" in pg.locator('[data-testid="organic-obs-row"]').last.inner_text())

    pg.close()

    # --- mobile: guide starts collapsed, tests reachable ---
    m = b.new_page(viewport={"width": 390, "height": 844},
                   has_touch=True, is_mobile=True)
    m.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    m.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    m.locator("button", has_text="Organic Analysis").first.click()
    m.wait_for_selector('[data-testid="organic-submit"]', timeout=30000)
    time.sleep(2)
    check("mobile: guide starts collapsed (pill visible)",
          m.locator('[data-testid="guide-panel"]').count() == 0
          and m.locator('[data-testid="guide-toggle"]').count() == 1)
    m.locator('[data-testid="organic-test-dnph"]').click()
    time.sleep(0.4)
    check("mobile: test tappable, observation recorded",
          m.locator('[data-testid="organic-obs-row"]').count() == 1)
    snap(m, "organic-mobile.png")
    m.close()
    b.close()

httpd.shutdown()
print("GATE " + ("PASS" if not fails else f"FAIL {fails}"), flush=True)
sys.exit(0 if not fails else 1)
