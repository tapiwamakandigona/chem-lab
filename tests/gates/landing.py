"""F33 gate: professional landing page.

Checks the marketing surface without weakening any experiment gate:
- truthful hero/proof/library counts and real product image
- primary CTA scrolls to a complete clickable 14-practical library
- learner course and graphics controls retain their established test ids
- FAQ/disclaimer and mobile navigation are keyboard/touch operable
- desktop, portrait and landscape have no horizontal overflow or clipped CTA
- reduced-motion preference disables animated scrolling
Exit 1 on any failure.
"""
import functools
import http.server
import os
import socketserver
import sys
import threading
import time
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

DIST = os.environ.get("CHEMLAB_DIST", str(Path(__file__).resolve().parents[2] / "dist"))
SHOTS = os.environ.get("CHEMLAB_SHOTS", str(Path(__file__).resolve().parents[2] / "test-results"))
TIMEOUT_MS = int(os.environ.get("CHEMLAB_TIMEOUT_MS", "30000"))
SHOT_TIMEOUT_MS = int(os.environ.get("CHEMLAB_SHOT_TIMEOUT_MS", str(TIMEOUT_MS)))

# CI probes force the LOW graphics preset (CHEMLAB_QUALITY=low): SwiftShader
# software rendering is far slower than any student device, and slow frames
# would delay clicks past timing-sensitive windows. No product assertion
# changes; gfx.py owns the quality-tier checks and never seeds this.
_QUALITY_SEED = os.environ.get("CHEMLAB_QUALITY", "")
if _QUALITY_SEED:
    from playwright.sync_api import Browser as _Browser, BrowserContext as _Ctx

    def _seeding(new_page):
        def wrapped(self, **kwargs):
            _pg = new_page(self, **kwargs)
            _pg.add_init_script(
                "try { localStorage.setItem('chemlab-quality', '%s') } catch (e) {}"
                % _QUALITY_SEED
            )
            return _pg
        return wrapped

    _Browser.new_page = _seeding(_Browser.new_page)
    _Ctx.new_page = _seeding(_Ctx.new_page)
PORT = 8797
os.makedirs(SHOTS, exist_ok=True)
ROOT = Path(DIST).parent

