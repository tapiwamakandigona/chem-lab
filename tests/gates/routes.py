"""Route/deep-link and zero-3D launcher gate.

Checks all 14 practical routes, guide/mocks doors, browser Back/Forward,
route-specific static metadata, sitemap coverage and that the launcher does
not request the lazy rendering engine before a practical opens.
"""
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


class RouteHandler(http.server.SimpleHTTPRequestHandler):
    """Static-host semantics: directory index plus root SPA fallback."""

    def translate_path(self, path):
        translated = super().translate_path(path)
        if os.path.isdir(translated):
            index = os.path.join(translated, "index.html")
            if os.path.exists(index):
                return index
        if not os.path.exists(translated):
            return os.path.join(DIST, "index.html")
        return translated


h = functools.partial(RouteHandler, directory=DIST)
socketserver.TCPServer.allow_reuse_address = True
httpd = socketserver.TCPServer(("", PORT), h)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
fails = []


def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + (f" {detail}" if detail else ""), flush=True)
    if not cond:
        fails.append(name)


practicals = [
    "titration", "clock", "enthalpy", "qual", "grav", "gas", "organic",
    "electro", "chroma", "flame", "distill", "solubility", "peroxide", "iodine-rate",
]

with sync_playwright() as p:
    browser = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    page.set_default_timeout(TIMEOUT_MS)
    page.add_init_script(
        "try { localStorage.setItem('chemlab-quality', 'low') } catch (e) {}"
    )
    requests = []
    page.on("request", lambda request: requests.append(request.url))
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")

    engine_requests = [u for u in requests if "LabViewport-" in u or "vendor-r3f" in u or "vendor-three" in u]
    check("launcher does not request rendering engine", not engine_requests, str(engine_requests))
    check("launcher exposes mocks door", page.locator('[data-testid="mocks-open"]').is_visible())
    check("first-visit guide button hides empty counter",
          "0/19" not in page.locator('[data-testid="course-open"]').inner_text())

    page.locator('[data-testid="mocks-open"]').click()
    page.wait_for_selector('[data-testid="mocks-page"]')
    check("mocks route is addressable", page.url.endswith("/mocks"), page.url)
    check("all three mocks have visible doors",
          page.locator('[data-testid^="mock-library-"]').count() == 3)
    snap(page, "mocks-route.png")
    page.go_back(wait_until="domcontentloaded")
    page.wait_for_selector('[data-testid="landing-page"]')
    check("browser Back returns to launcher", page.url.rstrip("/").endswith(f":{PORT}"), page.url)

    page.locator('[data-testid="hero-course-cta"]').click()
    page.wait_for_selector('[data-testid="course-panel"]')
    check("guide route is addressable", page.url.endswith("/guide"), page.url)
    page.go_back(wait_until="domcontentloaded")
    page.wait_for_selector('[data-testid="landing-page"]')

    # One real launcher transition proves pushState; direct-load every route
    # below proves independently shareable/static-host entry points.
    page.locator('[data-testid="experiment-titration"]').click()
    page.wait_for_selector('[data-testid="titration-hold-control"]')
    check("practical selection updates URL",
          page.url.endswith("/practical/titration"), page.url)
    check("rendering engine loads only after practical opens",
          any("LabViewport-" in u for u in requests))
    page.go_back(wait_until="domcontentloaded")
    page.wait_for_selector('[data-testid="landing-page"]')
    page.go_forward(wait_until="domcontentloaded")
    page.wait_for_selector('[data-testid="titration-hold-control"]')
    check("browser Forward restores practical",
          page.url.endswith("/practical/titration"), page.url)
    page.close()

    # Direct deep-link check for every practical without retaining concurrent
    # WebGL canvases: each new navigation replaces the old page.
    deep = browser.new_page(viewport={"width": 390, "height": 844})
    deep.set_default_timeout(TIMEOUT_MS)
    deep.add_init_script(
        "try { localStorage.setItem('chemlab-quality', 'low') } catch (e) {}"
    )
    for practical in practicals:
        response = deep.goto(
            f"http://127.0.0.1:{PORT}/practical/{practical}",
            wait_until="domcontentloaded",
        )
        check(f"deep link {practical} serves HTML",
              response is not None and response.status == 200)
        deep.wait_for_selector('[data-testid="gfx-root"]')
        check(f"deep link {practical} sets canonical",
              deep.locator('link[rel="canonical"]').get_attribute("href")
              == f"https://chemlab.tapiwa.me/practical/{practical}")
        deep.goto("about:blank")
    deep.close()
    browser.close()

sitemap = Path(DIST, "sitemap.xml").read_text()
# root + guide + mocks + teach + join + 14 practicals. Asserting the exact
# count (not >=) is deliberate: it catches a route added to the app but forgotten
# in the generator, which is how a deep link silently becomes a 404 for crawlers.
check("sitemap has root, guide, mocks, teach, join and 14 practicals",
      sitemap.count("<loc>") == 19, str(sitemap.count("<loc>")))
check("classroom routes are indexable",
      all(f"<loc>https://chemlab.tapiwa.me{route}</loc>" in sitemap
          for route in ("/teach", "/join")))
check("sitemap lists every practical",
      all(f"<loc>https://chemlab.tapiwa.me/practical/{p}</loc>" in sitemap for p in practicals))
check("static route HTML carries specific metadata",
      "Acid-Base &amp; Redox Titration — ChemLab"
      in Path(DIST, "practical", "titration", "index.html").read_text())

httpd.shutdown()
print("GATE " + ("FAIL" if fails else "PASS"), flush=True)
sys.exit(1 if fails else 0)
