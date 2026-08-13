"""WebGL context-loss fallback gate."""
import functools
import http.server
import os
from pathlib import Path
import socketserver
import sys
import threading

from playwright.sync_api import sync_playwright

DIST = os.environ.get("CHEMLAB_DIST", str(Path(__file__).resolve().parents[2] / "dist"))
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
os.makedirs(SHOTS, exist_ok=True)
TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))
SHOT_TIMEOUT_MS = int(os.environ.get("CHEMLAB_SHOT_TIMEOUT_MS", str(TIMEOUT_MS)))
PORT = 8797


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=f"{SHOTS}/{name}", timeout=SHOT_TIMEOUT_MS)
        print(f"shot: {name}", flush=True)
    except Exception as error:  # noqa: BLE001 — evidence only
        print(f"shot SKIPPED {name}: {str(error)[:80]}", flush=True)


h = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" {detail}" if detail else ""), flush=True)
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.set_default_timeout(TIMEOUT_MS)
    page.add_init_script(
        "try { localStorage.setItem('chemlab-quality', 'low') } catch (e) {}"
    )
    page.goto(f"http://127.0.0.1:{PORT}/practical/titration", wait_until="load")
    page.wait_for_selector("canvas")
    # The app attaches its contextlost listener in R3F onCreated — after the
    # WebGL context initialises, which on starved SwiftShader runners can lag
    # well behind canvas insertion. A real context loss can only happen after
    # a context exists, so re-dispatching until the listener is live races
    # nothing in the product; same assertion (context loss -> fallback UI).
    fallback = page.locator('[data-testid="webgl-fallback"]')
    deadline_ms = TIMEOUT_MS * 3
    waited = 0
    while waited < deadline_ms:
        page.locator("canvas").first.dispatch_event("webglcontextlost")
        try:
            fallback.wait_for(timeout=5000)
            break
        except Exception:  # noqa: BLE001 — listener not attached yet; retry
            waited += 5000
    fallback.wait_for(timeout=TIMEOUT_MS)
    check("context loss produces an explicit fallback", fallback.is_visible())
    check("fallback protects progress and points to non-3D tools",
          "progress is safe" in fallback.inner_text().lower()
          and "mock papers" in fallback.inner_text().lower())
    check("fallback has a touch-sized recovery action",
          fallback.get_by_role("button", name="Reload practical").bounding_box()["height"] >= 44)
    check("phone fallback has no horizontal overflow",
          page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
    snap(page, "webgl-fallback-mobile.png")
    browser.close()

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"), flush=True)
sys.exit(1 if fails else 0)

