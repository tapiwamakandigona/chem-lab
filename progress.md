
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

## Iteration 17 — 2026-08-11
**F15: enthalpy cooling curve with heat-loss extrapolation (authentic 9701 P3 technique).**
- store.js: `COOLING` constants (mixT 150 s, interval 30 s, endT 420 s, rate 0.02 °C/s), `getCoolingReadings` (readings every 30 s, null at mixing time; Tmix = targetT2 + rate·interval so the max *recorded* temp at t=180 stays 32.1 and the existing enthalpy gate is untouched), `getCoolingAnalysis` (least-squares fit over post-mix readings, extrapolated T at t=150 → 32.7 °C).
- New `src/components/CoolingCurve.jsx`: pure SVG 320×240, gridlines, × readings, solid cooling fit (#63a9e8), dashed extrapolation segment + vertical mixing line, open-circle marker with "T = 32.7 °C" label (#f26bb0). data-testids cooling-curve/point/fit/extrap/textrap.
- CalcSheet EnthalpyCalc: horizontally scrollable readings table (t / T rows, × at 150 s), CoolingCurve, heat-loss correction box, corrected-ΔH block (ΔT_corr 10.7 → ΔH_corr −22.5 kJ/mol vs uncorrected −21.2, data-book −23.0 discussion line). First table render was cramped (15 columns ran together in the shot) — fixed with overflow-x-auto + px-1.5 cell padding, re-verified visually.
- Gate `probe/cooling.py`: 13 checks incl. exact extrapolated T, corrected ΔH, point count, reset behaviour. Exit 0. Lesson: SVG `<text>` nodes are not HTMLElements — Playwright `inner_text()` throws; use `text_content()` for SVG.
- Full 11-gate regression + shot.py iter17 → /tmp/reg17-summary.log (running at commit time; committed after all green).

## iter-18 (2026-08-11)
- DEPLOYED TO PRODUCTION: https://chemlab.tapiwa.me/ — Appwrite Sites (site id
  `chemlab`, Portfolio project fra-69e62515000e9e781653), custom-domain proxy
  rule + SSL cert verified. Manual tar.gz deployments of dist/ (framework
  "other", adapter static, fallback index.html) — GitHub-App auto-deploy not
  wired (app has single-repo access; expanding needs a phone 2FA tap).
- tools/deploy.py: build locally, then upload dist as an activated deployment.
  Credentials come from env / /work/.secrets/credentials.env — never in repo.
- VERIFIED live: /, sw.js, manifest 200; headless Chromium on the live URL
  boots the full 3D titration scene, 1 SW registration, zero console errors
  (shots/live-menu.png, live-titration.png).
- Also: iter-17 regression (11 gates + shots) all green before deploy.

## iter-19 (2026-08-11)
- F16 "read the burette yourself": endpoint masks CURRENT READING/TITRE
  (?.??); single shared endpoint card (store-driven readCheck state — safe
  across responsive renders) with zoomed BuretteScale SVG (extracted from
  MeniscusPractice into components/BuretteScale.jsx, no data-target leak in
  live mode), exact-0.05 validation, warning feedback, reveal after 3 misses.
- Store: titration.readCheck + titrationReadInput/ReadCheckSubmit/ReadReveal;
  all resets clear it. Record & Refill button removed — recording now flows
  only through a correct reading (or reveal).
- Gates: new probe/read.py (19 checks, desktop + 390x844 mobile) exit 0;
  probe/titrate.py STRENGTHENED (masked at endpoint + read-check records
  titre) exit 0.

## iter-20 (2026-08-11)
- F17 Guided mode: src/lib/guides.js (pure state->steps; titration 6, clock 5, enthalpy 4) + GuideCoach.jsx (one instance per experiment, collapsible pill, store guideOpen). Gate probe/guided.py 17 checks exit 0 (VERIFIED). Probe initially had a wrong expectation (slow-step ticking at 20 cm3); model was correct, probe strengthened to assert tick-by-tick at 20/23/23.80/endpoint.
- F18 Mock paper: src/lib/marking.js (markPaper with per-part ECF; TITRATION_PAPER_S22 5 parts, 6 marks) + MockPaper.jsx overlay, gated to s22 + concordant titres. Gate caught real bug: overlay rendered inside pointer-events-none UI layer, canvas swallowed clicks -> fixed via createPortal(document.body). probe/mock.py 13 checks exit 0 (VERIFIED: 6/6 correct path, 5/6 ECF path, sloppy mean rejected).
- Harness fix: probe/graph.py was the only gate not self-serving dist/ (relied on external server; failed in reg19 with ERR_CONNECTION_REFUSED). Now self-serves; exit 0.
- reg19 full regression before this iter: 12/12 gates green after graph fix; iter-19 deployed live.

