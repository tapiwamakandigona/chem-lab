"""F21 gate: learner's guide course — menu entry, unit list, learn-by-doing
milestone ticking, and localStorage persistence across reload.

Flow: menu shows course-open with 0/9 → panel lists 9 units all not-done →
Start on unit 1 drops into titration with guide open → drive titration to a
recorded titre (endpoint + read-check) → back to menu → units 1+2 ticked,
badge 2/9 → reload page → progress persists from localStorage.
Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys
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


UNIT_IDS = [
    "titration-endpoint", "titration-read", "titration-concordant", "titration-paper",
    "clock-runs", "clock-paper", "enthalpy-run", "enthalpy-paper", "qual-identify",
]


def unit_done(pg, uid):
    return pg.locator(f'[data-testid="course-unit-{uid}"]').get_attribute("data-done")


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    # --- menu entry ---
    check("menu shows course-open", pg.locator('[data-testid="course-open"]').count() == 1)
    check("badge starts 0/9", "0/9" in pg.locator('[data-testid="course-open"]').inner_text())

    pg.locator('[data-testid="course-open"]').click()
    time.sleep(0.4)
    check("panel opens", pg.locator('[data-testid="course-panel"]').count() == 1)
    check("9 units listed", pg.locator('[data-testid^="course-unit-"]').count() == 9)
    all_zero = all(unit_done(pg, u) == "0" for u in UNIT_IDS)
    check("all units not done at start", all_zero)
    prog = pg.locator('[data-testid="course-progress"]')
    check("progress reads 0/9", prog.get_attribute("data-done") == "0" and prog.get_attribute("data-total") == "9")
    snap(pg, "course-panel.png")

    # --- start unit 1 → titration with guide open ---
    pg.locator('[data-testid="course-start-titration-endpoint"]').click()
    time.sleep(16)
    check("start lands in titration", pg.locator("button", has_text="5 cm³").count() > 0)
    check("guide coach open", pg.locator('[data-testid="guide-panel"]').count() == 1)

    # drive to endpoint (S22: 4x5 + 3x1 + 8x0.10 + 1x0.05 = 23.85)
    for _ in range(4):
        pg.locator("button", has_text="5 cm³").click(); time.sleep(0.3)
    for _ in range(3):
        pg.locator("button", has_text="1 cm³").click(); time.sleep(0.25)
    for _ in range(8):
        pg.locator("button", has_text="0.10").click(); time.sleep(0.2)
    pg.locator("button", has_text="0.05").click()
    time.sleep(1.5)

    # read-check records the titre → units 1 (endpoint) + 2 (read) both tick
    pg.fill('[data-testid="burette-read-input"]', "23.85")
    pg.click('[data-testid="burette-read-check"]')
    time.sleep(1.0)

    # --- back to menu, verify ticks ---
    pg.locator("button", has_text="Menu").first.click()
    time.sleep(0.8)
    check("badge now 2/9", "2/9" in pg.locator('[data-testid="course-open"]').inner_text(),
          pg.locator('[data-testid="course-open"]').inner_text()[:80])
    pg.locator('[data-testid="course-open"]').click()
    time.sleep(0.4)
    check("endpoint unit ticked", unit_done(pg, "titration-endpoint") == "1")
    check("read unit ticked", unit_done(pg, "titration-read") == "1")
    check("concordant unit still open", unit_done(pg, "titration-concordant") == "0")
    check("no start button on done unit",
          pg.locator('[data-testid="course-start-titration-endpoint"]').count() == 0)
    snap(pg, "course-progress.png")

    # --- persistence: reload, progress must survive ---
    pg.reload(wait_until="load")
    time.sleep(2)
    check("after reload badge still 2/9",
          "2/9" in pg.locator('[data-testid="course-open"]').inner_text())
    pg.locator('[data-testid="course-open"]').click()
    time.sleep(0.4)
    check("after reload endpoint unit still ticked", unit_done(pg, "titration-endpoint") == "1")
    ls = pg.evaluate("() => localStorage.getItem('chemlab-course-v1')")
    check("localStorage has course record", ls is not None and "titration-endpoint" in ls, str(ls))

    # --- mobile: panel usable at 390x844 ---
    pg.set_viewport_size({"width": 390, "height": 844})
    time.sleep(0.6)
    box = pg.locator('[data-testid="course-panel"] > div').bounding_box()
    check("mobile: panel fits width", box is not None and box["width"] <= 390, str(box))
    snap(pg, "course-mobile.png")

    b.close()

httpd.shutdown()
print(("GATE PASS" if not fails else f"GATE FAIL: {fails}"), flush=True)
sys.exit(0 if not fails else 1)
