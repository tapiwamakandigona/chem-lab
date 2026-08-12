"""F25 gate: gas collection — molar gas volume, purity of impure CaCO3.

Flow: menu card → scene loads → record disabled in setup → add acid (start)
→ timer + syringe volume rise → record readings at intervals (one-per-5s
guard) until constant volume (two readings ≥20 sim-s apart within 0.5 cm³)
→ phase done freezes syringe → wrong purity rejected → ~87.5% accepted
against the learner's OWN final volume → guide 5/5 → mobile 390x844 usable.
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


def vol_of(pg):
    txt = pg.locator('[data-testid="gas-volume"]').inner_text()
    return float(txt.replace("cm³", "").strip())


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    # --- menu card exists, opens the experiment ---
    card = pg.locator("button", has_text="Molar Gas Volume")
    check("menu shows gas card", card.count() >= 1)
    card.first.click()
    time.sleep(16)  # three.js chunk + scene
    check("gas scene loads (start btn)", pg.locator('[data-testid="gas-start"]').count() == 1)
    check("guide coach present", pg.locator('[data-testid="guide-panel"]').count() == 1)
    check("record disabled before start",
          pg.locator('[data-testid="gas-record"]').is_disabled())
    check("volume starts at 0", vol_of(pg) == 0.0)

    # --- start: timer runs, syringe fills ---
    pg.click('[data-testid="gas-start"]')
    time.sleep(0.4)
    check("phase running",
          pg.locator('[data-testid="gas-phase"]').get_attribute("data-phase") == "running")
    check("start disabled while running",
          pg.locator('[data-testid="gas-start"]').is_disabled())
    time.sleep(2.6)  # ~30 sim s
    v1 = vol_of(pg)
    check("volume rises (~38 at 30s)", 25 <= v1 <= 50, str(v1))
    snap(pg, "gas-running.png")

    # --- record readings until constant volume ---
    pg.click('[data-testid="gas-record"]')
    time.sleep(0.15)
    check("first reading recorded",
          pg.locator('[data-testid="gas-reading-0"]').count() == 1)
    check("record disabled right after a reading (5 s guard)",
          pg.locator('[data-testid="gas-record"]').is_disabled())

    t0 = time.time()
    while time.time() - t0 < 60:
        if pg.locator('[data-testid="gas-constant"]').count():
            break
        btn = pg.locator('[data-testid="gas-record"]')
        if not btn.is_disabled():
            btn.click()
        time.sleep(2.2)
    check("constant volume reached", pg.locator('[data-testid="gas-constant"]').count() == 1)
    check("phase done",
          pg.locator('[data-testid="gas-phase"]').get_attribute("data-phase") == "done")
    check("record disabled when done",
          pg.locator('[data-testid="gas-record"]').is_disabled())

    rows = pg.locator('[data-testid^="gas-reading-"]')
    n = rows.count()
    vols = []
    for i in range(n):
        cells = pg.locator(f'[data-testid="gas-reading-{i}"] td').all_inner_texts()
        vols.append(float(cells[1]))
    check("several readings taken", n >= 3, str(n))
    check("readings monotonic non-decreasing",
          all(vols[i] <= vols[i + 1] + 1e-9 for i in range(len(vols) - 1)), str(vols))
    check("final volume near Vmax 83.9", 82.0 <= vols[-1] <= 84.5, str(vols[-1]))

    # syringe frozen after done
    va = vol_of(pg)
    time.sleep(1.2)
    check("syringe frozen when done", abs(vol_of(pg) - va) < 0.001)

    # --- marking: wrong purity rejected, ~87.5% accepted from OWN volume ---
    pg.fill('[data-testid="gas-purity-input"]', "50")
    pg.click('[data-testid="gas-purity-check"]')
    time.sleep(0.3)
    res = pg.locator('[data-testid="gas-purity-result"]')
    check("wrong purity marked wrong", res.get_attribute("data-ok") == "0")
    own = (vols[-1] / 24000) * 100.1 / 0.400 * 100
    pg.fill('[data-testid="gas-purity-input"]', f"{own:.1f}")
    pg.click('[data-testid="gas-purity-check"]')
    time.sleep(0.3)
    check("own-volume purity marked correct", res.get_attribute("data-ok") == "1",
          res.inner_text()[:90])
    check("worked answer quotes own final volume",
          f"{vols[-1]:.1f}" in res.inner_text(), res.inner_text()[:90])
    snap(pg, "gas-marked.png")

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
    pgm.locator("button", has_text="Molar Gas Volume").first.click()
    time.sleep(16)
    check("mobile: start button visible", pgm.locator('[data-testid="gas-start"]').is_visible())
    box = pgm.locator('[data-testid="gas-start"]').bounding_box()
    check("mobile: start button on screen",
          box is not None and 0 <= box["x"] and box["x"] + box["width"] <= 390, str(box))
    pgm.click('[data-testid="gas-start"]')
    time.sleep(0.5)
    check("mobile: reaction starts",
          pgm.locator('[data-testid="gas-phase"]').get_attribute("data-phase") == "running")
    snap(pgm, "gas-mobile.png")

    b.close()

httpd.shutdown()
print(("GATE PASS" if not fails else "GATE FAIL: " + ", ".join(fails)), flush=True)
sys.exit(0 if not fails else 1)
