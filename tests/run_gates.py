#!/usr/bin/env python3
"""Run every ChemLab probe gate sequentially against dist/.

Each gate is a standalone Playwright script in tests/gates/ that serves
dist/ itself on port 8797 and exits non-zero on any failed check.
Usage:  python tests/run_gates.py [gate ...]
Env:    CHEMLAB_DIST  (default: <repo>/dist)
        CHEMLAB_SHOTS (default: <repo>/shots)
"""
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

GATES = [
    "titrate", "clock", "enthalpy", "offline", "meniscus", "meniscus_mobile",
    "pour", "tip", "tap", "graph", "cooling", "read", "guided", "mock",
    "qual", "mock2", "course", "grav", "gfx", "gas", "organic", "electro",
    "chroma", "flame", "distill", "solubility", "peroxide",
]


def main():
    wanted = sys.argv[1:] or GATES
    unknown = [g for g in wanted if g not in GATES]
    if unknown:
        sys.exit(f"unknown gates: {unknown}; valid: {GATES}")

    env = dict(os.environ)
    env.setdefault("CHEMLAB_DIST", os.path.join(REPO, "dist"))
    env.setdefault("CHEMLAB_SHOTS", os.path.join(REPO, "shots"))
    if not os.path.exists(os.path.join(env["CHEMLAB_DIST"], "index.html")):
        sys.exit(f"no index.html in {env['CHEMLAB_DIST']} — run `npm run build` first")

    results = {}
    for g in wanted:
        t0 = time.time()
        print(f"\n=== gate {g} ===", flush=True)
        r = subprocess.run(
            [sys.executable, os.path.join(HERE, "gates", f"{g}.py")],
            env=env, timeout=600,
        )
        results[g] = r.returncode
        print(f"=== gate {g}: {'PASS' if r.returncode == 0 else 'FAIL'} "
              f"({time.time() - t0:.0f}s) ===", flush=True)

    print("\n===== SUMMARY =====")
    for g, rc in results.items():
        print(f"{'PASS' if rc == 0 else 'FAIL'}  {g}")
    failed = [g for g, rc in results.items() if rc != 0]
    print(f"{len(results) - len(failed)}/{len(results)} gates green")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
