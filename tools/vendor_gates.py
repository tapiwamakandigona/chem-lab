#!/usr/bin/env python3
"""Vendor sandbox probes (probe/*.py) into portable CI gates (tests/gates/).

Transforms applied:
  1. DIST/SHOTS become env-tunable (CHEMLAB_DIST / CHEMLAB_SHOTS).
  2. TIMEOUT_MS from CHEMLAB_TIMEOUT_MS (default 30000) + set_default_timeout
     on every new_page — slow CI runners set 120000.
  3. Evidence screenshots (path=...) become best-effort snap() — a slow
     compositor must not fail a gate whose assertions all passed.
     Bytes-returning screenshots (pixel checks) STAY STRICT, they only
     gain the env timeout.

Usage: python tools/vendor_gates.py <probe_dir> [gate ...]
"""
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'tests', 'gates')

PRELUDE = '''
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

'''

DIST_LITERAL = '"/work/build/chemlab/main/dist"'
SHOTS_LITERAL = '"/work/build/chemlab/shots/'


def vendor(src):
    # strip any probe-local prelude (newer probes already define DIST/SHOTS)
    src = re.sub(
        r'\nimport os\nDIST = os\.environ[^\n]*\nSHOTS = os\.environ[^\n]*\n'
        r'os\.makedirs\(SHOTS, exist_ok=True\)\n',
        '\n', src, count=1)

    # normalise legacy f-string shot paths to the {SHOTS} form first
    src = src.replace('f"/work/build/chemlab/shots/', 'f"{SHOTS}/')

    # env-tunable paths FIRST (so the prelude's own literals survive)
    src = src.replace(f'directory={DIST_LITERAL}', 'directory=DIST')
    src = src.replace(DIST_LITERAL, 'DIST')
    src = src.replace(SHOTS_LITERAL, 'SHOTS + "/')

    # insert the canonical prelude after the playwright import
    anchor = 'from playwright.sync_api import sync_playwright\n'
    assert anchor in src, 'playwright import anchor missing'
    src = src.replace(anchor, anchor + PRELUDE, 1)

    # default timeout on every page
    src = re.sub(r'^(\s{4})(\w+) = b\.new_page\(([^\n]*)\)$',
                 lambda m: f'{m.group(1)}{m.group(2)} = b.new_page({m.group(3)})\n'
                           f'{m.group(1)}{m.group(2)}.set_default_timeout(TIMEOUT_MS)',
                 src, flags=re.M)

    # evidence screenshot + its print -> snap()
    src = re.sub(
        r'^(\s+)(\w+)\.screenshot\(path=SHOTS \+ "/([^"]+)"\)\n'
        r'\1print\("shot: [^"]*"(?:, flush=True)?\)\n',
        lambda m: f'{m.group(1)}snap({m.group(2)}, "{m.group(3)}")\n',
        src, flags=re.M)
    # evidence screenshot without a print
    src = re.sub(
        r'^(\s+)(\w+)\.screenshot\(path=SHOTS \+ "/([^"]+)"\)$',
        lambda m: f'{m.group(1)}snap({m.group(2)}, "{m.group(3)}")',
        src, flags=re.M)
    # f-string form: page.screenshot(path=f"{SHOTS}/name.png")
    src = re.sub(
        r'^(\s+)(\w+)\.screenshot\(path=f"\{SHOTS\}/([^"{}]+)"\)$',
        lambda m: f'{m.group(1)}snap({m.group(2)}, "{m.group(3)}")',
        src, flags=re.M)
    # f-string with a variable name: path=f"{SHOTS}/{var}" or legacy literal dir
    src = re.sub(
        r'^(\s+)(\w+)\.screenshot\(path=f"\{SHOTS\}/\{(\w+)\}"\)$',
        lambda m: f'{m.group(1)}snap({m.group(2)}, {m.group(3)})',
        src, flags=re.M)
    # bare-variable path (e.g. SHOT constant): route through snap on basename
    src = re.sub(
        r'^(\s+)(\w+)\.screenshot\(path=(\w+)\)$',
        lambda m: f'{m.group(1)}snap({m.group(2)}, os.path.basename({m.group(3)}))',
        src, flags=re.M)

    # strict pixel screenshots keep gating but honour the env timeout
    src = re.sub(r'\.screenshot\(\)', '.screenshot(timeout=TIMEOUT_MS)', src)
    return src


def main():
    probe_dir = sys.argv[1]
    names = sys.argv[2:] or [f[:-3] for f in sorted(os.listdir(probe_dir))
                             if f.endswith('.py')]
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        src = open(os.path.join(probe_dir, n + '.py')).read()
        out = vendor(src)
        path = os.path.join(OUT, n + '.py')
        open(path, 'w').write(out)
        # sanity: still valid python
        compile(out, path, 'exec')
        print('vendored', n)


if __name__ == '__main__':
    main()
