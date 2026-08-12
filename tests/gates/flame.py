"""F29 gate: flame-test identification with contamination-safe technique.

Checks:
menu card -> FT3 potassium default -> direct dirty-loop test is sodium-yellow
and earns identity-only 1/2 -> reset -> acid clean -> blank must be confirmed
before sample can load -> clean FT3 is lilac -> K + evidence scores 2/2 ->
guide 5/5 -> dirty-loop cobalt glass reveals underlying lilac -> switching to
FT2 resets state -> clean FT2 is intense yellow -> mobile 390x844 controls
remain tappable. Exit 1 on any failure.
"""
import functools
import http.server
import os
import socketserver
import sys
import threading
import time

from playwright.sync_api import sync_playwright

import os
DIST = os.environ.get("CHEMLAB_DIST", "/work/build/chemlab/main/dist")
SHOTS = os.environ.get("CHEMLAB_SHOTS", "/work/build/chemlab/shots")
os.makedirs(SHOTS, exist_ok=True)

TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))


def snap(page, name):
    """Best-effort evidence screenshot — never fails the gate."""
    try:
        page.screenshot(path=SHOTS + "/" + name, timeout=TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as e:  # noqa: BLE001 — evidence only, assertions gate
        print("shot SKIPPED " + name + ": " + str(e)[:80], flush=True)


DIST = os.environ.get("CHEMLAB_DIST", DIST)
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


def clean_and_observe(pg):
    pg.locator('[data-testid="flame-acid"]').click()
    pg.locator('[data-testid="flame-blank"]').click()
    blank = pg.locator('[data-testid="flame-blank"]')
    check("blank requires learner confirmation", blank.is_enabled() and "confirm" in blank.inner_text())
    blank.click()
    pg.locator('[data-testid="flame-load"]').click()
    pg.locator('[data-testid="flame-observe"]').click()


with sync_playwright() as p:
    b = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.set_default_timeout(TIMEOUT_MS)
    pg.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)

    card = pg.locator("button", has_text="Flame Tests")
    check("menu shows flame-test card", card.count() >= 1)
    card.first.click()
    pg.wait_for_selector('[data-testid="flame-acid"]', timeout=30000)
    time.sleep(3)
    check(
        "FT 3 potassium selected by default",
        "border-lab-accent" in (
            pg.locator('[data-testid="flame-unknown-ft3"]').get_attribute("class") or ""
        ),
    )

    # Dirty-loop free-exploration path: yellow masking is visible but not
    # acceptable practical evidence.
    pg.locator('[data-testid="flame-load"]').click()
    pg.locator('[data-testid="flame-observe"]').click()
    obs = pg.locator('[data-testid="flame-observations"]').inner_text()
    check("dirty loop gives masked sodium yellow", "intense yellow" in obs and "masks" in obs, obs)
    pg.locator('[data-testid="flame-answer"]').select_option("K")
    pg.locator('[data-testid="flame-submit"]').click()
    result = pg.locator('[data-testid="flame-result"]')
    check(
        "dirty observation earns identity only",
        result.get_attribute("data-score") == "1" and result.get_attribute("data-ok") == "0",
    )
    check("feedback requires clean-loop evidence", "no clean-loop observation" in result.inner_text())

    # Correct technique, and loading must stay locked until blank confirmed.
    pg.locator('[data-testid="flame-reset"]').click()
    pg.locator('[data-testid="flame-acid"]').click()
    pg.locator('[data-testid="flame-blank"]').click()
    check("sample locked before blank confirmation", pg.locator('[data-testid="flame-load"]').is_disabled())
    check("blank observation states colourless", "no persistent colour" in pg.locator('[data-testid="flame-blank"]').inner_text())
    pg.locator('[data-testid="flame-blank"]').click()
    pg.locator('[data-testid="flame-load"]').click()
    pg.locator('[data-testid="flame-observe"]').click()
    obs = pg.locator('[data-testid="flame-observations"]').inner_text()
    check("clean FT3 gives lilac", "lilac" in obs and "potassium emission" in obs, obs)
    snap(pg, "flame-lilac.png")
    pg.locator('[data-testid="flame-answer"]').select_option("K")
    pg.locator('[data-testid="flame-submit"]').click()
    check(
        "clean potassium identification scores 2/2",
        result.get_attribute("data-score") == "2" and result.get_attribute("data-ok") == "1",
    )
    check("result names potassium", "potassium" in result.inner_text() and "lilac" in result.inner_text())

    # Guide completed.
    steps = pg.locator('[data-testid="guide-step"]')
    if steps.count() == 0:
        pg.locator('[data-testid="guide-toggle"]').click()
        time.sleep(0.2)
        steps = pg.locator('[data-testid="guide-step"]')
    done_steps = sum(
        1 for i in range(steps.count())
        if steps.nth(i).get_attribute("data-done") == "1"
    )
    check("guide finished 5/5", steps.count() == 5 and done_steps == 5, f"{done_steps}/{steps.count()}")

    # Cobalt glass diagnostic path on a dirty loop reveals the weaker sample
    # behind sodium contamination (but is still not clean-procedure evidence).
    pg.locator('[data-testid="flame-reset"]').click()
    pg.locator('[data-testid="flame-load"]').click()
    pg.locator('[data-testid="flame-cobalt"]').click()
    pg.locator('[data-testid="flame-observe"]').click()
    obs = pg.locator('[data-testid="flame-observations"]').inner_text()
    check("cobalt glass reveals dirty-loop potassium", "lilac" in obs and "cobalt glass" in obs, obs)

    # Switching unknown resets and sodium's true clean colour remains yellow.
    pg.locator('[data-testid="flame-unknown-ft2"]').click()
    check("switch unknown resets observations", "no observation yet" in pg.locator('[data-testid="flame-observations"]').inner_text())
    clean_and_observe(pg)
    obs = pg.locator('[data-testid="flame-observations"]').inner_text()
    check("clean FT2 gives intense yellow", "intense yellow" in obs and "sodium emission" in obs, obs)
    snap(pg, "flame-sodium.png")

    # Mobile: bottom sheet is usable and first actions are tappable.
    pg2 = b.new_page(
        viewport={"width": 390, "height": 844},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    )
    pg2.route("**/*", lambda r: r.continue_() if "127.0.0.1" in r.request.url else r.abort())
    pg2.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="load")
    time.sleep(2)
    pg2.locator("button", has_text="Flame Tests").first.click()
    pg2.wait_for_selector('[data-testid="flame-acid"]', timeout=30000)
    time.sleep(2)
    pg2.locator('[data-testid="flame-acid"]').click()
    check("mobile acid-clean starts", pg2.locator('[data-testid="flame-blank"]').is_enabled())
    snap(pg2, "flame-mobile.png")

    b.close()

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"))
sys.exit(1 if fails else 0)
