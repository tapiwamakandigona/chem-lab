"""Gate: F20 clock (S23) + enthalpy (S20) mock papers with ECF marking.

Clock: five real runs (0.100..0.020 M), paper unlocks, all-correct = 6/6
(a 25.0, b 250, c 1, d 80); ECF chain from wrong (a) still scores b/d.
Enthalpy: full run, paper unlocks only on complete; all-correct = 5/5 using
the cooling-corrected Textrap (a 10.7, b 1123.5, c 0.050, d -22.5); ECF from
a=10.0 scores 4/5. Paper hidden before its unlock condition in both.
Exit 0 on pass.
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


def run_clock(page, conc_label, hard_cap_s=900):
    """Wait for run completion pacing on the SIM clock, not wall time.

    simClock.js clamps per-frame delta, so a slow renderer slows the sim
    instead of skipping time. Fail only on a real stall (20 s wall without
    sim progress) or the hard cap — never on a slow-but-advancing run.
    """
    page.get_by_role("button", name=conc_label, exact=True).click()
    page.get_by_role("button", name=re.compile("Mix & start")).click()
    deadline = time.time() + hard_cap_s
    last_sim, last_progress = -1.0, time.time()
    while time.time() < deadline:
        btn = page.get_by_role("button", name=re.compile(r"Record [\d.]+ s"))
        if btn.count() > 0:
            btn.first.click()
            return
        try:
            sim = float(page.locator('[data-testid="clock-time"]').inner_text().split("s")[0])
        except Exception:  # noqa: BLE001 — display mid-update
            sim = last_sim
        if sim > last_sim:
            last_sim, last_progress = sim, time.time()
        elif time.time() - last_progress > 20:
            raise AssertionError(
                f"clock run {conc_label} stalled: sim clock stuck at {last_sim}s")
        time.sleep(0.25)
    raise AssertionError(f"clock run {conc_label} did not finish in {hard_cap_s}s")


def fill_paper(pg, vals):
    for pid, v in vals.items():
        pg.fill(f'[data-testid="mock-input-{pid}"]', v)
    pg.click('[data-testid="mock-submit"]')
    time.sleep(0.4)
    score = pg.locator('[data-testid="mock-score"]').inner_text()
    marks = {pid: pg.locator(f'[data-testid="mock-mark-{pid}"]').get_attribute("data-ok")
             for pid in vals}
    return score, marks


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        pg.set_default_timeout(TIMEOUT_MS)
        pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
        pg.goto(URL, wait_until="load")
        time.sleep(2)

        # ---------- clock ----------
        pg.get_by_text("Iodine Clock", exact=False).first.click()
        time.sleep(14)
        check("clock: no paper before five runs",
              pg.locator('[data-testid="mock-open-clock"]').count() == 0)

        for label in ["0.100", "0.080", "0.060", "0.040", "0.020"]:
            run_clock(pg, label)
            time.sleep(0.4)

        check("clock: paper unlocks after five runs",
              pg.locator('[data-testid="mock-open-clock"]').count() == 1)
        pg.click('[data-testid="mock-open-clock"]')
        time.sleep(0.6)
        check("clock: paper open", pg.locator('[data-testid="mock-paper"]').count() == 1)

        score, marks = fill_paper(pg, {"a": "25.0", "b": "250", "c": "1", "d": "80"})
        check("clock: all-correct 6/6", score.startswith("6/6"), score + " " + str(marks))
        snap(pg, "mock-clock.png")

        # ECF: a wrong (20) -> b=200 ecf ok, d=100 ecf ok => 5/6
        score, marks = fill_paper(pg, {"a": "20.0", "b": "200", "c": "1", "d": "100"})
        check("clock: ECF chain 5/6", score.startswith("5/6"), score + " " + str(marks))
        check("clock: part a marked wrong", marks["a"] == "0", str(marks))
        check("clock: part b ok via ecf", marks["b"] == "1", str(marks))
        check("clock: part d ok via ecf", marks["d"] == "1", str(marks))
        pg.click('[data-testid="mock-close"]')
        time.sleep(0.4)

        # ---------- enthalpy ----------
        pg.locator("text=← Menu").click()
        time.sleep(1)
        pg.locator("text=/Enthalpy/i").first.click()
        time.sleep(14)
        check("enthalpy: no paper before run",
              pg.locator('[data-testid="mock-open-enthalpy"]').count() == 0)

        pg.get_by_role("button", name=re.compile("Add Na₂CO₃|Start")).first.click()
        deadline = time.time() + 30
        while time.time() < deadline:
            if pg.locator('[data-testid="mock-open-enthalpy"]').count() > 0:
                break
            time.sleep(0.5)
        check("enthalpy: paper unlocks when complete",
              pg.locator('[data-testid="mock-open-enthalpy"]').count() == 1)
        pg.click('[data-testid="mock-open-enthalpy"]')
        time.sleep(0.6)

        # true values: T1 22.0, Textrap 32.7 -> dT 10.7, q 1123.5, n 0.050, dH -22.5
        score, marks = fill_paper(pg, {"a": "10.7", "b": "1123.5", "c": "0.050", "d": "-22.5"})
        check("enthalpy: all-correct 5/5", score.startswith("5/5"), score + " " + str(marks))
        snap(pg, "mock-enthalpy.png")

        # ECF: a=10.0 wrong -> b=1050 ecf, c right, d=-21.0 ecf => 4/5
        score, marks = fill_paper(pg, {"a": "10.0", "b": "1050", "c": "0.050", "d": "-21.0"})
        check("enthalpy: ECF chain 4/5", score.startswith("4/5"), score + " " + str(marks))
        check("enthalpy: sign matters — +22.5 rejected",
              fill_paper(pg, {"a": "10.7", "b": "1123.5", "c": "0.050", "d": "22.5"})[1]["d"] == "0")

        b.close()

    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