socketserver.TCPServer.allow_reuse_address = True
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
server = socketserver.TCPServer(("", PORT), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()

fails = []


def check(name, condition, detail=""):
    print(("PASS " if condition else "FAIL ") + name + (f" {detail}" if detail else ""), flush=True)
    if not condition:
        fails.append(name)


def snap(page, name, full_page=False):
    try:
        page.screenshot(path=os.path.join(SHOTS, name), full_page=full_page, timeout=SHOT_TIMEOUT_MS)
        print("shot: " + name, flush=True)
    except Exception as exc:  # evidence only
        print("shot SKIPPED " + name + ": " + str(exc)[:100], flush=True)


def metrics(page):
    return page.evaluate("""() => ({
        innerWidth,
        innerHeight,
        scrollWidth: document.querySelector('[data-testid="landing-page"]').scrollWidth,
        scrollHeight: document.querySelector('[data-testid="landing-page"]').scrollHeight,
    })""")


def box_is_in_view(page, selector):
    return page.locator(selector).evaluate("""el => {
        const r = el.getBoundingClientRect()
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight
    }""")


def intersects_view(page, selector):
    return page.locator(selector).evaluate("""el => {
        const r = el.getBoundingClientRect()
        return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight
    }""")


def locator_is_in_view(page, selector):
    """Avoid Playwright Locator.is_visible: it only means rendered, not in viewport."""
    return box_is_in_view(page, selector)


with sync_playwright() as p:
    browser = p.chromium.launch(args=[
        "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
    ])

    # Desktop — truth, structure and retained controls.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.set_default_timeout(TIMEOUT_MS)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/*", lambda route: route.continue_()
               if "127.0.0.1" in route.request.url else route.abort())
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
    time.sleep(0.5)

    check("landing root present", page.locator('[data-testid="landing-page"]').count() == 1)
    check("outcome-led headline present",
          "Practise Cambridge Chemistry practicals anywhere" in
          page.locator("h1").inner_text().replace("\n", " "))
    check("hero primary CTA visible", locator_is_in_view(page, '[data-testid="hero-primary-cta"]'))
    check("header CTA is separately identified",
          page.locator('[data-testid="header-primary-cta"]').count() == 1)
    check("real product capture loaded", page.locator('[data-testid="hero-product"] img').evaluate(
        "img => img.complete && img.naturalWidth === 1280 && img.naturalHeight === 720"))
    check("ChemLab flask favicon shipped",
          "38bdf8" in (ROOT / "public" / "favicon.svg").read_text().lower()
          and "863bff" not in (ROOT / "public" / "favicon.svg").read_text().lower())
    font_dir = ROOT / "public" / "fonts"
    check("self-hosted font licences shipped",
          "SIL OPEN FONT LICENSE Version 1.1" in
          (font_dir / "INTER-LICENSE.txt").read_text()
          and "The JetBrains Mono Project Authors" in
          (font_dir / "JETBRAINS-MONO-LICENSE.txt").read_text())
    og = Image.open(ROOT / "public" / "og.png")
    check("social card is 1200x630", og.size == (1200, 630), str(og.size))
    meta = page.evaluate("""() => ({
        viewport: document.querySelector('meta[name="viewport"]')?.content,
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        ogImage: document.querySelector('meta[property="og:image"]')?.content,
        ogWidth: document.querySelector('meta[property="og:image:width"]')?.content,
        ogHeight: document.querySelector('meta[property="og:image:height"]')?.content,
        ogAlt: document.querySelector('meta[property="og:image:alt"]')?.content,
    })""")
    check("canonical and social metadata complete",
          meta["canonical"] == "https://chemlab.tapiwa.me/"
          and meta["ogImage"] == "https://chemlab.tapiwa.me/og.png"
          and meta["ogWidth"] == "1200" and meta["ogHeight"] == "630"
          and "ChemLab ZW" in meta["ogAlt"], str(meta))
    check("browser zoom is not disabled",
          "user-scalable=no" not in meta["viewport"]
          and "maximum-scale=1" not in meta["viewport"], meta["viewport"])
    check("landing permits touch pinch zoom",
          "pinch-zoom" in page.locator('[data-testid="landing-page"]').evaluate(
              "el => getComputedStyle(el).touchAction")
          and page.locator("body").evaluate("el => getComputedStyle(el).touchAction") != "none")

    proof = page.locator('[data-testid="proof-strip"]').inner_text()
    check("verified counts shown", all(value in proof for value in ("14", "19", "3", "100%")),
          "14 practicals / 19 milestones / 3 mock papers / 100% offline shell")
    check("complete library has 14 cards",
          page.locator('button[data-testid^="experiment-"]').count() == 14)
    filters = page.locator(".library-filters")
    check("library distinguishes exam skills and enrichment",
          filters.get_by_role("button", name="9701 exam skills", exact=True).count() == 1
          and filters.get_by_role("button", name="Enrichment", exact=True).count() == 1)
    filters.get_by_role("button", name="9701 exam skills", exact=True).click()
    check("exam-skills filter shows 8 aligned practicals",
          page.locator('button[data-testid^="experiment-"]').count() == 8)
    filters.get_by_role("button", name="Enrichment", exact=True).click()
    check("enrichment filter shows 6 practicals",
          page.locator('button[data-testid^="experiment-"]').count() == 6)
    filters.get_by_role("button", name="All 14", exact=True).click()
    check("learner guide retained", page.locator('[data-testid="course-open"]').count() == 1
          and "0/19" in page.locator('[data-testid="course-open"]').inner_text())
    check("all quality controls retained", all(
        page.locator(f'[data-testid="quality-{q}"]').count() == 1
        for q in ("low", "med", "high", "ultra")))
    check("independent disclaimer present",
          "not affiliated" in page.locator('[data-testid="independent-disclaimer"]').inner_text())
    check("no unsupported proof language", not any(term in page.locator("body").inner_text().lower()
          for term in ("students love", "pass rate", "cambridge-approved", "official cambridge product")))

    landing = page.locator('[data-testid="landing-page"]')
    before = landing.evaluate("""el => {
        el.style.scrollBehavior = 'auto'
        el.scrollTop = 0
        const position = el.scrollTop
        el.style.removeProperty('scroll-behavior')
        return position
    }""")
    page.locator('[data-testid="hero-primary-cta"]').click()
    page.wait_for_timeout(700)
    after = landing.evaluate("el => el.scrollTop")
    check("primary CTA reaches practical library", after > before + 300, f"{before}->{after}")
    check("first experiment card remains clickable", page.locator('[data-testid="experiment-titration"]').is_enabled())

    # Open/close course from marketing CTA; established overlay still works.
    page.locator('[data-testid="course-open"]').click()
    check("course overlay opens", page.locator('[data-testid="course-panel"]').count() == 1)
    page.locator('[data-testid="course-close"]').click()
    check("course overlay closes", page.locator('[data-testid="course-panel"]').count() == 0)

    # FAQ is a real disclosure, not static decorative copy.
    faq = page.get_by_role("button", name="Does Cambridge International operate or endorse ChemLab?")
    faq.click()
    check("FAQ disclosure works", faq.get_attribute("aria-expanded") == "true"
          and "independent" in page.locator("#faq-answer-3").inner_text().lower())

    dm = metrics(page)
    check("desktop no horizontal overflow", dm["scrollWidth"] <= dm["innerWidth"], str(dm))
    check("desktop page scrolls", dm["scrollHeight"] > dm["innerHeight"] * 3, str(dm))
    check("desktop no page errors", not errors, str(errors))
    # Keyboard users must see a strong focus treatment and be able to bypass navigation.
    landing.evaluate("""el => {
        el.style.scrollBehavior = 'auto'
        el.scrollTop = 0
        el.style.removeProperty('scroll-behavior')
    }""")
    page.locator("body").evaluate("el => { el.tabIndex = -1; el.focus(); el.removeAttribute('tabindex') }")
    page.locator("body").press("Tab")
    page.wait_for_timeout(220)
    skip = page.locator(".skip-link")
    focus_style = skip.evaluate("""el => ({
        active: document.activeElement === el,
        outline: getComputedStyle(el).outlineStyle,
        top: el.getBoundingClientRect().top,
    })""")
    check("skip link is first visible keyboard target",
          focus_style["active"] and focus_style["outline"] != "none" and focus_style["top"] >= 0,
          str(focus_style))
    skip.press("Enter")
    check("skip link moves focus target to main content",
          page.evaluate("location.hash") == "#main-content"
          and page.evaluate("document.activeElement?.id") == "main-content")
    page.locator('[data-testid="landing-page"]').evaluate("el => { el.scrollTop = 0 }")
    page.locator('[data-testid="hero-primary-cta"]').focus()
    primary_focus = page.locator('[data-testid="hero-primary-cta"]').evaluate(
        "el => getComputedStyle(el).outlineStyle")
    check("primary action has visible keyboard focus", primary_focus != "none", primary_focus)
    contrast_colors = page.locator(".footer-legal").evaluate("""el => {
        const node = el.querySelector('p')
        return { fg: getComputedStyle(node).color, bg: getComputedStyle(el.closest('footer')).backgroundColor }
    }""")
    check("footer legal text uses readable foreground", contrast_colors["fg"] == "rgb(111, 132, 157)",
          str(contrast_colors))
    page.locator('[data-testid="landing-page"]').evaluate("el => { el.scrollTop = 0 }")
    snap(page, "landing-desktop.png")
    ctx.close()

    # Portrait phone — first action, menu, full width and touch target.
    mobile = browser.new_context(viewport={"width": 390, "height": 844},
                                 is_mobile=True, has_touch=True)
    mp = mobile.new_page()
    mp.set_default_timeout(TIMEOUT_MS)
    mp.route("**/*", lambda route: route.continue_()
             if "127.0.0.1" in route.request.url else route.abort())
    mp.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
    check("mobile hero CTA in first viewport", locator_is_in_view(mp, '[data-testid="hero-primary-cta"]'))
    box = mp.locator('[data-testid="hero-primary-cta"]').bounding_box()
    check("mobile primary CTA is a large tap target",
          box is not None and box["height"] >= 48 and box["width"] >= 300, str(box))
    mm = metrics(mp)
    check("mobile no horizontal overflow", mm["scrollWidth"] <= 390, str(mm))
    check("all featured practicals remain visible on mobile",
          mp.locator(".featured-card").count() == 6
          and all(mp.locator(".featured-card").nth(i).is_visible() for i in range(6)))
    menu = mp.locator(".menu-toggle")
    check("mobile menu trigger visible", menu.is_visible())
    menu.click()
    check("mobile navigation opens", menu.get_attribute("aria-expanded") == "true"
          and mp.locator("#primary-navigation").get_by_role("link", name="Practicals").is_visible())
    mp.keyboard.press("Escape")
    check("Escape closes mobile navigation", menu.get_attribute("aria-expanded") == "false")
    # A section opened from a deep link must begin below the non-sticky header,
    # not render its heading underneath the brand/navigation chrome.
    mp.evaluate("location.hash = '#offline'")
    mp.wait_for_timeout(1400)
    device_heading = mp.locator("#device-title").bounding_box()
    mobile_header = mp.locator('[data-testid="site-header"]').bounding_box()
    check("mobile deep-linked section clears header",
          bool(device_heading) and bool(mobile_header)
          and device_heading["y"] >= mobile_header["y"] + mobile_header["height"],
          f"heading={device_heading} header={mobile_header}")
    mp.locator('[data-testid="landing-page"]').evaluate("""el => {
        el.style.scrollBehavior = 'auto'
        el.scrollTo(0, 0)
        el.style.removeProperty('scroll-behavior')
    }""")
    mp.wait_for_timeout(250)
    check("mobile screenshot reset reaches hero",
          mp.locator('[data-testid="landing-page"]').evaluate("el => el.scrollTop") == 0)
    snap(mp, "landing-mobile.png")
    mobile.close()

    # Landscape phone — primary action must not fall below the short fold.
    landscape = browser.new_context(viewport={"width": 844, "height": 390},
                                    is_mobile=True, has_touch=True)
    lp = landscape.new_page()
    lp.set_default_timeout(TIMEOUT_MS)
    lp.route("**/*", lambda route: route.continue_()
             if "127.0.0.1" in route.request.url else route.abort())
    lp.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
    check("landscape hero CTA in first viewport", locator_is_in_view(lp, '[data-testid="hero-primary-cta"]'))
    check("landscape hero CTA not clipped", not intersects_view(lp, '[data-testid="hero-primary-cta"]')
          or locator_is_in_view(lp, '[data-testid="hero-primary-cta"]'))
    lm = metrics(lp)
    check("landscape no horizontal overflow", lm["scrollWidth"] <= 844, str(lm))
    snap(lp, "landing-landscape.png")
    landscape.close()

    # Reduced motion — CSS scrolling and the CTA path resolve immediately.
    reduced = browser.new_context(viewport={"width": 1280, "height": 720},
                                  reduced_motion="reduce")
    rp = reduced.new_page()
    rp.set_default_timeout(TIMEOUT_MS)
    rp.route("**/*", lambda route: route.continue_()
             if "127.0.0.1" in route.request.url else route.abort())
    rp.goto(f"http://127.0.0.1:{PORT}/", wait_until="networkidle")
    check("reduced motion media query active",
          rp.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"))
    rp.locator('[data-testid="hero-primary-cta"]').click()
    immediate = rp.locator('[data-testid="landing-page"]').evaluate("el => el.scrollTop")
    check("reduced-motion CTA jumps without animation", immediate > 300, str(immediate))
    reduced.close()

    browser.close()

server.shutdown()
print("GATE PASS" if not fails else f"GATE FAIL: {fails}", flush=True)
sys.exit(0 if not fails else 1)
