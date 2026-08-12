"""Gate: F19 qualitative analysis experiment (9701 P3 Q3 ion ID).

Chemistry correctness against the official 9701 qualitative analysis notes:
- FA 8 (CuSO4): NaOH pale blue ppt insoluble in excess; NH3 ppt dissolves to
  deep blue in excess; BaCl2 white ppt insoluble in acid. Marked 2/2 only
  with supporting tests done; wrong ion or no-evidence path checked too.
- FA 6 (ZnCl2): amphoteric white ppt dissolving in excess NaOH; AgNO3 white
  ppt soluble in NH3.
- Order enforcement: excess buttons locked before dropwise.
- Guide panel present with 6 steps; mobile 390x844 fit.
Exit 0 on pass.
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

PORT = 8797
URL = f"http://127.0.0.1:{PORT}/"
_h = functools.partial(http.server.SimpleHTTPRequestHandler,
                       directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
_httpd = socketserver.TCPServer(("", PORT), _h)
threading.Thread(target=_httpd.serve_forever, daemon=True).start()

fails = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f": {detail}" if detail else ""), flush=True)
    if not ok:
        fails.append(name)


def obs_rows(pg):
    return pg.locator('[data-testid="qual-obs-row"]').all_inner_texts()


def run_test(pg, rid, wait=0.5):
    pg.click(f'[data-testid="qual-test-{rid}"]')
    time.sleep(wait)


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
        pg.goto(URL, wait_until="load")
        time.sleep(2)

        pg.locator("text=/Qualitative Analysis/i").first.click()
        time.sleep(16)
        pg.screenshot(path=SHOTS + "/qual-scene.png")
        print("shot: qual-scene.png", flush=True)

        check("guide: qual panel with 6 steps",
              pg.locator('[data-testid="guide-step"]').count() == 6)

        # --- FA 8 = CuSO4 ---
        pg.click('[data-testid="qual-unknown-fa8"]')
        time.sleep(0.4)

        # order enforcement
        check("excess NaOH locked before dropwise",
              pg.locator('[data-testid="qual-test-naoh_excess"]').is_disabled())

        run_test(pg, "naoh_drop")
        rows = obs_rows(pg)
        check("CuSO4 + NaOH drop: pale blue ppt", any("pale blue ppt" in r for r in rows), str(rows))
        run_test(pg, "naoh_excess")
        rows = obs_rows(pg)
        check("CuSO4 + NaOH excess: insoluble", any("insoluble" in r for r in rows), str(rows))
        run_test(pg, "nh3_drop")
        run_test(pg, "nh3_excess")
        rows = obs_rows(pg)
        check("CuSO4 + NH3 excess: deep blue solution", any("deep blue" in r for r in rows), str(rows))
        run_test(pg, "bacl2")
        rows = obs_rows(pg)
        check("CuSO4 + BaCl2: white ppt insoluble in acid",
              any("white ppt" in r and "insoluble in dilute acid" in r for r in rows), str(rows))
        check("5 observation rows", len(rows) == 5, str(len(rows)))

        # marking: correct ions with evidence => 2/2
        pg.select_option('[data-testid="qual-cation"]', "Cu2+")
        pg.select_option('[data-testid="qual-anion"]', "SO42-")
        pg.click('[data-testid="qual-submit"]')
        time.sleep(0.4)
        res = pg.locator('[data-testid="qual-result"]')
        check("CuSO4 identified 2/2", res.get_attribute("data-score") == "2", res.inner_text())
        check("formula revealed", "CuSO" in res.inner_text(), res.inner_text())
        pg.screenshot(path=SHOTS + "/qual-marked.png")
        print("shot: qual-marked.png", flush=True)

        # wrong cation => 1/2
        pg.select_option('[data-testid="qual-cation"]', "Fe2+")
        pg.click('[data-testid="qual-submit"]')
        time.sleep(0.3)
        check("wrong cation scores 1/2",
              pg.locator('[data-testid="qual-result"]').get_attribute("data-score") == "1")

        # --- FA 6 = ZnCl2: fresh sample resets, amphoteric + AgNO3 ---
        pg.click('[data-testid="qual-unknown-fa6"]')
        time.sleep(0.4)
        check("switching unknown clears table", len(obs_rows(pg)) == 0, str(obs_rows(pg)))
        run_test(pg, "naoh_drop")
        run_test(pg, "naoh_excess")
        rows = obs_rows(pg)
        check("ZnCl2 + NaOH excess: dissolves (amphoteric)",
              any("dissolves" in r and "colourless" in r for r in rows), str(rows))
        run_test(pg, "agno3")
        rows = obs_rows(pg)
        check("ZnCl2 + AgNO3: white ppt soluble in NH3",
              any("white ppt" in r and "soluble in dilute NH" in r for r in rows), str(rows))

        # correct ID but NO NH3-vs-Zn disambiguation needed: mark full
        pg.select_option('[data-testid="qual-cation"]', "Zn2+")
        pg.select_option('[data-testid="qual-anion"]', "Cl-")
        pg.click('[data-testid="qual-submit"]')
        time.sleep(0.3)
        check("ZnCl2 identified 2/2",
              pg.locator('[data-testid="qual-result"]').get_attribute("data-score") == "2")

        # no-evidence rule: fresh sample, answer without testing => 0/2
        pg.click('[data-testid="qual-reset"]')
        time.sleep(0.3)
        pg.select_option('[data-testid="qual-cation"]', "Zn2+")
        pg.select_option('[data-testid="qual-anion"]', "Cl-")
        pg.click('[data-testid="qual-submit"]')
        time.sleep(0.3)
        check("correct guess without tests scores 0/2",
              pg.locator('[data-testid="qual-result"]').get_attribute("data-score") == "0",
              pg.locator('[data-testid="qual-result"]').inner_text())

        # --- FA 7 = (NH4)2CO3: gas tests ---
        pg.click('[data-testid="qual-unknown-fa7"]')
        time.sleep(0.4)
        run_test(pg, "naoh_drop")
        run_test(pg, "naoh_excess")
        run_test(pg, "naoh_warm")
        run_test(pg, "hcl")
        rows = obs_rows(pg)
        check("NH4+ warm NaOH: litmus blue", any("litmus blue" in r for r in rows), str(rows))
        check("CO32- + HCl: effervescence CO2",
              any("effervescence" in r and "CO" in r for r in rows), str(rows))

        # guide completion after full FA7 ID
        run_test(pg, "nh3_drop")
        run_test(pg, "nh3_excess")
        pg.select_option('[data-testid="qual-cation"]', "NH4+")
        pg.select_option('[data-testid="qual-anion"]', "CO32-")
        pg.click('[data-testid="qual-submit"]')
        time.sleep(0.5)
        dones = [s.get_attribute("data-done") for s in pg.locator('[data-testid="guide-step"]').all()]
        check("guide all 6 steps done after full run", dones == ["1"] * 6, str(dones))

        # --- mobile ---
        pgm = b.new_page(viewport={"width": 390, "height": 844})
        pgm.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
        pgm.goto(URL, wait_until="load")
        time.sleep(2)
        pgm.locator("text=/Qualitative Analysis/i").first.click()
        time.sleep(16)
        run_test(pgm, "naoh_drop", wait=0.8)
        rows = obs_rows(pgm)
        check("mobile: test runs and records", len(rows) == 1, str(rows))
        panel = pgm.locator('[data-testid="qual-observations"]')
        box = panel.bounding_box()
        check("mobile: observations table fits",
              bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390, str(box))
        pgm.screenshot(path=SHOTS + "/qual-mobile.png")
        print("shot: qual-mobile.png", flush=True)

        b.close()

    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
