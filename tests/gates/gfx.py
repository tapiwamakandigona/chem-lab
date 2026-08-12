"""Gate: graphics quality tiers (incl. ULTRA), zoom controls, landscape mobile.

Checks:
- menu shows all four quality buttons; ULTRA selectable
- gfx-root carries data-quality; ULTRA actually changes the rendered pixels
- quality choice persists across reload (localStorage)
- zoom-in/zoom-out buttons change the view and roughly invert each other
- wheel zoom works (dolly path)
- landscape phone (844x390): scene + key controls usable in titration and grav
"""
import functools
import http.server
import io
import os
import threading
import time

from playwright.sync_api import sync_playwright

DIST = os.environ.get("CHEMLAB_DIST", "/work/build/chemlab/main/dist")
SHOTS = os.environ.get("CHEMLAB_SHOTS", "/work/build/chemlab/shots")
os.makedirs(SHOTS, exist_ok=True)

PORT = 8797
FAILS = []


def check(name, ok, detail=""):
    print(("PASS" if ok else "FAIL"), name, detail)
    if not ok:
        FAILS.append(name)


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def png_diff(a_bytes, b_bytes):
    """Mean absolute pixel difference between two PNG screenshots (0-255)."""
    from PIL import Image, ImageChops, ImageStat
    a = Image.open(io.BytesIO(a_bytes)).convert("RGB")
    b = Image.open(io.BytesIO(b_bytes)).convert("RGB")
    if a.size != b.size:
        b = b.resize(a.size)
    return sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3.0


def canvas_shot(pg):
    return pg.locator("canvas").first.screenshot()


def main():
    srv = serve()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=[
            "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
        ])
        ctx = browser.new_context(viewport={"width": 1280, "height": 720})
        ctx.route("**/*", lambda route: route.continue_()
                  if "127.0.0.1" in route.request.url else route.abort())
        pg = ctx.new_page()
        pg.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
        time.sleep(1.5)

        # --- quality buttons on menu ---
        for q in ("low", "med", "high", "ultra"):
            check(f"menu has quality-{q}",
                  pg.locator(f'[data-testid="quality-{q}"]').count() == 1)

        # --- baseline: HIGH in titration ---
        pg.click('[data-testid="quality-high"]')
        pg.click('text=Acid-Base & Redox')
        pg.wait_for_selector('[data-testid="gfx-root"]')
        time.sleep(4)  # let the scene settle
        root_q = pg.locator('[data-testid="gfx-root"]').get_attribute("data-quality")
        check("gfx-root reports high", root_q == "high", str(root_q))
        shot_high = canvas_shot(pg)

        # --- switch to ULTRA (via menu) ---
        pg.click('text=← Menu')
        pg.click('[data-testid="quality-ultra"]')
        pg.click('text=Acid-Base & Redox')
        pg.wait_for_selector('[data-testid="gfx-root"][data-quality="ultra"]')
        time.sleep(4)
        shot_ultra = canvas_shot(pg)
        pg.screenshot(path=f"{SHOTS}/gfx-ultra.png")
        print("shot: gfx-ultra.png")
        d = png_diff(shot_high, shot_ultra)
        check("ultra changes rendered pixels", d > 0.5, f"mean diff {d:.2f}")

        # --- persistence across reload ---
        pg.reload(wait_until="networkidle")
        time.sleep(1.5)
        saved = pg.evaluate("localStorage.getItem('chemlab-quality')")
        check("quality persisted to localStorage", saved == "ultra", str(saved))
        ultra_btn = pg.locator('[data-testid="quality-ultra"]')
        cls = ultra_btn.get_attribute("class") or ""
        check("ultra still selected after reload", "text-lab-accent" in cls, cls[:60])

        # --- zoom buttons ---
        pg.click('text=Acid-Base & Redox')
        pg.wait_for_selector('[data-testid="zoom-in"]')
        time.sleep(3)
        before = canvas_shot(pg)
        for _ in range(3):
            pg.click('[data-testid="zoom-in"]')
        time.sleep(1.5)
        zoomed = canvas_shot(pg)
        d_in = png_diff(before, zoomed)
        check("zoom-in changes view", d_in > 1.0, f"mean diff {d_in:.2f}")
        for _ in range(3):
            pg.click('[data-testid="zoom-out"]')
        time.sleep(1.5)
        back = canvas_shot(pg)
        d_back = png_diff(before, back)
        check("zoom-out returns near start", d_back < d_in * 0.5,
              f"back diff {d_back:.2f} vs in diff {d_in:.2f}")

        # --- wheel zoom (pinch shares the dolly path) ---
        pg.mouse.move(450, 360)
        pg.mouse.wheel(0, -600)
        time.sleep(1.5)
        wheeled = canvas_shot(pg)
        d_wheel = png_diff(back, wheeled)
        check("wheel zoom changes view", d_wheel > 1.0, f"mean diff {d_wheel:.2f}")

        pg.close()

        # --- landscape phone: 844x390, titration + grav usable ---
        lctx = browser.new_context(viewport={"width": 844, "height": 390},
                                   is_mobile=True, has_touch=True)
        lctx.route("**/*", lambda route: route.continue_()
                   if "127.0.0.1" in route.request.url else route.abort())
        lp = lctx.new_page()
        lp.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
        time.sleep(1.5)
        lp.click('[data-testid="quality-med"]')
        lp.click('text=Acid-Base & Redox')
        lp.wait_for_selector('[data-testid="zoom-in"]')
        time.sleep(3)
        lp.screenshot(path=f"{SHOTS}/gfx-landscape-titration.png")
        print("shot: gfx-landscape-titration.png")
        # all four dispense buttons on-screen and NOT covered by the guide
        all_ok = True
        detail = []
        for label in ("5 cm\u00b3", "1 cm\u00b3", "0.10", "0.05"):
            b = lp.get_by_role("button", name=label).first
            bb = b.bounding_box()
            ok = (bb is not None and bb["x"] >= 0 and bb["x"] + bb["width"] <= 844
                  and bb["y"] + bb["height"] <= 390)
            if ok:
                # covered? click must reach the button, not an overlay
                mid = (bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
                top = lp.evaluate(
                    "([x, y]) => document.elementFromPoint(x, y)?.tagName", list(mid))
                ok = top == "BUTTON"
            all_ok = all_ok and ok
            detail.append(f"{label}:{'ok' if ok else bb}")
        check("landscape titration: dispense buttons usable", all_ok, " ".join(detail))
        check("landscape: guide starts collapsed",
              lp.locator('[data-testid="guide-panel"]').count() == 0)
        zb = lp.locator('[data-testid="zoom-in"]').bounding_box()
        check("landscape: zoom buttons on screen",
              zb is not None and zb["y"] + zb["height"] <= 390, str(zb))

        lp.click('text=← Menu')
        lp.click('text=Water of Crystallisation')
        lp.wait_for_selector('[data-testid="grav-weigh"]')
        time.sleep(2)
        lp.screenshot(path=f"{SHOTS}/gfx-landscape-grav.png")
        print("shot: gfx-landscape-grav.png")
        wb = lp.locator('[data-testid="grav-weigh"]').bounding_box()
        check("landscape grav: weigh button visible",
              wb is not None and wb["y"] + wb["height"] <= 390 and wb["x"] >= 0,
              str(wb))

        browser.close()
    srv.shutdown()
    if FAILS:
        print("GATE FAIL:", FAILS)
        raise SystemExit(1)
    print("GATE PASS")


if __name__ == "__main__":
    main()
