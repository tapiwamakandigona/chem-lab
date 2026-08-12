"""F27 gate: electrochemical cells — identify unknown metal from E cell.

Flow: menu card → scene loads → FB 16 (Fe) default: measure vs Cu shows
0.78 V unknown-negative, row recorded, button disables → wrong metal (Ni)
rejected 0 → right metal with ONE reference scores 1/2 not-ok (evidence
rule needs both) → measure vs Zn 0.32 V → 2/2 ok → FB 19 (Ag): vs Cu is
positive-terminal 0.46 V → guide 5/5 → mobile 390x844: guide collapsed,
measure tappable. Exit 1 on any failure.
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


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    card = pg.locator("button", has_text="Electrochemical Cells")
    check("menu shows electro card", card.count() >= 1)
    card.first.click()
    pg.wait_for_selector('[data-testid="electro-submit"]', timeout=30000)
    time.sleep(3)

    check("FB 16 selected by default",
          "border-lab-accent" in (pg.locator('[data-testid="electro-unknown-fb16"]').get_attribute("class") or ""))
    check("submit disabled with no answer",
          pg.locator('[data-testid="electro-submit"]').is_disabled())

    # --- measure vs Cu: Fe gives 0.78 V, unknown negative ---
    pg.locator('[data-testid="electro-measure-Cu"]').click()
    time.sleep(0.4)
    rows = pg.locator('[data-testid="electro-reading-row"]')
    check("vs Cu reading recorded", rows.count() == 1)
    row_txt = rows.first.inner_text()
    check("Fe vs Cu reads 0.78 V", "0.78 V" in row_txt)
    check("Fe is negative terminal vs Cu", "negative" in row_txt)
    check("measure button disables after use",
          pg.locator('[data-testid="electro-measure-Cu"]').is_disabled())

    # --- wrong metal rejected ---
    pg.locator('[data-testid="electro-answer"]').select_option("Ni")
    pg.locator('[data-testid="electro-submit"]').click()
    time.sleep(0.3)
    res = pg.locator('[data-testid="electro-result"]')
    check("wrong metal scores 0",
          res.get_attribute("data-score") == "0" and res.get_attribute("data-ok") == "0")

    # --- right metal but only one reference: 1/2, not ok ---
    pg.locator('[data-testid="electro-answer"]').select_option("Fe")
    pg.locator('[data-testid="electro-submit"]').click()
    time.sleep(0.3)
    check("one-reference answer scores 1/2 (needs both references)",
          res.get_attribute("data-score") == "1" and res.get_attribute("data-ok") == "0")

    # --- measure vs Zn, then 2/2 ---
    pg.locator('[data-testid="electro-measure-Zn"]').click()
    time.sleep(0.4)
    check("vs Zn reading recorded", rows.count() == 2)
    check("Fe vs Zn reads 0.32 V", "0.32 V" in rows.nth(1).inner_text())
    pg.locator('[data-testid="electro-submit"]').click()
    time.sleep(0.3)
    check("both references + right metal = 2/2 ok",
          res.get_attribute("data-score") == "2" and res.get_attribute("data-ok") == "1")
    check("metal named in feedback", "iron" in res.inner_text())
    snap(pg, "electro-marked.png")

    # --- guide completes ---
    steps = pg.locator('[data-testid="guide-step"]')
    if steps.count() == 0:
        pill = pg.locator('[data-testid="guide-toggle"]')
        if pill.count():
            pill.click()
            time.sleep(0.3)
        steps = pg.locator('[data-testid="guide-step"]')
    done_steps = sum(1 for i in range(steps.count())
                     if steps.nth(i).get_attribute("data-done") == "1")
    check("guide 5/5 complete", steps.count() == 5 and done_steps == 5,
          f"{done_steps}/{steps.count()}")

    # --- polarity flips for a metal above Cu: FB 19 (Ag) ---
    pg.locator('[data-testid="electro-unknown-fb19"]').click()
    time.sleep(0.3)
    check("switching unknown clears readings", rows.count() == 0)
    pg.locator('[data-testid="electro-measure-Cu"]').click()
    time.sleep(0.4)
    ag_txt = rows.first.inner_text()
    check("Ag vs Cu reads 0.46 V", "0.46 V" in ag_txt)
    check("Ag is positive terminal vs Cu", "positive" in ag_txt)
    snap(pg, "electro-ag.png")

    pg.close()

    # --- mobile ---
    m = b.new_page(viewport={"width": 390, "height": 844},
                   has_touch=True, is_mobile=True)
    m.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    m.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    m.locator("button", has_text="Electrochemical Cells").first.click()
    m.wait_for_selector('[data-testid="electro-submit"]', timeout=30000)
    time.sleep(2)
    check("mobile: guide starts collapsed",
          m.locator('[data-testid="guide-panel"]').count() == 0
          and m.locator('[data-testid="guide-toggle"]').count() == 1)
    m.locator('[data-testid="electro-measure-Cu"]').click()
    time.sleep(0.4)
    check("mobile: measure tappable, reading recorded",
          m.locator('[data-testid="electro-reading-row"]').count() == 1)
    snap(m, "electro-mobile.png")
    m.close()
    b.close()

httpd.shutdown()
print("GATE " + ("PASS" if not fails else f"GATE FAIL {fails}"), flush=True)
sys.exit(0 if not fails else 1)
