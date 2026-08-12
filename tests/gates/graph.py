"""Gate: F14 rate graph in clock calc sheet.

Runs two real clock experiments (0.100 and 0.080 M), records both, opens
Show Calculations, and asserts the SVG rate graph: 2 plotted points, a
best-fit line through the origin, and gradient ~= 250 (t = 4.0/[S2O3] s
=> 1000/t = 250*conc). Exit 0 on pass.
"""
import functools
import http.server
import re
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
SHOT = SHOTS + "/graph-calc.png"


def run_one(page, conc_label, expect_secs, timeout_s=30):
    page.get_by_role("button", name=conc_label, exact=True).click()
    page.get_by_role("button", name=re.compile("Mix & start")).click()
    # poll for auto-stop (phase complete -> Record button)
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        btn = page.get_by_role("button", name=re.compile(r"Record [\d.]+ s"))
        if btn.count() > 0:
            label = btn.first.inner_text()
            secs = float(re.search(r"([\d.]+)\s*s", label).group(1))
            btn.first.click()
            return secs
        time.sleep(0.25)
    raise AssertionError(f"run at {conc_label} did not complete in {timeout_s}s")


def main():
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.route(re.compile(r".*"), lambda route, req:
                   route.continue_() if "127.0.0.1" in req.url else route.abort())
        page.goto(URL)
        page.get_by_text("Iodine Clock", exact=False).first.click()
        page.wait_for_timeout(1500)

        t1 = run_one(page, "0.100", 40.0)
        checks.append(("run1 time ~40s", abs(t1 - 40.0) <= 2.0, f"{t1}"))
        t2 = run_one(page, "0.080", 50.0)
        checks.append(("run2 time ~50s", abs(t2 - 50.0) <= 2.5, f"{t2}"))

        page.get_by_role("button", name=re.compile("Show Calculations")).click()
        page.wait_for_selector("[data-testid=rate-graph]", timeout=5000)

        n_pts = page.locator("[data-testid=rate-point]").count()
        checks.append(("2 plotted points", n_pts == 2, f"{n_pts}"))

        fit = page.locator("[data-testid=rate-fit]")
        checks.append(("fit line present", fit.count() == 1, f"{fit.count()}"))

        grad_txt = page.locator("[data-testid=rate-gradient]").inner_text()
        mval = float(re.search(r"gradient = ([\d.]+)", grad_txt).group(1))
        checks.append(("gradient ~250", 240.0 <= mval <= 260.0, f"{mval}"))

        # fit line passes through the plotted origin (x1,y1 == scaled 0,0)
        x1 = float(fit.get_attribute("x1"))
        y1 = float(fit.get_attribute("y1"))
        # origin in SVG coords: x=M.l=44, y=M.t+PH=240-40=200 (from RateGraph constants)
        checks.append(("fit through origin", abs(x1 - 44) < 0.5 and abs(y1 - 200) < 0.5,
                       f"({x1},{y1})"))

        page.screenshot(path=SHOT)
        browser.close()

    ok = True
    for name, passed, detail in checks:
        print(f"{'PASS' if passed else 'FAIL'} {name}: {detail}")
        ok = ok and passed
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
