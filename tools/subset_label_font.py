#!/usr/bin/env python3
"""Regenerate public/fonts/chemlab-mono.woff — the troika <Text> label font.

Troika (Typr.js) cannot parse woff2, so in-scene labels need a classic woff.
The full JetBrains Mono Regular is 270 KB; we ship a subset covering every
character a troika label can render: all printable ASCII plus every non-ASCII
character found anywhere under src/ (dynamic label expressions pull from
first-party data, so scanning src/ is a complete over-approximation).

History: the original hand-made subset (124 chars, 30.5 KB) was missing
'·' and '↑', which IodineRateScene/PeroxideScene labels use — silent tofu.
This generator scans src/ so new label characters can never fall out of the
subset silently. Run it whenever a label needs a char that renders blank:

    python3 tools/subset_label_font.py

Requires fontTools (pip install fonttools zopfli) and network access to
fetch the upstream TTF (pinned URL below).
"""
import glob
import io
import os
import sys
import urllib.request

from fontTools.subset import main as subset_main
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'fonts', 'chemlab-mono.woff')
SRC_TTF_URL = ('https://github.com/JetBrains/JetBrainsMono/raw/master/'
               'fonts/ttf/JetBrainsMono-Regular.ttf')


def reachable_chars():
    chars = set(chr(c) for c in range(32, 127))
    for pat in ('src/**/*.js', 'src/**/*.jsx'):
        for f in glob.glob(os.path.join(ROOT, pat), recursive=True):
            with open(f, encoding='utf8') as fh:
                chars.update(c for c in fh.read() if ord(c) > 126)
    return chars


def main():
    ttf_path = os.path.join(ROOT, 'tools', '.cache-jbmono-regular.ttf')
    if not os.path.exists(ttf_path):
        print('fetching', SRC_TTF_URL)
        urllib.request.urlretrieve(SRC_TTF_URL, ttf_path)

    font = TTFont(ttf_path)
    cmap = font.getBestCmap()
    want = reachable_chars()
    have = ''.join(sorted(c for c in want if ord(c) in cmap))
    dropped = ''.join(sorted(c for c in want if ord(c) not in cmap))
    print(f'subsetting to {len(have)} chars; not in font (emoji/symbols, '
          f'DOM-only): {dropped!r}')

    charfile = os.path.join(ROOT, 'tools', '.cache-subset-chars.txt')
    with open(charfile, 'w', encoding='utf8') as fh:
        fh.write(have)

    sys.argv = ['subset', ttf_path, f'--text-file={charfile}',
                '--layout-features=', '--no-hinting',
                '--name-IDs=1,2,3,4,6', '--flavor=woff', '--with-zopfli',
                f'--output-file={OUT}']
    subset_main()

    check = TTFont(OUT)
    got = check.getBestCmap()
    missing = [c for c in have if ord(c) not in got]
    assert not missing, f'subset lost chars: {missing}'
    print(f'wrote {OUT}: {os.path.getsize(OUT)} bytes, '
          f'{check["maxp"].numGlyphs} glyphs, {len(got)} cmap entries')


if __name__ == '__main__':
    main()
