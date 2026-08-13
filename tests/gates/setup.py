"""Hands-on titration apparatus-setup gate.

Checks opt-in compatibility, ordered manual placement, chemistry interlock,
reset, keyboard/touch-sized controls and 390x844 fit.
"""
import functools
import http.server
import os
from pathlib import Path
import socketserver
import sys
import threading
import time

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
    browser = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.set_default_timeout(TIMEOUT_MS)
    page.add_init_script(
        "try { localStorage.setItem('chemlab-quality', 'low') } catch (e) {}"
    )
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
    page.get_by_text("Titration", exact=False).first.click()
    page.locator('[data-testid="setup-mode-toggle"]').wait_for()
    time.sleep(3)

    check("normal mode remains default",
          page.locator('[data-testid="setup-mode-toggle"]').get_attribute("aria-pressed") == "false")
    reading = page.locator("text=Current reading").locator("..").inner_text()
    page.get_by_role("button", name="0.05", exact=True).click()
    check("normal mode still dispenses",
          page.locator("text=Current reading").locator("..").inner_text() != reading)
    page.locator('[data-testid="titration-reset"]').click()
    page.locator('[data-testid="titration-reset"]').click()

    page.locator('[data-testid="setup-mode-toggle"]').click()
    check("hands-on panel opens", page.locator('[data-testid="setup-panel"]').count() == 1)
    check("five ordered setup steps",
          page.locator('[data-testid^="setup-step-"]').count() == 5)
    dispense = page.get_by_role("button", name="0.05", exact=True)
    check("chemistry locked before valid assembly", dispense.is_disabled())

    # Real pointer path: an off-target drop must spring back and explain why;
    # a drop centred in the bench target magnetically places the first part.
    drag = page.locator('[data-testid="setup-drag-part"]')
    drag_box = drag.bounding_box()
    page.mouse.move(drag_box["x"] + drag_box["width"] / 2,
                    drag_box["y"] + drag_box["height"] / 2)
    page.mouse.down()
    page.mouse.move(20, 700, steps=12)
    page.mouse.up()
    check("off-target drag is rejected",
          "Not aligned" in page.locator('[data-testid="setup-drag-feedback"]').inner_text())
    check("off-target drag does not place stand",
          page.locator('[data-testid="setup-step-stand"]').get_attribute("data-done") == "0")

    drag_box = drag.bounding_box()
    zone = page.locator('[data-testid="setup-drop-zone"]').bounding_box()
    page.mouse.move(drag_box["x"] + drag_box["width"] / 2,
                    drag_box["y"] + drag_box["height"] / 2)
    page.mouse.down()
    page.mouse.move(zone["x"] + zone["width"] / 2,
                    zone["y"] + zone["height"] / 2, steps=18)
    page.mouse.up()
    check("aligned drag places stand",
          page.locator('[data-testid="setup-step-stand"]').get_attribute("data-done") == "1")

    for part in ["clamp", "burette", "tile", "flask"]:
        next_button = page.locator('[data-testid="setup-place-next"]')
        check(f"next part is {part}", part in next_button.inner_text().lower(),
              next_button.inner_text())
        next_button.click()
        if part != "flask":
            check(f"{part} step snaps complete",
                  page.locator(f'[data-testid="setup-step-{part}"]').get_attribute("data-done") == "1")

    check("valid assembly reports ready", page.locator('[data-testid="setup-ready"]').count() == 1)
    check("valid assembly unlocks chemistry", not dispense.is_disabled())
    before = page.locator("text=Current reading").locator("..").inner_text()
    dispense.click()
    after = page.locator("text=Current reading").locator("..").inner_text()
    check("assembled bench dispenses", before != after, f"{before} -> {after}")
    snap(page, "setup-ready-desktop.png")

    page.locator('[data-testid="setup-ready-reset"]').click()
    check("reset clears every placed part", all(
        page.locator(f'[data-testid="setup-step-{part}"]').get_attribute("data-done") == "0"
        for part in ["stand", "clamp", "burette", "tile", "flask"]
    ))

    page.set_viewport_size({"width": 390, "height": 844})
    time.sleep(0.3)
    panel = page.locator('[data-testid="setup-panel"]').bounding_box()
    button = page.locator('[data-testid="setup-place-next"]').bounding_box()
    check("mobile setup panel fits width",
          panel is not None and panel["x"] >= 0 and panel["x"] + panel["width"] <= 390,
          str(panel))
    check("mobile place control is touch sized",
          button is not None and button["height"] >= 44, str(button))
    check("mobile setup has no horizontal overflow",
          page.evaluate("() => document.documentElement.scrollWidth <= innerWidth"))
    snap(page, "setup-mobile.png")

    # Short landscape phones must retain reachable setup actions.
    page.set_viewport_size({"width": 844, "height": 390})
    page.locator('[data-testid="setup-place-next"]').scroll_into_view_if_needed()
    landscape_button = page.locator('[data-testid="setup-place-next"]').bounding_box()
    check("landscape setup control stays reachable",
          landscape_button is not None
          and landscape_button["y"] >= 0
          and landscape_button["y"] + landscape_button["height"] <= 390,
          str(landscape_button))
    check("landscape setup has no horizontal overflow",
          page.evaluate("() => document.documentElement.scrollWidth <= innerWidth"))
    snap(page, "setup-landscape.png")

    # Reduced-motion users get immediate settle rather than the spring/snap.
    reduced = browser.new_page(
        viewport={"width": 390, "height": 844},
        reduced_motion="reduce",
    )
    reduced.set_default_timeout(TIMEOUT_MS)
    reduced.add_init_script(
        "try { localStorage.setItem('chemlab-quality', 'low') } catch (e) {}"
    )
    reduced.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
    reduced.get_by_text("Titration", exact=False).first.click()
    reduced.locator('[data-testid="setup-mode-toggle"]').click()
    reduced.locator('[data-testid="setup-place-next"]').click()
    check("reduced-motion placement settles immediately",
          reduced.locator('[data-testid="setup-step-stand"]').get_attribute("data-done") == "1")
    reduced.close()
    browser.close()

httpd.shutdown()
print(("GATE PASS" if not fails else f"GATE FAIL: {fails}"), flush=True)
sys.exit(0 if not fails else 1)
