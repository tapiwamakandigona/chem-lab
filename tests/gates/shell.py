"""HTML-shell and unknown-route gate.

Asserts a useful branded first paint exists before JavaScript, the current
first-visit transfer claim is honest, and unknown routes render a real 404
surface with noindex metadata and a working return action.
"""
import functools
import http.server
import mimetypes
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


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=SHOT_TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


PORT = 8797


class SpaHandler(http.server.SimpleHTTPRequestHandler):
    """Mirror the production static host's unknown-path SPA fallback."""

    def translate_path(self, path):
        translated = super().translate_path(path)
        if not os.path.exists(translated):
            return os.path.join(DIST, "index.html")
        return translated

    def guess_type(self, path):
        if path == os.path.join(DIST, "index.html"):
            return "text/html"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"


h = functools.partial(SpaHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (" " + detail if detail else ""), flush=True)
    if not cond:
        fails.append(name)


with sync_playwright() as p:
    browser = p.chromium.launch()

    # First paint with JavaScript disabled: this is what a slow connection sees
    # while the React bundle is still in flight.
    nojs = browser.new_context(java_script_enabled=False, viewport={"width": 390, "height": 844})
    page = nojs.new_page()
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
    boot = page.locator("#boot-status")
    check("boot status exists before JavaScript", boot.count() == 1 and boot.is_visible())
    text = boot.inner_text()
    check("boot copy names the offline-ready lab", "offline-ready lab" in text, text)
    check("boot copy states honest compressed transfer", "About 1 MB compressed" in text, text)
    box = page.locator(".boot-card").bounding_box()
    check(
        "boot card fits 390x844",
        bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390
        and box["y"] >= 0 and box["y"] + box["height"] <= 844,
        str(box),
    )
    snap(page, "shell-nojs-mobile.png")
    nojs.close()

    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.set_default_timeout(TIMEOUT_MS)
    response = page.goto(f"http://127.0.0.1:{PORT}/missing-practical", wait_until="load")
    # Static SPA hosts return the shell with HTTP 200, so the app must provide
    # an explicit soft-404 state and tell search engines not to index it.
    check("static host serves SPA fallback", response is not None and response.status == 200)
    page.wait_for_selector('[data-testid="not-found"]')
    check("unknown path renders 404 state", "This bench is empty." in page.locator("body").inner_text())
    check("unknown path title is explicit", page.title() == "Page not found — ChemLab", page.title())
    robots = page.locator('meta[name="robots"]').get_attribute("content")
    check("unknown path is noindex", robots == "noindex, nofollow", str(robots))
    check(
        "404 retains independent-product disclaimer",
        "Cambridge International is not affiliated with or responsible for this site."
        in page.locator("body").inner_text(),
    )
    home = page.locator('[data-testid="not-found-home"]')
    check("return action is a touch target", (home.bounding_box() or {}).get("height", 0) >= 44)
    check("return action targets canonical root", home.get_attribute("href") == "/")
    snap(page, "not-found-desktop.png")
    page.close()

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.set_default_timeout(TIMEOUT_MS)
    mobile.goto(f"http://127.0.0.1:{PORT}/unknown", wait_until="load")
    mobile.wait_for_selector('[data-testid="not-found"]')
    box = mobile.locator(".not-found__card").bounding_box()
    check(
        "404 card fits phone",
        bool(box) and box["x"] >= 0 and box["x"] + box["width"] <= 390
        and box["y"] >= 0 and box["y"] + box["height"] <= 844,
        str(box),
    )
    snap(mobile, "not-found-mobile.png")
    browser.close()

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"))
sys.exit(1 if fails else 0)
