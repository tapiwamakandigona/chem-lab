"""F3 gate: clock reaction — timing model, auto-stop, record, rate table.

0.100 M -> 40 s simulated (8 s real at scale 5); 0.040 M -> 100 s (20 s real).
"""
import http.server, socketserver, threading, functools, time, sys, re
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
    pg.locator("text=/Clock/i").first.click()
    time.sleep(16)

    def run(conc_label, sim_end_s, mid_shot=None):
        pg.locator("button", has_text=conc_label).click()
        time.sleep(0.3)
        pg.locator("button", has_text="Mix").click()
        # halfway shot
        real = sim_end_s / 5
        time.sleep(real / 2)
        if mid_shot:
            snap(pg, mid_shot)
        # wait for auto-stop. IMPORTANT: match the "Record <t> s" BUTTON,
        # not bare "Record" in body text — the guide coach step list contains
        # "Record the time (...)" permanently, which broke the loose check.
        rec_btn = pg.get_by_role("button", name=re.compile(r"Record [0-9.]+ s"))
        deadline = time.time() + real * 3 + 20
        while time.time() < deadline:
            if rec_btn.count() > 0:
                break
            time.sleep(1)
        check(f"{conc_label} auto-stopped", rec_btn.count() > 0)
        m = re.search(r"Record ([0-9.]+) s", rec_btn.inner_text()) if rec_btn.count() > 0 else None
        t = float(m.group(1)) if m else -1
        check(f"{conc_label} time = {sim_end_s}s (clamped)", abs(t - sim_end_s) < 0.6, f"got {t}")
        rec_btn.click()
        time.sleep(0.5)
        return t

    t1 = run("0.100", 40, mid_shot="f3-mid.png")
    t2 = run("0.040", 100)
    check("inverse proportionality", t1 > 0 and t2 > 0 and abs((t2 / t1) - 2.5) < 0.2, f"ratio {t2/t1 if t1>0 else '?'}")
    rows = pg.locator("table tbody tr").all_inner_texts()
    parsed = [r.split("\t") for r in rows]
    check("results table has both rows", len(parsed) == 2 and parsed[0][0] == "0.100" and parsed[1][0] == "0.040", str(parsed))
    ok = all(abs(float(rate) - 1000 / float(t)) < 0.05 for _, t, rate in parsed)
    check("rate column = 1000/t for all rows", ok, str(parsed))
    snap(pg, "f3-results.png")
    b.close()

sys.exit(1 if fails else 0)
