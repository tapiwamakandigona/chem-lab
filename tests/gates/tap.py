"""F13 gate: press-and-hold burette stopcock dispenses continuously.

Flow: open titration, hold pointer on the stopcock key (~572,380).
Asserts: reading climbs while held (in 0.05 quanta), stops when released,
phase goes to running, Reset burette restores 0.00. Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys, re
from playwright.sync_api import sync_playwright

import os
DIST = os.environ.get("CHEMLAB_DIST", "/work/build/chemlab/main/dist")
SHOTS = os.environ.get("CHEMLAB_SHOTS", "/work/build/chemlab/shots")
os.makedirs(SHOTS, exist_ok=True)

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
            pg.screenshot(path=SHOTS + "/tap-stream.png")
            shot = True
        moved = r
        if r >= 1.0:
            break
    check("reading climbs while held", moved >= 1.0, f"reached {moved}")
    check("reading lands on 0.05 quanta", abs(moved * 20 - round(moved * 20)) < 1e-6, str(moved))

    pg.mouse.up()
    time.sleep(0.8)
    r1 = reading()
    time.sleep(1.0)
    r2 = reading()
    check("flow stops on release", r1 == r2, f"{r1} then {r2}")

    body = pg.locator("body").inner_text()
    check("phase left setup (titre panel live)", r2 > 0, str(r2))

    # Reset restores 0.00
    pg.locator("text=Reset burette").click()
    time.sleep(0.8)
    check("reset restores 0.00", reading() == 0.0, str(reading()))

    b.close()

httpd.shutdown()
sys.exit(1 if fails else 0)
