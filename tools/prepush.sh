#!/usr/bin/env bash
# Runs exactly what CI's build step runs, in the same order, before pushing.
# Two CI failures (react-refresh export, gate-hygiene guard) were both things
# `npm run build` does NOT check locally. Never push without this passing.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== lint =="                 && npm run lint
echo "== model harnesses =="      && node tests/model/progress_backup.mjs && node tests/model/iodine_rate.mjs
echo "== py_compile =="           && python3 -m py_compile tests/run_gates.py tests/gates/*.py tools/*.py
echo "== gate hygiene =="         && python3 tools/check_gate_hygiene.py
echo "== classroom gate =="       && python3 tests/gates/classroom.py > /dev/null && echo "classroom gate: PASS"
echo "== build =="                && npm run build > /tmp/prepush-build.log 2>&1 && tail -3 /tmp/prepush-build.log
echo
echo "PRE-PUSH OK"
