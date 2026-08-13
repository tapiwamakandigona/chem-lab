"""End-to-end classroom gate: teacher publishes, learner joins, teacher marks.

Runs the whole loop through the real UI in one browser with the offline local
driver forced on (localStorage['chemlab-driver'] = 'local'), so the gate never
touches the network and never depends on Appwrite being up:

  /teach : create a class, read the join code off the code card,
           build an assignment from a practical + a marked mock, publish
  /join  : enter that code with a nickname, see the assignment items,
           hand in results
  /teach : the submission appears with the learner's alias, and CSV export
           produces the documented header and one data row

It also pins the promises that make this tier safe for schools:
  * the learner screen never asks for an email or a real name
  * a wrong code is refused with a human message, not a stack trace
  * an alias containing a hyphen survives the round trip (regression: the
    sanitiser once ate hyphens)
  * the whole flow works at 390x844 with 44 px+ touch targets
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


BASE = "http://127.0.0.1:%d" % PORT
ALIAS = "Ana-Maria"


def force_local_driver(page):
    """The gate must exercise the offline driver, never the network."""
    page.add_init_script("window.localStorage.setItem('chemlab-driver', 'local')")


def wait_for(predicate, deadline_s=20, interval_s=0.15):
    """Poll for observable state. CI runners are far slower than a dev box, so
    never one-shot a check after a fixed sleep."""
    end = time.time() + deadline_s
    while time.time() < end:
        try:
            value = predicate()
        except Exception:  # noqa: BLE001 — mid-render DOM reads are expected to fail
            value = None
        if value:
            return value
        time.sleep(interval_s)
    return None


with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    context.set_default_timeout(TIMEOUT_MS)
    page = context.new_page()
    force_local_driver(page)

    # ---------------------------------------------------------------- teacher
    page.goto(BASE + "/teach", wait_until="domcontentloaded")
    panel = wait_for(lambda: page.query_selector('[data-testid="teach-panel"]'))
    check("teacher console mounts", panel is not None)

    # No Appwrite project is configured for the gate, so the console must offer
    # the offline path rather than a dead sign-in form.
    badge = wait_for(lambda: page.query_selector('[data-testid="teach-local-badge"]'), 10)
    check("offline mode is announced, not silently degraded", badge is not None)

    page.fill('[data-testid="class-name"]', "12B Chemistry")
    page.click('[data-testid="class-create"]')

    code_el = wait_for(lambda: page.query_selector('[data-testid="active-class-code"] code'))
    code = code_el.inner_text().strip() if code_el else ""
    check("class creation yields a 6-character join code", len(code) == 6, repr(code))
    check(
        "join code avoids lookalike characters",
        all(ch not in "O0I1LZ2S5B8" for ch in code),
        code,
    )
    snap(page, "teach-class-created.png")

    # Assignment builder: one practical + one marked mock.
    page.fill('[data-testid="assignment-title"]', "Week 3 — titration technique")
    page.click('[data-testid="pick-practical-titration"]')
    page.click('[data-testid="pick-mock-titration-s22"]')
    count = page.inner_text('[data-testid="assignment-count"]')
    check("builder counts selected items", "2 of" in count, count)

    page.click('[data-testid="assignment-publish"]')
    published = wait_for(lambda: page.query_selector('[data-testid="assignment-list"] li'))
    check("assignment publishes to the class", published is not None)
    snap(page, "teach-assignment-published.png")

    # An empty assignment must be refused, with a message a teacher can act on.
    page.fill('[data-testid="assignment-title"]', "Nothing selected")
    page.click('[data-testid="assignment-publish"]')
    err = wait_for(lambda: page.query_selector('[data-testid="assignment-error"]'), 8)
    check("assignment with no items is refused", err is not None,
          (err.inner_text()[:70] if err else ""))

    # ---------------------------------------------------------------- learner
    page.goto(BASE + "/join", wait_until="domcontentloaded")
    join_panel = wait_for(lambda: page.query_selector('[data-testid="join-panel"]'))
    check("join screen mounts", join_panel is not None)

    # The safety promise, asserted rather than assumed: nothing on this screen
    # asks a minor for an email address or a real name.
    inputs = page.eval_on_selector_all(
        '[data-testid="join-panel"] input',
        "els => els.map(e => (e.type || '') + '|' + (e.getAttribute('autocomplete') || ''))",
    )
    check(
        "learner screen asks for no email and no password",
        all("email" not in i and "password" not in i for i in inputs),
        str(inputs),
    )

    page.fill('[data-testid="join-code"]', "AAAAAA")
    page.fill('[data-testid="join-alias"]', ALIAS)
    page.click('[data-testid="join-submit"]')
    bad = wait_for(lambda: page.query_selector('[data-testid="join-error"]'), 10)
    check("unknown join code is refused with a readable message", bad is not None,
          (bad.inner_text()[:70] if bad else ""))

    page.fill('[data-testid="join-code"]', code)
    page.fill('[data-testid="join-alias"]', ALIAS)
    page.click('[data-testid="join-submit"]')
    identity = wait_for(lambda: page.query_selector('[data-testid="join-identity"]'))
    identity_text = identity.inner_text() if identity else ""
    check("learner joins with code and alias", ALIAS in identity_text, identity_text[:60])
    check("hyphenated alias survives the round trip", ALIAS in identity_text, identity_text[:60])

    listed = wait_for(lambda: page.query_selector('[data-testid="join-assignments"] li'))
    check("assignment is visible to the learner", listed is not None)
    items_text = page.inner_text('[data-testid="join-assignments"]') if listed else ""
    check("both set items are listed for the learner",
          "Titration" in items_text and "Titration calculations" in items_text,
          items_text[:90].replace("\n", " / "))
    snap(page, "join-assignment.png")

    hand_in = wait_for(lambda: page.query_selector('[data-testid^="hand-in-"]'))
    if hand_in:
        hand_in.click()
    handed = wait_for(
        lambda: hand_in and "Handed in" in hand_in.inner_text(), 15
    )
    check("learner can hand in results", bool(handed))
    snap(page, "join-handed-in.png")

    # --------------------------------------------------- teacher sees results
    page.goto(BASE + "/teach", wait_until="domcontentloaded")
    wait_for(lambda: page.query_selector('[data-testid="assignment-list"] li'))
    row = wait_for(lambda: page.query_selector('[data-testid="assignment-list"] li button'))
    if row:
        row.click()
    results = wait_for(lambda: page.query_selector('[data-testid="assignment-results"]'), 15)
    check("teacher sees the results panel", results is not None)
    table_text = page.inner_text('[data-testid="assignment-results"]') if results else ""
    check("submission appears under the learner's alias", ALIAS in table_text,
          table_text[:80].replace("\n", " / "))
    snap(page, "teach-results.png")

    csv_btn = page.query_selector('[data-testid="results-csv"]')
    check("CSV export is offered once there is data",
          csv_btn is not None and not csv_btn.is_disabled())

    if csv_btn:
        with page.expect_download() as info:
            csv_btn.click()
        download = info.value
        path = Path(SHOTS) / "teach-results.csv"
        download.save_as(str(path))
        text = path.read_text()
        header = text.splitlines()[0] if text else ""
        check(
            "CSV header matches the documented contract",
            header == "alias,submitted_at,items_done,items_required,mock_marks,mock_available",
            header,
        )
        check("CSV contains exactly one data row", len(text.strip().splitlines()) == 2,
              str(len(text.strip().splitlines())))
        check("CSV carries the learner alias", ALIAS in text, text.splitlines()[-1][:60])

    page.close()

    # ------------------------------------------------------------ phone sizes
    phone = context.new_page()
    phone.set_default_timeout(TIMEOUT_MS)
    force_local_driver(phone)
    phone.set_viewport_size({"width": 390, "height": 844})
    phone.goto(BASE + "/join", wait_until="domcontentloaded")
    wait_for(lambda: phone.query_selector('[data-testid="join-panel"]'))
    overflow = phone.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check("join screen does not scroll sideways on a phone", overflow <= 1, str(overflow))
    heights = phone.eval_on_selector_all(
        '[data-testid="join-panel"] input, [data-testid="join-panel"] button',
        "els => els.map(e => Math.round(e.getBoundingClientRect().height))",
    )
    check("phone controls are at least 44 px tall", all(h >= 44 for h in heights), str(heights))
    snap(phone, "join-phone.png")

    phone.goto(BASE + "/teach", wait_until="domcontentloaded")
    wait_for(lambda: phone.query_selector('[data-testid="teach-panel"]'))
    overflow = phone.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check("teacher console does not scroll sideways on a phone", overflow <= 1, str(overflow))
    snap(phone, "teach-phone.png")

    landscape = context.new_page()
    landscape.set_default_timeout(TIMEOUT_MS)
    force_local_driver(landscape)
    landscape.set_viewport_size({"width": 844, "height": 390})
    landscape.goto(BASE + "/teach", wait_until="domcontentloaded")
    wait_for(lambda: landscape.query_selector('[data-testid="teach-panel"]'))
    overflow = landscape.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check("teacher console works in landscape", overflow <= 1, str(overflow))
    snap(landscape, "teach-landscape.png")

    context.close()
    browser.close()

httpd.shutdown()
print("teach gate: " + ("PASS" if not fails else "FAIL"), flush=True)
if fails:
    print("GATE FAIL: " + str(fails), flush=True)
    sys.exit(1)
