"""F4 gate: enthalpy — physical ΔT model, live calc correctness, completion."""
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

    pg.locator("button", has_text="Add Na").click()
    time.sleep(3)
    snap(pg, "f4-mid.png")
    time.sleep(5)  # animation is 5 s total
    body = pg.locator("body").inner_text()

    # Expected: n=0.05, ΔT=0.92*(0.05*23000)/(4.2*25)=10.07..10.1, T2≈32.1
    m = re.search(r"ΔT[\s\S]{0,30}?= ([0-9.]+) °C", body)
    dT = float(m.group(1)) if m else -1
    check("ΔT ≈ 10.1 °C", abs(dT - 10.1) < 0.15, f"got {dT}")
    m = re.search(r"= ([0-9.]+) J", body)
    q = float(m.group(1)) if m else -1
    check("q = V·c·ΔT consistent", abs(q - 25 * 4.2 * dT) < 2, f"got {q}")
    m = re.search(r"= (-?[0-9.]+) kJ mol", body)
    dH = float(m.group(1)) if m else 0
    check("ΔH ≈ -21.2 kJ/mol (exothermic)", dH < 0 and abs(dH + 21.2) < 0.5, f"got {dH}")
    check("T2 field ≈ 32.1", bool(re.search(r"32\.[01]", body)))
    snap(pg, "f4-done.png")
    b.close()

sys.exit(1 if fails else 0)
