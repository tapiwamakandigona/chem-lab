"""F15 gate: enthalpy cooling curve — readings table, extrapolation, corrected ΔH."""
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
    pg.locator("text=/Enthalpy/i").first.click()
    time.sleep(16)

    # Before running: CalcSheet should NOT show cooling data (phase != complete)
    pg.locator("button", has_text="Add Na").click()

    # Poll for completion (T2 hits 32.1, phase complete) instead of fixed sleep
    deadline = time.time() + 15
    done = False
    while time.time() < deadline:
        body = pg.locator("body").inner_text()
        if "32.1" in body and "rising" not in body:
            done = True
            break
        time.sleep(0.5)
    check("run completed (T2 = 32.1, not rising)", done)

    pg.locator("button", has_text="Show Calculations").click()
    time.sleep(1)

    # Readings table present with a × at the mixing time
    table = pg.locator("[data-testid=cooling-table]")
    check("readings table rendered", table.count() == 1)
    ttext = table.inner_text() if table.count() else ""
    check("no reading at t=150 (×)", "×" in ttext)
    check("pre-mix readings at T1=22.0", ttext.count("22.0") >= 5, f"count {ttext.count('22.0')}")
    check("first post-mix reading (t=180) = 32.1", "32.1" in ttext)

    # Curve SVG: 14 point marks (15 timestamps minus the null at 150)
    npts = pg.locator("[data-testid=cooling-point]").count()
    check("14 plotted points", npts == 14, f"got {npts}")
    check("fit line present", pg.locator("[data-testid=cooling-fit]").count() == 1)
    check("extrapolation segment present", pg.locator("[data-testid=cooling-extrap]").count() == 1)

    # Extrapolated temperature = Tmix = 32.1 + 0.02*30 = 32.7
    lbl = pg.locator("[data-testid=cooling-textrap]").text_content()
    m = re.search(r"([0-9.]+)", lbl)
    tex = float(m.group(1)) if m else -1
    check("extrapolated T = 32.7", abs(tex - 32.7) < 0.05, f"got {tex}")

    # Corrected ΔH block: ΔT_corr 10.7, ΔH_corr ≈ -22.5 (vs uncorrected -21.2)
    corr = pg.locator("[data-testid=cooling-corrected]").inner_text()
    check("corrected ΔT = 10.7", "10.7" in corr)
    m = re.search(r"= (-[0-9.]+) kJ", corr)
    dh = float(m.group(1)) if m else 0
    check("corrected ΔH ≈ -22.5", abs(dh + 22.5) < 0.15, f"got {dh}")
    check("mentions data-book value", "23.0" in corr)

    snap(pg, "cooling-calc.png")

    # Reset → cooling section disappears (phase back to setup)
    pg.mouse.click(30, 30)  # click backdrop to close CalcSheet
    time.sleep(0.5)
    pg.locator("button", has_text="Reset").first.click()
    time.sleep(0.5)
    pg.locator("button", has_text="Show Calculations").count()  # may be hidden now
    if pg.locator("button", has_text="Show Calculations").count():
        pg.locator("button", has_text="Show Calculations").click()
        time.sleep(0.5)
        check("cooling table gone after reset", pg.locator("[data-testid=cooling-table]").count() == 0)
    else:
        check("calc button hidden after reset (ΔT=0)", True)

    b.close()

sys.exit(1 if fails else 0)