## iter-21 (2026-08-11)
- F19 Qualitative Analysis: src/lib/qual.js (9701 QA-notes knowledge base: 10 cations x NaOH/NH3 dropwise+excess, 7 anions x HCl/BaCl2/AgNO3, 5 unknowns FA5-FA9, observe/precipitateVisual/markIdentification with evidence-required marking), qual store slice (order enforcement: excess locked before dropwise), QualScene.jsx (test-tube rack, live tube with ppt/effervescence/solution-colour visuals, animated dropper), QualUI.jsx (reagent buttons, observations table, ion ID + marking), qual guide steps (6), menu card, camera.
- Gate probe/qual.py 20 checks exit 0 (VERIFIED). Gate caught probe's own incomplete FA7 run (guide step correctly unticked); lint caught ref-access-during-render in Dropper (fixed with single state ref mutated in useFrame).
- Reframed camera after screenshot review (rack was clipped).

## iter-22 (2026-08-11)
- F20 Mock papers for clock + enthalpy: CLOCK_PAPER_S23 (rate from own 0.100 M run, least-squares-through-origin gradient, order, predicted time at 0.050 M — ECF from gradient) and ENTHALPY_PAPER_S20 (cooling-corrected dT, q, n, signed dH — ECF chain; sign required) in src/lib/marking.js; wired into ClockUI (unlocks at 5 results) and EnthalpyUI (unlocks on complete). MockPaper component reused unchanged.
- Gate probe/mock2.py 13 checks exit 0 (VERIFIED). Every experiment now has: guided steps + a mock paper (titration/clock/enthalpy) or evidence-marked ID (qual).

## iter-23 (2026-08-12)
- F21 Learner's Guide course: src/lib/course.js (9 milestone units w/ state checks,
  localStorage chemlab-course-v1), CoursePanel.jsx + CourseTracker, store slices
  courseDone/courseOpen/courseMarkDone + mockResults/recordMockResult (MockPaper submits
  record). Menu 🎓 card with {n}/9 badge.
- BUG found by gate: Start left courseOpen=true → panel overlay re-covered menu on return,
  probe click-retry hang. Fix: start() calls setCourseOpen(false). Lesson: any full-screen
  overlay must close itself on navigation it triggers.
- probe/course.py 19 checks GATE PASS (VERIFIED). reg23 full regression: 16/16 gates =0 on
  this bundle (VERIFIED /tmp/reg23-summary.log) → 17 gates total now.
- F22 CI: vendored all 17 gates to tests/gates/ (CHEMLAB_DIST/CHEMLAB_SHOTS env override,
  sandbox defaults intact), tests/run_gates.py runner, .github/workflows/ci.yml
  (build → gates → artifacts → deploy from repo secrets → live-hash verify). Appwrite
  secrets set on repo via API (VERIFIED 201). F22 stays false until first Actions run green.

## iter-24 (2026-08-12)
- F23 Gravimetric analysis (MgSO4·xH2O, 9701 P3 Q2 style): src/lib/grav.js model +
  markX own-results marking, grav store slice (phase machine idle/heating/cooling,
  one-reading-per-cycle guard), GravScene (Bunsen/tripod/crucible glow+steam/balance),
  GravUI, gravSteps guide, menu card. Gate probe/grav.py 28 checks PASS (VERIFIED).
- Model bug caught by gate: waterLeft() off-by-one (heats=1 read fraction[1]) — masses
  skipped 24.83. Fixed with heats-1 indexing; sequence VERIFIED via node import.
- USER-REPORTED BUG: burette dripped with stopcock closed. Cause: <Drop active={isRunning
  && !tapOpen}> — drip animation keyed to phase, not to actual flow. Fix: drop renders
  only ~1 s after buretteReading actually changed (tip drain), store `dripping` flag +
  hidden tip-drip marker; tap.py now checks drain-on (1) and closed-dry (0,0). Audited
  Clock/Enthalpy (DragTipper pours only while dragging) and Qual (Dropper per test) —
  no equivalent always-on flows. Lesson: never key fluid visuals to experiment phase.
- Vendored tap.py + grav.py into tests/gates/; grav added to run_gates.py list.

## iter-25 (2026-08-12)
- F24 graphics/mobile: ULTRA quality tier (opt-in only, never auto-detected; soft
  shadows, dpr 2.5, 4096 shadow maps, ContactShadows, env res 256 + extra
  Lightformers), quality persisted (chemlab-quality); zoom +/- DOM buttons dollying
  via OrbitControls ref; FIXED broken touch mapping (touches={ONE:2,TWO:512} was
  nonsense enum values — pinch did nothing; now THREE.TOUCH.ROTATE/DOLLY_PAN);
  landscape phones: GuideCoach auto-collapses below 501px height (gate proved the
  open guide covered the 5/1 cm3 dispense buttons at 844x390 via elementFromPoint).
- New animations: titration drop splash ripple (expanding fading ring at surface),
  grav Bunsen point-light flicker while heating.
- Gate probe/gfx.py 15 checks incl. pixel-diff proof ultra != high and zoom
  in/out inverse. Vendored to tests/gates, added to runner (19 gates).
