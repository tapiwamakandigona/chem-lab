"""F23 gate: gravimetric analysis — water of crystallisation to constant mass.

Flow: menu card → weigh empty crucible (23.45) → add hydrated salt → weigh
(25.91) → heat/cool/weigh cycles: 24.83, 24.66 (not constant) → 24.65
(constant, Δ=0.01) → heat disabled → wrong x rejected → x=7 marked correct
against the learner's OWN readings → mobile 390x844 usable.
Exit 1 on any failure.
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


def reading(pg, i):
    row = pg.locator(f'[data-testid="grav-reading-{i}"]')
    return row.inner_text() if row.count() else None


def wait_idle(pg, timeout=15):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if pg.locator('[data-testid="grav-phase"]').get_attribute("data-phase") == "idle":
            return True
        time.sleep(0.25)
    return False


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    # --- menu card exists, opens the experiment ---
    card = pg.locator("button", has_text="Water of Crystallisation")
    check("menu shows grav card", card.count() >= 1)
    card.first.click()
    time.sleep(16)  # three.js chunk + scene
    check("grav scene loads (weigh btn)", pg.locator('[data-testid="grav-weigh"]').count() == 1)
    check("guide coach present", pg.locator('[data-testid="guide-panel"]').count() == 1)
    check("heat disabled before sample",
          pg.locator('[data-testid="grav-heat"]').is_disabled())

    # --- weigh empty, add sample, weigh loaded ---
    pg.click('[data-testid="grav-weigh"]')
    time.sleep(0.3)
    r0 = reading(pg, 0)
    check("empty crucible 23.45", r0 is not None and "23.45" in r0, str(r0))
    check("add enabled after empty weigh",
          not pg.locator('[data-testid="grav-add"]').is_disabled())
    pg.click('[data-testid="grav-add"]')
    time.sleep(0.3)
    pg.click('[data-testid="grav-weigh"]')
    time.sleep(0.3)
    r1 = reading(pg, 1)
    check("loaded mass 25.91", r1 is not None and "25.91" in r1, str(r1))
    snap(pg, "grav-loaded.png")

    # --- heat/cool/weigh cycles to constant mass ---
    expected = ["24.83", "24.66", "24.65"]
    for cyc, exp in enumerate(expected):
        pg.click('[data-testid="grav-heat"]')
        time.sleep(0.5)
        ph = pg.locator('[data-testid="grav-phase"]').get_attribute("data-phase")
        if cyc == 0:
            check("heating phase runs", ph in ("heating", "cooling"), str(ph))
            check("weigh disabled while hot",
                  pg.locator('[data-testid="grav-weigh"]').is_disabled())
            snap(pg, "grav-heating.png")
        check(f"cycle {cyc + 1} returns to idle", wait_idle(pg))
        pg.click('[data-testid="grav-weigh"]')
        time.sleep(0.3)
        r = reading(pg, 2 + cyc)
        check(f"cycle {cyc + 1} mass {exp}", r is not None and exp in r, str(r))
        if cyc < len(expected) - 1:
            check(f"not constant after cycle {cyc + 1}",
                  pg.locator('[data-testid="grav-constant"]').count() == 0)

    check("constant mass badge shown", pg.locator('[data-testid="grav-constant"]').count() == 1)
    check("heat disabled at constant mass",
          pg.locator('[data-testid="grav-heat"]').is_disabled())
    check("only one reading per cycle enforced",
          pg.locator('[data-testid^="grav-reading-"]').count() == 5)

    # --- marking: wrong x rejected, x=7 accepted from own readings ---
    pg.fill('[data-testid="grav-x-input"]', "3")
    pg.click('[data-testid="grav-x-check"]')
    time.sleep(0.3)
    res = pg.locator('[data-testid="grav-x-result"]')
    check("wrong x marked wrong", res.get_attribute("data-ok") == "0")
    pg.fill('[data-testid="grav-x-input"]', "7")
    pg.click('[data-testid="grav-x-check"]')
    time.sleep(0.3)
    check("x=7 marked correct", res.get_attribute("data-ok") == "1", res.inner_text()[:90])
    check("worked answer quotes own water mass", "1.26" in res.inner_text(), res.inner_text()[:90])
    snap(pg, "grav-marked.png")

    # --- guide steps all ticked ---
    done = pg.locator('[data-testid="guide-step"][data-done="1"]').count()
    total = pg.locator('[data-testid="guide-step"]').count()
    check("all guide steps ticked", total == 5 and done == 5, f"{done}/{total}")

    # --- mobile ---
    pgm = b.new_page(viewport={"width": 390, "height": 844})
    pgm.set_default_timeout(TIMEOUT_MS)
    pgm.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pgm.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pgm.locator("button", has_text="Water of Crystallisation").first.click()
    time.sleep(16)
    check("mobile: weigh button visible", pgm.locator('[data-testid="grav-weigh"]').is_visible())
    box = pgm.locator('[data-testid="grav-weigh"]').bounding_box()
    check("mobile: controls fit width", box is not None and box["x"] + box["width"] <= 390, str(box))
    snap(pgm, "grav-mobile.png")

    b.close()

httpd.shutdown()
print(("GATE PASS" if not fails else f"GATE FAIL: {fails}"), flush=True)
sys.exit(0 if not fails else 1)
