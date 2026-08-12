"""F11 gate: drag-to-pour mixes & starts the clock reaction.

Real pointer drag: grab the Na2S2O3 beaker (left bench), drag onto the
reaction beaker, release. Asserts the reaction starts (running UI state,
timer advancing) and that reset returns to setup so the button path still
works. Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys
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
    pg.locator("text=/Iodine Clock/i").first.click()
    time.sleep(16)

    body = pg.locator("body").inner_text()
    check("starts in setup", "Mix & start" in body)

    # Pick the slowest concentration (0.020 M -> 200 s sim endpoint = 40 s
    # real at 5x) so SwiftShader screenshot stalls (~5-7 s real each) can't
    # run the reaction to completion before the "Reacting" assertion. The
    # assertions themselves are unchanged.
    pg.locator("button", has_text="0.020").click()
    time.sleep(0.3)

    # drag beaker (left) onto reaction beaker (centre)
    pg.mouse.move(110, 440)
    pg.mouse.down()
    for x, y in [(200, 430), (320, 420), (450, 410), (560, 405), (615, 415)]:
        pg.mouse.move(x, y, steps=4)
        time.sleep(0.05)
    snap(pg, "pour-drag.png")
    pg.mouse.up()
    time.sleep(0.9)
    snap(pg, "pour-stream.png")
    time.sleep(1.5)

    body = pg.locator("body").inner_text()
    running = "Reacting" in body or "cross gone" in body
    check("drag-to-pour started reaction", running, "" if running else body[:200].replace("\n", " "))

    time.sleep(1.0)
    body2 = pg.locator("body").inner_text()
    check("timer advancing", running and body2 != body)

    # reset -> setup again, button path intact
    pg.locator("button", has_text="Reset").click()
    time.sleep(0.5)
    body3 = pg.locator("body").inner_text()
    check("reset returns to setup", "Mix & start" in body3)

    b.close()

httpd.shutdown()
sys.exit(1 if fails else 0)
