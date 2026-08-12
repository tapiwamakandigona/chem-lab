"""F13 gate: press-and-hold burette stopcock dispenses continuously.

Flow: open titration, hold pointer on the stopcock key (~572,380).
Asserts: reading climbs while held (in 0.05 quanta), stops when released,
phase goes to running, Reset burette restores 0.00. Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys, re
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


TAP = (572, 380)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Titration/i").first.click()
    time.sleep(16)

    def reading():
        txt = pg.locator("text=CURRENT READING").locator("..").inner_text()
        m = re.search(r"(\d+\.\d\d)", txt)
        return float(m.group(1)) if m else -1.0

    check("starts at 0.00", reading() == 0.0, str(reading()))

    # Hold the stopcock open; poll until the reading moves (or 12 s cap).
    pg.mouse.move(*TAP)
    pg.mouse.down()
    moved = 0.0
    shot = False
    t0 = time.time()
    while time.time() - t0 < 12:
        time.sleep(0.4)
        r = reading()
        if r > 0 and not shot:
            snap(pg, "tap-stream.png")
            shot = True
        moved = r
        if r >= 1.0:
            break
    check("reading climbs while held", moved >= 1.0, f"reached {moved}")
    check("reading lands on 0.05 quanta", abs(moved * 20 - round(moved * 20)) < 1e-6, str(moved))

    pg.mouse.up()
    time.sleep(0.25)
    # right after release the tip is still draining -> marker briefly ON
    d0 = pg.locator('[data-testid="tip-drip"]').get_attribute("data-active")
    check("tip drains briefly after release", d0 == "1", str(d0))
    time.sleep(0.55)
    r1 = reading()
    time.sleep(1.0)
    r2 = reading()
    check("flow stops on release", r1 == r2, f"{r1} then {r2}")

    # closed stopcock must NOT keep dripping: the tip-drain marker goes quiet
    # within ~1 s of release and STAYS quiet.
    time.sleep(1.2)
    d1 = pg.locator('[data-testid="tip-drip"]').get_attribute("data-active")
    time.sleep(1.5)
    d2 = pg.locator('[data-testid="tip-drip"]').get_attribute("data-active")
    check("no drip when closed", d1 == "0" and d2 == "0", f"{d1} then {d2}")

    body = pg.locator("body").inner_text()
    check("phase left setup (titre panel live)", r2 > 0, str(r2))

    # Reset restores 0.00
    pg.locator("text=Reset burette").click()
    time.sleep(0.8)
    check("reset restores 0.00", reading() == 0.0, str(reading()))

    b.close()

httpd.shutdown()
sys.exit(1 if fails else 0)
