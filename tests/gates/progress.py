"""Portable learner-progress gate.

Asserts a versioned JSON download, non-destructive import, persisted best mock
scores, invalid-file rejection, reload persistence and 390x844 usability.
"""
import functools
import http.server
import json
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
    browser = p.chromium.launch()
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        accept_downloads=True,
    )
    page = context.new_page()
    page.set_default_timeout(TIMEOUT_MS)
    page.goto(f"http://127.0.0.1:{PORT}/", wait_until="load")
    page.evaluate("""() => {
      localStorage.setItem('chemlab-course-v1', JSON.stringify({
        'titration-endpoint': true,
        'clock-runs': true
      }));
      localStorage.setItem('chemlab-mock-results-v1', JSON.stringify({
        'titration-s22': { score: 6, total: 6 },
        'clock-s23': { score: 3, total: 6 }
      }));
    }""")
    page.reload(wait_until="load")
    page.locator('[data-testid="course-open"]').first.click()

    check("backup controls exist", page.locator('[data-testid="progress-export"]').count() == 1
          and page.locator('[data-testid="progress-import"]').count() == 1)
    check("portable proof-of-work controls exist",
          page.locator('[data-testid="progress-seal"]').is_visible()
          and page.locator('[data-testid="progress-print"]').is_visible()
          and page.locator('[data-testid="progress-share"]').is_visible())
    initial_done = page.locator('[data-testid="course-progress"]').get_attribute("data-done")
    check("progress card reports completed milestones",
          f"{initial_done}/19" in page.locator('[data-testid="progress-seal-score"]').inner_text(),
          page.locator('[data-testid="progress-seal-score"]').inner_text())
    copy = page.locator(".progress-backup").inner_text()
    check("privacy copy says no upload", "does not upload it" in copy, copy)
    check("merge policy is explicit", "keeps the higher mock-paper score" in copy, copy)

    with page.expect_download() as download_info:
        page.locator('[data-testid="progress-export"]').click()
    download = download_info.value
    exported = json.loads(Path(download.path()).read_text())
    check("download has dated JSON filename",
          download.suggested_filename.startswith("chemlab-progress-")
          and download.suggested_filename.endswith(".json"),
          download.suggested_filename)
    check("download schema versioned",
          exported["format"] == "chemlab-progress" and exported["version"] == 1)
    check("download carries course milestones",
          {"titration-endpoint", "clock-runs"}.issubset(exported["courseDone"]),
          str(exported["courseDone"]))
    check("download carries best mock scores",
          exported["mockResults"]["titration-s22"]["score"] == 6)

    incoming = {
        "format": "chemlab-progress",
        "version": 1,
        "exportedAt": "2026-08-13T00:00:00.000Z",
        "courseDone": {
            "titration-read": True,
        },
        "mockResults": {
            "titration-s22": {"score": 4, "total": 6},
            "clock-s23": {"score": 5, "total": 6},
        },
    }
    page.locator('[data-testid="progress-import-file"]').set_input_files({
        "name": "valid-chemlab-progress.json",
        "mimeType": "application/json",
        "buffer": json.dumps(incoming).encode(),
    })
    page.wait_for_function(
        "() => document.querySelector('[data-testid=\"progress-backup-status\"]')"
        "?.textContent.includes('Progress merged')"
    )
    merged = page.evaluate("""() => ({
      course: JSON.parse(localStorage.getItem('chemlab-course-v1')),
      mocks: JSON.parse(localStorage.getItem('chemlab-mock-results-v1'))
    })""")
    check("import adds milestone without erasing old ones",
          all(merged["course"].get(k) is True for k in
              ("titration-endpoint", "clock-runs", "titration-read")),
          str(merged["course"]))
    check("import never lowers a best mock score",
          merged["mocks"]["titration-s22"]["score"] == 6, str(merged["mocks"]))
    check("import accepts a higher best mock score",
          merged["mocks"]["clock-s23"]["score"] == 5, str(merged["mocks"]))

    before_invalid = page.evaluate(
        "() => [localStorage.getItem('chemlab-course-v1'), "
        "localStorage.getItem('chemlab-mock-results-v1')]"
    )
    page.locator('[data-testid="progress-import-file"]').set_input_files({
        "name": "invalid.json",
        "mimeType": "application/json",
        "buffer": b'{"format":"chemlab-progress","version":1,'
                  b'"courseDone":{"invented-unit":true},"mockResults":{}}',
    })
    page.wait_for_function(
        "() => document.querySelector('[data-testid=\"progress-backup-status\"]')"
        "?.textContent.includes('unknown or invalid')"
    )
    after_invalid = page.evaluate(
        "() => [localStorage.getItem('chemlab-course-v1'), "
        "localStorage.getItem('chemlab-mock-results-v1')]"
    )
    check("invalid backup changes nothing", before_invalid == after_invalid)

    page.reload(wait_until="load")
    page.wait_for_selector('[data-testid="course-panel"]')
    reloaded_count = int(
        page.locator('[data-testid="course-progress"]').get_attribute("data-done")
    )
    check("merged milestones survive reload", reloaded_count >= 3, str(reloaded_count))
    persisted_mocks = page.evaluate(
        "() => JSON.parse(localStorage.getItem('chemlab-mock-results-v1'))"
    )
    check("best mock scores survive reload",
          persisted_mocks["titration-s22"]["score"] == 6
          and persisted_mocks["clock-s23"]["score"] == 5)

    page.set_viewport_size({"width": 390, "height": 844})
    time.sleep(0.3)
    panel = page.locator('[data-testid="course-panel"] > div').bounding_box()
    export_box = page.locator('[data-testid="progress-export"]').bounding_box()
    import_box = page.locator('[data-testid="progress-import"]').bounding_box()
    check("mobile panel fits 390px",
          panel is not None and panel["x"] >= 0 and panel["x"] + panel["width"] <= 390,
          str(panel))
    check("mobile backup buttons are touch targets",
          export_box is not None and import_box is not None
          and export_box["height"] >= 44 and import_box["height"] >= 44,
          f"{export_box} {import_box}")
    snap(page, "progress-backup-mobile.png")
    browser.close()

httpd.shutdown()
print(("GATE PASS" if not fails else f"GATE FAIL: {fails}"), flush=True)
sys.exit(0 if not fails else 1)
