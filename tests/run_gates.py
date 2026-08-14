#!/usr/bin/env python3
"""Run every ChemLab probe gate sequentially against dist/.

Each gate is a standalone Playwright script in tests/gates/ that serves
dist/ itself on port 8797 and exits non-zero on any failed check.
Usage:  python tests/run_gates.py [gate ...]
Env:    CHEMLAB_DIST  (default: <repo>/dist)
        CHEMLAB_SHOTS (default: <repo>/test-results)
"""
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

GATES = [
    "classroom", "teach", "landing", "routes", "webgl",
    "shell", "progress", "setup",
    "titrate", "clock", "enthalpy", "offline", "meniscus", "meniscus_mobile",
    "pour", "tip", "tap", "graph", "cooling", "read", "guided", "mock",
    "qual", "mock2", "course", "grav", "gfx", "gas", "organic", "electro",
    "chroma", "flame", "distill", "solubility", "peroxide", "iodine_rate",
    "testmode",
]

# Every gate binds the same local probe port, so the sandbox still runs the
# canonical serial list. CI gives each shard its own runner, cutting the
# SwiftShader wall-clock without changing any chemistry/product assertion.
CI_SHARDS = {
    "core": ["classroom", "teach", "landing", "routes", "webgl", "shell", "progress", "setup", "titrate", "clock", "enthalpy", "offline", "meniscus", "meniscus_mobile"],
    "interaction": ["pour", "tip", "tap", "graph", "cooling", "read", "guided"],
    # Slow SwiftShader simulations are split so no healthy shard approaches
    # the Actions 75-minute job cap. The canonical flattened order remains
    # exactly GATES, enforced by validate_shards().
    "assessment-a": ["mock", "qual"],
    "mock-clock": ["mock2"],
    "assessment-b": ["course", "grav", "gfx", "gas"],
    "library-a": ["organic", "electro", "chroma", "flame"],
    "library-b": ["distill", "solubility", "peroxide", "iodine_rate", "testmode"],
}


def validate_shards():
    flat = [gate for shard in CI_SHARDS.values() for gate in shard]
    if flat != GATES or len(flat) != len(set(flat)):
        sys.exit("CI_SHARDS must contain every GATES entry exactly once and in canonical order")


# Per-gate wall cap. CI SwiftShader runners are ~2.5x slower than a dev
# sandbox (mock2: 391s local vs >1800s CI on 2026-08-12). ci.yml gives its
# isolated mock-clock shard 2400 s and keeps every other gate at 1800 s. Not a
# pass/fail assertion — just a hang killer; internal stall guards report real
# simulation stalls much earlier.
GATE_TIMEOUT_S = int(os.environ.get("CHEMLAB_GATE_TIMEOUT_S", "900"))


def run_gate(gate, env, attempts=1):
    t0 = time.time()
    rc = 1
    for attempt in range(1, attempts + 1):
        suffix = f" (attempt {attempt}/{attempts})" if attempts > 1 else ""
        print(f"\n=== gate {gate}{suffix} ===", flush=True)
        try:
            r = subprocess.run(
                [sys.executable, os.path.join(HERE, "gates", f"{gate}.py")],
                env=env, timeout=GATE_TIMEOUT_S,
            )
            rc = r.returncode
        except subprocess.TimeoutExpired:
            print(f"gate {gate} exceeded {GATE_TIMEOUT_S}s hard timeout", flush=True)
            rc = 124
        if rc == 0:
            break
        if attempt < attempts:
            print(f"gate {gate} failed with exit {rc}; retrying once on a fresh browser", flush=True)
    print(f"=== gate {gate}: {'PASS' if rc == 0 else 'FAIL'} "
          f"({time.time() - t0:.0f}s) ===", flush=True)
    return rc


def main():
    validate_shards()
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--shard":
        shard = args[1]
        if shard not in CI_SHARDS:
            sys.exit(f"unknown shard {shard!r}; valid: {list(CI_SHARDS)}")
        wanted = CI_SHARDS[shard]
    elif "--shard" in args:
        sys.exit("usage: tests/run_gates.py [--shard NAME | gate ...]")
    else:
        wanted = args or GATES
    unknown = [g for g in wanted if g not in GATES]
    if unknown:
        sys.exit(f"unknown gates: {unknown}; valid: {GATES}")

    env = dict(os.environ)
    env.setdefault("CHEMLAB_DIST", os.path.join(REPO, "dist"))
    env.setdefault("CHEMLAB_SHOTS", os.path.join(REPO, "test-results"))
    if not os.path.exists(os.path.join(env["CHEMLAB_DIST"], "index.html")):
        sys.exit(f"no index.html in {env['CHEMLAB_DIST']} — run `npm run build` first")

    results = {}
    # A product assertion must pass on its first fresh browser. Retrying a
    # failed gate can hide a deterministic defect and doubles an already-long
    # SwiftShader shard, so CI and local runs use the same one-attempt rule.
    attempts = 1
    for g in wanted:
        results[g] = run_gate(g, env, attempts=attempts)

    print("\n===== SUMMARY =====")
    for g in wanted:
        rc = results[g]
        print(f"{'PASS' if rc == 0 else 'FAIL'}  {g}")
    failed = [g for g, rc in results.items() if rc != 0]
    print(f"{len(results) - len(failed)}/{len(results)} gates green")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
