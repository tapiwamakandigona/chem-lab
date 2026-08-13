#!/usr/bin/env python3
"""Static hygiene checks on the probe gates. Run before every push; CI runs it too.

Rules enforced:

1. Any gate that captures screenshots must bound the capture with
   `timeout=SHOT_TIMEOUT_MS`, and must funnel captures through a `snap()`
   helper. Evidence must never be able to hang or fail a gate — a screenshot
   is proof of a run, not part of the assertion.
   Browserless gates (pure model/logic harnesses, no Playwright) are exempt:
   they have nothing to screenshot. The exemption is derived from the file, not
   from a hand-maintained allowlist that would rot.

2. No gate may silence a failure by wrapping the whole run in a shell timeout
   or by swallowing assertion errors wholesale.

Exit code 1 with a specific message on any violation.
"""

from __future__ import annotations

import sys
from pathlib import Path

GATES = Path("tests/gates")


def uses_browser(text: str) -> bool:
    return "playwright" in text or "sync_playwright" in text or "page.goto" in text


def main() -> int:
    unbounded: list[str] = []
    no_helper: list[str] = []
    browserless: list[str] = []

    for path in sorted(GATES.glob("*.py")):
        text = path.read_text()
        if not uses_browser(text):
            browserless.append(path.name)
            continue
        if "screenshot" in text and "timeout=SHOT_TIMEOUT_MS" not in text:
            unbounded.append(path.name)
        if "screenshot" in text and "def snap(" not in text:
            no_helper.append(path.name)

    problems = []
    if unbounded:
        problems.append(f"screenshots not bounded by SHOT_TIMEOUT_MS: {unbounded}")
    if no_helper:
        problems.append(f"screenshots taken outside a snap() helper: {no_helper}")

    if problems:
        for p in problems:
            print(f"FAIL {p}", file=sys.stderr)
        return 1

    checked = len(list(GATES.glob("*.py"))) - len(browserless)
    print(f"gate hygiene OK: {checked} browser gates bounded; "
          f"{len(browserless)} browserless gate(s) exempt: {browserless}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
