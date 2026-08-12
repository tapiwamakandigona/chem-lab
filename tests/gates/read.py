"""F16 gate: "read the burette yourself" endpoint check.

Drives S22 titration to the endpoint (23.85), then asserts:
- numeric CURRENT READING and TITRE are masked (?.??)
- endpoint card shows a zoomed scale + input; no auto Record button
- wrong reading (24.15) rejected with feedback, titre NOT recorded
- non-0.05-quantum reading (23.84) rejected even though within 0.05
- third wrong attempt reveals the "Show me the reading" helper
- reveal fills the true value; Record accepts -> Run 1 = 23.85,
  initial reading becomes 23.85, card disappears, mask lifts
Exit 1 on any failure.
"""
import http.server, socketserver, threading, functools, time, sys
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


with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg.locator("text=/Titration/i").first.click()
    time.sleep(16)

    # drive to endpoint: 4x5 + 3x1 + 8x0.10 + 1x0.05 = 23.85
    for _ in range(4):
        pg.locator("button", has_text="5 cm³").click(); time.sleep(0.3)
    for _ in range(3):
        pg.locator("button", has_text="1 cm³").click(); time.sleep(0.25)
    for _ in range(8):
        pg.locator("button", has_text="0.10").click(); time.sleep(0.2)
    pg.locator("button", has_text="0.05").click()
    time.sleep(1.5)

    body = pg.locator("body").inner_text()
    cur = pg.locator("text=CURRENT READING").locator("..").inner_text()
    check("current reading masked", "?.??" in cur, cur.replace("\n", " "))
    check("endpoint card visible", pg.locator('[data-testid="endpoint-read-card"]').count() == 1)
    check("zoomed scale present", pg.locator('[data-testid="endpoint-scale"]').count() == 1)
    check("no auto record button", "Record & Refill" not in body)
    # scale must NOT leak the answer into the DOM
    leak = pg.locator('[data-testid="endpoint-scale"]').get_attribute("data-target")
    check("scale does not leak value", leak is None, str(leak))

    def submit(val):
        pg.fill('[data-testid="burette-read-input"]', val)
        pg.click('[data-testid="burette-read-check"]')
        time.sleep(0.6)

    # wrong #1: off by 0.30
    submit("24.15")
    check("wrong value rejected", pg.locator('[data-testid="burette-read-feedback"]').count() == 1)
    check("titre not recorded after wrong", "Run 1" not in pg.locator("body").inner_text())

    # wrong #2: within 0.05 but not a 0.05 quantum
    submit("23.84")
    check("non-quantum value rejected", pg.locator('[data-testid="burette-read-feedback"]').count() == 1)

    # wrong #3 -> reveal appears
    submit("9.99")
    check("reveal appears after 3 misses", pg.locator('[data-testid="burette-read-reveal"]').count() == 1)

    pg.screenshot(path=SHOTS + "/read-endpoint.png")
    print("shot: read-endpoint.png", flush=True)

    # reveal fills the true value; Record accepts it
    pg.click('[data-testid="burette-read-reveal"]')
    time.sleep(0.3)
    filled = pg.input_value('[data-testid="burette-read-input"]')
    check("reveal fills 23.85", filled == "23.85", filled)
    pg.click('[data-testid="burette-read-check"]')
    time.sleep(1.0)

    body3 = pg.locator("body").inner_text()
    check("titre recorded", "Run 1" in body3 and "23.85" in body3)
    check("card gone after record", pg.locator('[data-testid="endpoint-read-card"]').count() == 0)
    init = pg.locator("text=INITIAL READING").locator("..").inner_text()
    check("initial reading now 23.85", "23.85" in init, init.replace("\n", " "))
    cur2 = pg.locator("text=CURRENT READING").locator("..").inner_text()
    check("mask lifted after record", "?.??" not in cur2, cur2.replace("\n", " "))

    # --- mobile pass (390x844): card usable on phones ---
    pgm = b.new_page(viewport={"width": 390, "height": 844})
    pgm.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pgm.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pgm.locator("text=/Titration/i").first.click()
    time.sleep(16)
    for _ in range(4):
        pgm.locator("button", has_text="5 cm³").click(); time.sleep(0.3)
    for _ in range(3):
        pgm.locator("button", has_text="1 cm³").click(); time.sleep(0.25)
    for _ in range(8):
        pgm.locator("button", has_text="0.10").click(); time.sleep(0.2)
    pgm.locator("button", has_text="0.05").click()
    time.sleep(1.5)
    card = pgm.locator('[data-testid="endpoint-read-card"]')
    check("mobile: endpoint card visible", card.count() == 1)
    box = card.bounding_box() if card.count() else None
    check("mobile: card fits viewport", bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390 and box["y"] + box["height"] <= 844, str(box))
    pgm.fill('[data-testid="burette-read-input"]', "23.85")
    pgm.screenshot(path=SHOTS + "/read-mobile.png")
    print("shot: read-mobile.png", flush=True)
    pgm.click('[data-testid="burette-read-check"]')
    time.sleep(1.0)
    check("mobile: titre recorded", "23.85" in pgm.locator("body").inner_text() and pgm.locator('[data-testid="endpoint-read-card"]').count() == 0)

    b.close()

sys.exit(1 if fails else 0)
