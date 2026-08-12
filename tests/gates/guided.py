"""F17 gate: guided-mode step coach.

Titration: panel shows 6 steps; step ticking follows real actions
(dispense -> rough/slow steps tick; endpoint -> dropwise ticks; read-check
-> record ticks). Toggle hides to a pill and reopens. Clock + enthalpy
panels present with correct step counts. Mobile: pill/panel fits 390x844.
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


def dones(pg):
    return [
        pg.locator('[data-testid="guide-step"]').nth(i).get_attribute("data-done")
        for i in range(pg.locator('[data-testid="guide-step"]').count())
    ]


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    # --- titration ---
    pg.locator("text=/Titration/i").first.click()
    time.sleep(16)
    check("titration: guide panel visible", pg.locator('[data-testid="guide-panel"]').count() == 1)
    check("titration: 6 steps", pg.locator('[data-testid="guide-step"]').count() == 6, str(dones(pg)))
    check("titration: nothing done at start", dones(pg) == ["0"] * 6, str(dones(pg)))

    for _ in range(4):
        pg.locator("button", has_text="5 cm³").click(); time.sleep(0.3)
    d = dones(pg)
    check("titration: rough step ticks at 20 cm3, slow step not yet", d[:2] == ["1", "1"] and d[2] == "0" and d[3] == "0", str(d))

    for _ in range(3):
        pg.locator("button", has_text="1 cm³").click(); time.sleep(0.25)
    d = dones(pg)
    check("titration: slow step still unticked at 23.00", d[2] == "0", str(d))
    for _ in range(8):
        pg.locator("button", has_text="0.10").click(); time.sleep(0.2)
    d = dones(pg)
    check("titration: slow step ticks at 23.80", d[2] == "1" and d[3] == "0", str(d))
    pg.locator("button", has_text="0.05").click()
    time.sleep(1.5)
    d = dones(pg)
    check("titration: dropwise ticks at endpoint", d[3] == "1" and d[4] == "0", str(d))

    pg.fill('[data-testid="burette-read-input"]', "23.85")
    pg.click('[data-testid="burette-read-check"]')
    time.sleep(1.0)
    d = dones(pg)
    check("titration: record ticks after read-check", d[4] == "1" and d[5] == "0", str(d))
    snap(pg, "guided-titration.png")

    # toggle hide/show
    pg.locator('[data-testid="guide-toggle"]').click()
    time.sleep(0.4)
    check("toggle hides panel", pg.locator('[data-testid="guide-panel"]').count() == 0)
    check("pill shows progress", "5/6" in pg.locator('[data-testid="guide-toggle"]').inner_text())
    pg.locator('[data-testid="guide-toggle"]').click()
    time.sleep(0.4)
    check("toggle reopens panel", pg.locator('[data-testid="guide-panel"]').count() == 1)

    # --- clock ---
    pg.locator("text=← Menu").click(); time.sleep(1)
    pg.locator("text=/Iodine Clock/i").first.click()
    time.sleep(12)
    check("clock: guide panel visible", pg.locator('[data-testid="guide-panel"]').count() == 1)
    check("clock: 5 steps", pg.locator('[data-testid="guide-step"]').count() == 5, str(dones(pg)))

    # --- enthalpy ---
    pg.locator("text=← Menu").click(); time.sleep(1)
    pg.locator("text=/Enthalpy/i").first.click()
    time.sleep(12)
    check("enthalpy: guide panel visible", pg.locator('[data-testid="guide-panel"]').count() == 1)
    check("enthalpy: 4 steps", pg.locator('[data-testid="guide-step"]').count() == 4, str(dones(pg)))

    # --- mobile ---
    pgm = b.new_page(viewport={"width": 390, "height": 844})
    pgm.set_default_timeout(TIMEOUT_MS)
    pgm.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pgm.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pgm.locator("text=/Titration/i").first.click()
    time.sleep(16)
    # portrait phones start collapsed (open panel intercepted taps on the
    # bottom-sheet action buttons — caught by the gas gate); pill must be
    # tappable and expand to a usable, in-viewport panel.
    check("mobile: guide starts collapsed",
          pgm.locator('[data-testid="guide-panel"]').count() == 0)
    pill = pgm.locator('[data-testid="guide-toggle"]')
    check("mobile: guide pill visible", pill.count() == 1 and pill.is_visible())
    pill.click()
    time.sleep(0.3)
    panel = pgm.locator('[data-testid="guide-panel"]')
    check("mobile: pill opens panel", panel.count() == 1)
    box = panel.bounding_box() if panel.count() else None
    check("mobile: guide fits viewport", bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390 and box["y"] + box["height"] <= 844, str(box))
    snap(pgm, "guided-mobile.png")

    b.close()

sys.exit(1 if fails else 0)
