
## iter-14 (2026-08-11)
- Extracted generic `src/components/scene/DragTipper.jsx` from ClockScene's PourableBeaker (home/target/enabled/onPour/onModeChange, drop ring, grab cylinder, tilt+stream anim, spring-home, OrbitControls disable via useThree((s)=>s.get)). ClockScene refactored onto it; pour.py still exit 0. VERIFIED
- F12: EnthalpyScene DraggableBoat via DragTipper — boat on balance pan (home 0.305,BENCH_Y+0.056,0.011), drop on calorimeter mouth (-0.08,BENCH_Y+0.132,0.04) tips boat with white powder stream and calls enthalpyStart; balance reads 0.00 while lifted (boatAway via onModeChange); lid renders only after setup phase. VERIFIED via probe/tip.py exit 0 + tip-drag.png/tip-stream.png inspected.
- Bug fixed (parallax): lifted drag plane means object position != pointer aim at bench level; drop test now uses e.ray.intersectPlane at target height. Before fix POUR still 0 (clock plane is at bench height), TIP failed; after fix both 0.
- Bug fixed (probe): tip.py fixed sleeps outlasted 5 s enthalpy run under SwiftShader (saw 'complete', asserted 'Running'). Rewrote to poll <=12 s for evidence-of-start (Running OR T2>22.0), screenshot at first detection.
- Full regression: titrate/clock/enthalpy/offline/meniscus/meniscus_mobile/pour/tip = 0, shot.py iter14 = 0. Shots iter14-enthalpy.png (open calorimeter, boat on balance) and iter14-clock.png inspected. VERIFIED

## iter-15 (2026-08-11)
F13: interactive burette stopcock — press-and-hold the PTFE key to dispense continuously (1.4 cm3/s, committed in 0.05 quanta via useLabStore.getState()), release closes; TapStream cylinder tip->flask while open; guards endpointReached / reading>=50; buttons still work dropwise; Drop hidden while tap open.
- Extracted setControls(getThree, on) into src/lib/controls.js: exporting a helper from a component .jsx trips eslint react-refresh/only-export-components. DragTipper + TitrationScene both import it.
- Gate probe/tap.py: hold at (572,380), poll <=12 s for reading>=1.0, screenshot at first movement, assert 0.05 quanta, flow-stop on release (two equal reads), Reset -> 0.00. First run all 6 checks PASS (VERIFIED).
- Full regression re-run after a sandbox parking boundary killed the first job's log: all 9 gates + shot.py iter15 exit 0 (VERIFIED, /tmp/reg15-summary.log). iter15 shots inspected.
- Lesson: background-job logs don't survive turn boundaries reliably — write regression output to a persistent file under /tmp with a summary line per gate, and treat missing exit codes as unverified (re-run).

## Iteration 16 — 2026-08-11
**F14: exam-style rate graph in clock CalcSheet.** New `src/components/RateGraph.jsx`: pure SVG (offline-first, no chart lib), 320x240, margins l44/r12/t12/b40 (origin at SVG (44,200)), gridlines, x-mark points (#f26bb0), dashed best-fit line (#63a9e8) constrained through origin (m = Σxy/Σx²), gradient readout; data-testids rate-graph/rate-point/rate-fit/rate-gradient; <2 points shows "record at least 2 runs" hint. Wired into CalcSheet ClockCalc below results table.
- Gate `probe/graph.py`: runs two REAL experiments end-to-end (0.100 M → 40.0 s, 0.080 M → 50.0 s) by clicking Mix & start and polling the auto-stop Record button, records both, opens Show Calculations; asserts 2 rate-points, fit line present, gradient in 240–260 (got 250.0), fit passes through SVG origin (44.0,200.0). Exit 0. VERIFIED.
- Full 10-gate regression + shot.py iter16 all exit 0 (/tmp/reg16-summary.log; per-gate logs /tmp/reg16-<gate>.log). iter16 + graph-calc shots inspected. Lint 0, build green. VERIFIED.
- Lesson applied from iter-15: regression writes one `gate=$?` line per gate to a persistent summary file, so results survived the parked-turn boundary this time.