- Push HELD until CI run 31571702300 (7b5a5be) concludes — pushing would cancel
  it (concurrency) and F22 needs a green run first.

## iter-26 (2026-08-12)
- F25 Molar Gas Volume: src/lib/gas.js (Vmax 83.92, k 0.02, purity vs learner's OWN final volume ±2%), GasScene.jsx (flask+fizz+delivery tube+100cm3 syringe, slim steel stand w/ cradle rings), GasUI.jsx, menu card 💨, gasSteps guide, course unit (11 units total). probe/gas.py 25/25 PASS (VERIFIED).
- Scene polish after screenshot review: camera pulled back [-0.06,0.3,0.74], apparatus shifted left, black slab stand → cylinders+torus rings, plunger seal lightened. Gate re-run green.
- GuideCoach: starts collapsed on mobile portrait too (max-width 767px) — fixed tap interception on gas-start at 390x844. guided.py mobile section rewritten to gate collapse both ways; course.py 11 units.
- CI timeout fix: tools/vendor_gates.py vendors probe/*→tests/gates/* with CHEMLAB_TIMEOUT_MS (ci.yml sets 120000) + best-effort evidence shots; assertions untouched. All 20 gates re-vendored.

## iter-27 (2026-08-12)
- F26 Organic Analysis (P3 Q4 style): src/lib/organic.js (5 unknowns FA10-14, 7 deduction tests, unique observation rows VERIFIED via node, markOrganic = class mark + evidence mark keyed to deciding tests), OrganicScene (rack, water bath w/ steam during warm tests, Tollens' silver-mirror tube, dropper), OrganicUI, menu card 🍊, organicSteps guide, 12th course unit (course.py gate bumped 11→12, green).
- probe/organic.py 21/21 GATE PASS (VERIFIED /tmp/g27b.log, /tmp/g27c.log after mirror-material fix — metalness-only mirror rendered black under SwiftShader; use lower metalness + slight emissive).
- Vendored organic gate into tests/gates + runner GATES list (CI now 21 gates).

## iter-29 (2026-08-12)
- F27 Electrochemical Cells: lib/scene/UI/store/guide + 13th course unit. probe/electro.py GATE PASS (VERIFIED /tmp/g29b.log).
- Menu clipping fix: removed justify-center+overflow clip, my-auto wrapper; spot regression course/electro/organic/gas all exit 0 (VERIFIED /tmp/g28b.log).
- Voltmeter recentred to [-0.05,0,0.18] after screenshot review showed it clipped behind panel (VERIFIED electro-marked.png).
- NEW standing decision (Tapiwa): review models from multiple angles. 4-angle orbit review of electro scene done (electro-angles-grid.png) — found shelf plank invisible from reverse angle (single-sided material) → queued for iter-30.
- Vendored electro gate into tests/gates/, added to run_gates.py GATES (22 CI gates).

## iter-30 (2026-08-12)
- OrbitControls azimuth clamp ±π/2.15 (LabViewport.jsx) — multi-angle review found orbit could
  leave the room (single-sided back wall vanishes from behind). 4-angle grid re-verified coherent.
- Spot regression: titrate=0, gfx=0, meniscus_mobile=0; pour failed → investigated:
  VERIFIED engine sim rate exactly 5x (8.06s real → 38.7s sim via button start, no screenshots).
  Root cause: probe timing — SwiftShader full-scene screenshots post-pour now cost ~5-7s real
  (~30s sim), so the 40s (0.100 M) reaction completed before the "Reacting" assertion.
- Fix: pour probe selects 0.020 M (200s sim endpoint = 40s real) before dragging; assertions
  unchanged. Gate PASSES 4/4 serially. Vendored to tests/gates/pour.py.
- Learning: sim-speed-dependent gates must use the slowest variant; parallel gate runs stretch
  sleeps ~10x under SwiftShader — only trust serial runs for timing-sensitive gates.

## iter-31 (2026-08-12)
- F28 paper chromatography: lib/chroma.js (5 dyes E102/E110/E122/E127/E133, unknowns fb20-24 as
  unambiguous pairs, markChroma = dye set + Rf ±0.05 with developed-run evidence rule), ChromaScene
  (tank, hanging paper, eased solvent front, migrating/elongating spots, ruler scaled to front
  travel so 8.0 cm lands on the 8 mark), ChromaUI (readings table with Rf inputs, reference table,
  dye toggles), guide 5 steps, 14th course unit, menu card 🌈.
- Gate probe/chroma.py 17/17 PASS; course gate updated 13→14 and PASS; electro spot-check PASS
  (menu with 9 cards not clipped). Multi-angle grid coherent (shots/chroma-angles-grid.png).
- Probe-side guide check must count guide-step[data-done] — the open panel's toggle reads "Hide".
- User granted multi-agent use in the gauntlet (2026-08-12 10:52); subagents now allowed for
  parallel regressions/research; single-agent harness note overridden for this project.
