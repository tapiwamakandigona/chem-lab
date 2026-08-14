"""Gate: test mode — work solo, mistakes allowed, marked at hand-in.

Titration desktop: Test mode chip present; entering hides the guide coach
AND the meniscus-practice aid; handing in with no work scores 0/6 and every
miss carries a correction line; doing real work (dispense to endpoint +
record a titre) raises the score at a second hand-in. No answer oracle
mid-test: a WRONG burette reading is accepted silently (no ✗ feedback, no
reveal button) and surfaces only as an examiner's note in the report.
Results persist to chemlab-test-results-v1; exiting restores the guide and
the practice aid. Flame: chip present too (HUD is shared across practicals);
submit verb flips Check identification -> Record answer and back. Enthalpy:
MockPaper (worked marking = indirect oracle) unreachable in test mode,
restored in practice; the always-on Live Calculations panel and Show
Calculations button (derived answers) are practice-only too. Clock: the
auto-computed 1000/t rate column blanks to em-dash in test mode and the
worked-analysis sheet is unreachable; both restore on exit.
Mobile 390x844: chip and Hand in are tappable, report scrolls and closes.
Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, json, time, sys

import os
from pathlib import Path
DIST = os.environ.get("CHEMLAB_DIST", str(Path(__file__).resolve().parents[2] / "dist"))
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
os.makedirs(SHOTS, exist_ok=True)

TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))
SHOT_TIMEOUT_MS = int(os.environ.get("CHEMLAB_SHOT_TIMEOUT_MS", str(TIMEOUT_MS)))

from playwright.sync_api import sync_playwright

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
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=SHOT_TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


PORT = 8797
h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

fails = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ((" — " + str(detail)) if detail and not ok else ""), flush=True)
    if not ok:
        fails.append(name)


def dismiss_first_run(pg):
    """The one-time titration coach must not shadow test-mode interactions."""
    pg.evaluate("localStorage.setItem('chemlab-titration-coach-v1', 'seen')")


with sync_playwright() as p:
    browser = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader"])

    # ---------- desktop: full loop on titration ----------
    pg = browser.new_page(viewport={"width": 1280, "height": 800})
    pg.goto(f"http://localhost:{PORT}/practical/titration", wait_until="load", timeout=TIMEOUT_MS)
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    dismiss_first_run(pg)
    pg.reload(wait_until="load")
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    check("practice mode shows guide coach", pg.locator('[data-testid="guide-panel"], [data-testid="guide-toggle"]').count() >= 1)

    check("practice mode offers meniscus practice",
          pg.locator('[data-testid="meniscus-toggle"]').count() >= 1)

    pg.click('[data-testid="test-mode-toggle"]')
    pg.wait_for_selector('[data-testid="test-hand-in"]', timeout=TIMEOUT_MS)
    check("test mode hides guide coach",
          pg.locator('[data-testid="guide-panel"]').count() == 0
          and pg.locator('[data-testid="guide-toggle"]').count() == 0)
    check("test mode hides meniscus practice aid",
          pg.locator('[data-testid="meniscus-toggle"]').count() == 0
          and pg.locator('[data-testid="meniscus-toggle-mobile"]').count() == 0)

    # hand in with zero work — everything wrong is allowed and marked
    pg.click('[data-testid="test-hand-in"]')
    pg.wait_for_selector('[data-testid="test-report"]', timeout=TIMEOUT_MS)
    score = pg.locator('[data-testid="test-report-score"]').inner_text()
    check("no-work hand-in scores 0/6", score.strip() == "0/6", score)
    items = pg.locator('[data-testid="test-report-item"]')
    check("report lists all 6 criteria", items.count() == 6, items.count())
    misses = pg.locator('[data-testid="test-report-item"][data-done="0"]')
    check("every miss carries a correction",
          misses.count() == 6
          and all("—" not in ("",) and len(t.strip()) > 40 for t in misses.all_inner_texts()),
          misses.count())
    snap(pg, "testmode-report-zero.png")

    stored = pg.evaluate("localStorage.getItem('chemlab-test-results-v1')")
    parsed = json.loads(stored) if stored else {}
    check("result persisted", parsed.get("titration", {}).get("lastScore") == 0
          and parsed.get("titration", {}).get("total") == 6, stored)

    pg.click('[data-testid="test-report-close"]')
    check("keep-testing closes report and stays in test mode",
          pg.locator('[data-testid="test-report"]').count() == 0
          and pg.locator('[data-testid="test-hand-in"]').count() == 1)

    # do real work: dispense to the endpoint (s22: 23.85), then pass the
    # read-check so the titre records — same recipe titrate.py proves.
    for _ in range(4):
        pg.locator("button", has_text="5 cm³").click()
        pg.wait_for_timeout(400)
    for _ in range(3):
        pg.locator("button", has_text="1 cm³").click()
        pg.wait_for_timeout(300)
    for _ in range(8):
        pg.locator("button", has_text="0.10").click()
        pg.wait_for_timeout(200)
    pg.locator("button", has_text="0.05").click()
    pg.wait_for_timeout(1500)
    # deliberately misread the burette (true reading: 23.85). Test mode must
    # accept it silently — no wrong-answer feedback, no reveal oracle.
    pg.wait_for_selector('[data-testid="burette-read-input"]', timeout=TIMEOUT_MS)
    check("no reveal oracle in test mode",
          pg.locator('[data-testid="burette-read-reveal"]').count() == 0)
    pg.fill('[data-testid="burette-read-input"]', "20.00")
    pg.click('[data-testid="burette-read-check"]')
    pg.wait_for_timeout(1000)
    check("wrong reading accepted silently (mistakes included)",
          pg.locator('[data-testid="burette-read-feedback"]').count() == 0
          and pg.locator('[data-testid="endpoint-read-card"]').count() == 0)
    pg.click('[data-testid="test-hand-in"]')
    pg.wait_for_selector('[data-testid="test-report-score"]', timeout=TIMEOUT_MS)
    score2 = pg.locator('[data-testid="test-report-score"]').inner_text().strip()
    n2 = int(score2.split("/")[0])
    check("real work raises the marked score", n2 >= 3, score2)
    note = pg.locator('[data-testid="test-report-note"]')
    check("misread surfaces as an examiner's note",
          note.count() >= 1 and "meniscus" in note.first.inner_text(),
          note.count())
    snap(pg, "testmode-report-work.png")

    pg.click('[data-testid="test-report-exit"]')
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    check("back-to-practice restores guide",
          pg.locator('[data-testid="guide-panel"], [data-testid="guide-toggle"]').count() >= 1)
    check("back-to-practice restores meniscus practice",
          pg.locator('[data-testid="meniscus-toggle"]').count() >= 1)
    pg.close()

    # ---------- HUD is shared: flame has the chip too ----------
    # And the submit verb must not promise instant verification in test mode:
    # practice says "Check identification", test mode says "Record answer".
    pg = browser.new_page(viewport={"width": 1280, "height": 800})
    pg.goto(f"http://localhost:{PORT}/practical/flame", wait_until="load", timeout=TIMEOUT_MS)
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    check("flame practical has test-mode chip", True)
    label = pg.locator('[data-testid="flame-submit"]').inner_text()
    check("practice: submit verb is Check identification", "Check identification" in label, label)
    pg.click('[data-testid="test-mode-toggle"]')
    pg.wait_for_selector('[data-testid="test-hand-in"]', timeout=TIMEOUT_MS)
    label = pg.locator('[data-testid="flame-submit"]').inner_text()
    check("test mode: submit verb is Record answer", "Record answer" in label, label)
    body = pg.locator("body").inner_text()
    check("test mode: no instant-verification verbs on page",
          all(v not in body for v in ("Check identification", "Check conclusion", "Check technique")))
    pg.click('[data-testid="test-mode-exit"]')
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    label = pg.locator('[data-testid="flame-submit"]').inner_text()
    check("back-to-practice restores Check verb", "Check identification" in label, label)
    pg.close()

    # ---------- MockPaper is an indirect oracle: unreachable in test mode ----------
    # Enthalpy: complete a run (mock unlock condition), then toggle modes.
    pg = browser.new_page(viewport={"width": 1280, "height": 800})
    pg.goto(f"http://localhost:{PORT}/practical/enthalpy", wait_until="load", timeout=TIMEOUT_MS)
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    time.sleep(2)
    pg.locator("button", has_text="Add Na").click()
    pg.wait_for_selector('[data-testid="mock-open-enthalpy"]', timeout=TIMEOUT_MS)
    check("practice: completed run offers mock paper", True)
    body = pg.inner_text("body")
    check("practice: live calculations panel visible", "live calculations" in body.lower())
    check("practice: Show Calculations offered",
          pg.locator("button", has_text="Show Calculations").count() >= 1)
    pg.click('[data-testid="test-mode-toggle"]')
    pg.wait_for_selector('[data-testid="test-hand-in"]', timeout=TIMEOUT_MS)
    check("test mode: mock paper unreachable",
          pg.locator('[data-testid^="mock-open"]').count() == 0)
    body = pg.inner_text("body")
    check("test mode: no live calculations panel", "live calculations" not in body.lower())
    check("test mode: no Show Calculations button",
          pg.locator("button", has_text="Show Calculations").count() == 0)
    snap(pg, "testmode-enthalpy-no-mock.png")
    pg.click('[data-testid="test-mode-exit"]')
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    check("back-to-practice restores mock paper",
          pg.locator('[data-testid="mock-open-enthalpy"]').count() >= 1)
    check("back-to-practice restores live calculations",
          "live calculations" in pg.inner_text("body").lower())
    pg.close()

    # ---------- Clock: derived 1000/t is an answer — blanked in test mode ----------
    import re as _re
    pg = browser.new_page(viewport={"width": 1280, "height": 800})
    pg.goto(f"http://localhost:{PORT}/practical/clock", wait_until="load", timeout=TIMEOUT_MS)
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    time.sleep(2)
    pg.get_by_role("button", name="0.100", exact=True).click()
    pg.get_by_role("button", name=_re.compile("Mix & start")).click()
    _deadline, _last_sim, _last_prog = time.time() + 600, -1.0, time.time()
    while time.time() < _deadline:
        _btn = pg.get_by_role("button", name=_re.compile(r"Record [\d.]+ s"))
        if _btn.count() > 0:
            _btn.first.click()
            break
        try:
            _sim = float(pg.locator('[data-testid="clock-time"]').inner_text().split("s")[0])
        except Exception:  # noqa: BLE001 — display mid-update
            _sim = _last_sim
        if _sim > _last_sim:
            _last_sim, _last_prog = _sim, time.time()
        elif time.time() - _last_prog > 20:
            raise AssertionError(f"clock run stalled at {_last_sim}s sim")
        time.sleep(0.25)
    else:
        raise AssertionError("clock run did not complete in 600s")
    pg.wait_for_selector("table", timeout=TIMEOUT_MS)
    row = pg.locator("tbody tr").first.inner_text()
    check("practice: results row computes 1000/t", bool(_re.search(r"\d+\.\d\d\s*$", row)), row)
    pg.click('[data-testid="test-mode-toggle"]')
    pg.wait_for_selector('[data-testid="test-hand-in"]', timeout=TIMEOUT_MS)
    row = pg.locator("tbody tr").first.inner_text()
    check("test mode: 1000/t cell blanked", row.rstrip().endswith("—"), row)
    check("test mode: clock Show Calculations hidden",
          pg.locator("button", has_text="Show Calculations").count() == 0)
    snap(pg, "testmode-clock-no-rate.png")
    pg.click('[data-testid="test-mode-exit"]')
    pg.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    row = pg.locator("tbody tr").first.inner_text()
    check("back-to-practice restores 1000/t", bool(_re.search(r"\d+\.\d\d\s*$", row)), row)
    pg.close()

    # ---------- mobile 390x844 ----------
    m = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    m.goto(f"http://localhost:{PORT}/practical/titration", wait_until="load", timeout=TIMEOUT_MS)
    m.wait_for_selector('[data-testid="test-mode-toggle"]', timeout=TIMEOUT_MS)
    box = m.locator('[data-testid="test-mode-toggle"]').bounding_box()
    check("mobile: chip on-screen", box and box["x"] >= 0 and box["x"] + box["width"] <= 390
          and box["y"] >= 0 and box["y"] + box["height"] <= 844, str(box))
    m.tap('[data-testid="test-mode-toggle"]')
    m.wait_for_selector('[data-testid="test-hand-in"]', timeout=TIMEOUT_MS)
    m.tap('[data-testid="test-hand-in"]')
    m.wait_for_selector('[data-testid="test-report"]', timeout=TIMEOUT_MS)
    check("mobile: report renders", m.locator('[data-testid="test-report-item"]').count() == 6)
    m.tap('[data-testid="test-report-close"]')
    check("mobile: report closes", m.locator('[data-testid="test-report"]').count() == 0)
    snap(m, "testmode-mobile.png")
    m.close()

    browser.close()

httpd.shutdown()
if fails:
    print("GATE testmode: FAIL — " + ", ".join(fails), flush=True)
    sys.exit(1)
print("GATE testmode: PASS", flush=True)
