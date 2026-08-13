
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

## iter-32 (2026-08-12)
- Marketing/SEO: robots.txt + sitemap.xml, JSON-LD WebApplication structured data, meta refreshed
  to nine practicals (incl. electro + chromatography). Offline gate re-PASS after public/ changes.
- Subagent regression attempt: workspace out of credits for subagent execution
  (spawn_subagent -> status='out_of_credits') — full-sweep verification delegated to CI instead.

## iter-33 (2026-08-12)
- F29 flame-test enrichment practical: five chloride unknowns (Li/Na/K/Ca/Cu), animated
  non-luminous Bunsen flame, realistic nichrome loop + acid-clean/blank/load/observe procedure,
  colour-text observations for accessibility, sodium-contamination masking, and cobalt-blue-glass
  diagnosis. Explicitly labelled enrichment because the current 9701 P3 QA notes do not tabulate
  flame colours; Cambridge syllabus and RSC technique checked before implementation.
- Evidence-based marking: correct ion = 1 mark, clean-loop sample observation = second mark.
  Direct dirty-loop guessing scores only 1/2. Guide 5 steps; learner course now 15 units.
- New flame gate covers dirty mask, colourless-blank interlock, K lilac, Na yellow, cobalt filter,
  marking, guide, unknown reset and 390x844 mobile. `tests/run_gates.py course flame` = 2/2;
  spot regression offline/electro/chroma/flame = 4/4; lint/build and pure chemistry invariants green.
- Screenshots inspected: flame-lilac/sodium/mobile and four-angle grid. Multi-angle pass found
  idle-loop composition too tall and the hot-zone placement implausible; holder was lowered,
  extended and repositioned across the inner-cone tip before the final gate.

## iter-34 (2026-08-12)
- F30 simple distillation enrichment: 20 cm³ blue CuSO₄(aq), supported round-bottom flask,
  electric heater, still head with correctly positioned thermometer bulb, downward Liebig
  condenser, labelled lower inlet/upper outlet, second condenser support and open receiver.
- Physics/safety: 22→100 °C heat-up then water-boiling plateau; condensate starts only after the
  plateau; lower-inlet cooling is 95% efficient, reversed flow 55%, cooling off 0%; anti-bumping
  granules prevent violent boiling. Cooling direction locks while hot and granules cannot be
  added after heating starts. Marking awards lower-inlet flow, granules, and ≥5 cm³ colourless
  distillate recorded at 98–102 °C (3 marks).
- Research checked the current Cambridge 9701 syllabus and RSC/standard apparatus guidance;
  feature is honestly labelled enrichment because simple distillation is a theory/separation
  outcome, not one of the standard current Paper 3 quantitative categories.
- Verification: pure model invariants green; lint/build green; course + distill gates 2/2,
  including 16 course units, reversed-flow warning, 100.0 °C plateau, bumping safety and mobile.
  Two four-angle passes: first exposed oversized framing and unsupported condenser; camera pulled
  back and a dedicated second support added. Revised multi-angle grid is coherent.

## iter-35 (2026-08-12)
- F31 KNO₃ solubility-curve investigation: five assigned mixtures containing 7.0–30.0 g KNO₃
  in 20.0 g water, hot-water bath, clamped boiling tube, thermometer, stirring rod and live
  digital readout. The learner heats until clear, cools to the first crystals, records to 0.5 °C,
  calculates g solute per 100 g water and accumulates measured crosses on an offline SVG curve.
- Model linearly interpolates a six-point school-lab KNO₃ table (13.25, 31.66, 63.9, 109.9,
  169.0, 245.2 g per 100 g H₂O at 0–100 °C). SC2's 50.0 g/100 g saturation point is 31.38 °C.
  Premature records are locked; a guessed calculation earns only 1/3. Slow cooling gives larger
  crystals; crash cooling is faster but warns that fine crystals can trap impurities; scratching/
  seeding provides a nucleation route.
- Research cross-checked the Cambridge 2025–2027 syllabus practical expectations (temperature to
  0.5 °C, tables, graphs, subtle solubility/quantity observations), a school KNO₃ curve procedure,
  and RSC recrystallisation guidance. It is honestly labelled a temperature investigation rather
  than a specific past-paper question.
- Verification: all five model cases green; lint/build green; course + solubility gates 2/2,
  including 17 course units, 19 practical assertions, two persistent graph points and mobile.
  Four-angle review found the thermometer bulb initially too high; stem was lowered into solution.

## iter-36 (2026-08-12)
- F32 catalytic H₂O₂ decomposition kinetics: 5.0 cm³ H₂O₂ in a bunged conical flask,
  0.20 g MnO₂ and a supported 100 cm³ gas syringe; automatic O₂ readings every 20 s
  to 180 s, persistent multi-curve SVG graph and initial-gradient comparison. Five fair-test
  presets vary concentration, catalyst presence, catalyst surface area or temperature one at
  a time. Guide 5 steps, evidence-based 3-mark conclusion and 18th learner-course unit.
- Chemistry correction caught during screenshot critique: the first model forced every run to a
  60 cm³ plateau, so doubling [H₂O₂] changed rate but not stoichiometric gas yield. Corrected to
  n(O₂)=0.5cV at 24.0 dm³ mol⁻¹: 0.50 M control max=30.0 cm³ and 1.00 M max=60.0 cm³;
  both reach ~98% at 180 s. A 5.0 cm³ sample keeps every preset inside a 100 cm³ syringe.
- Scene critique: removed duplicate dressing props, bounded the plunger assembly inside the
  barrel, added catalyst-on-weighing-paper before start, and cropped mobile canvases above the
  bottom sheet instead of rendering the scene invisibly behind it. Four revised orbit angles and
  390×844 composition inspected.
- Verification: pure-model invariants, lint and build green; peroxide gate 20 checks green after
  one honest retry (first threshold expected 59 but model gave 57.5, so rate constant was raised
  to reach the visible three-minute plateau without weakening the assertion). Affected regression
  offline/guided/gfx/gas/distill/solubility/course/peroxide is 8/8 green. Evidence:
  /tmp/chemlab-iter36-peroxide-retry.log, /tmp/chemlab-iter36-spot.log,
  shots/peroxide-marked.png, peroxide-mobile.png and peroxide-angles-grid.png.

## iter-37 checkpoint (2026-08-12)
- Replaced the internal experiment menu with a production-oriented, mobile-first landing
  page: outcome-led hero, real catalytic-kinetics capture, verified 13/18/3/offline proof,
  guided-learning path, phone/offline section, complete filterable library, FAQ, quality
  controls and an independent-product disclaimer. Existing experiment/course/quality
  locators remain present.
- Added deterministic 1200x630 social artwork, a matching cyan flask favicon, canonical
  and social metadata, a landing-specific Playwright gate, and registered gate 28.
- Critique fixes made before checkpoint: all five featured cards now remain visible on
  phones; library categories state 7 Cambridge 9701 exam-skill practicals and 6
  enrichment practicals honestly; browser pinch/page zoom is no longer disabled; visible
  focus, skip navigation, reduced motion, touch targets, short-landscape CTA fit and
  low-contrast microcopy were addressed.
- VERIFIED on current source: ESLint green, `git diff --check` green and landing/social
  Python scripts compile. A pre-final-build serial sweep completed 12 gates green
  (offline, course, gfx, titrate, clock, enthalpy, guided, mock, qual, mock2, grav, gas)
  before being stopped at a safe boundary; this is supporting evidence only because the
  dist predates the last accessibility/filter edits.
- NOT YET VERIFIED: final current-source build, landing gate retry, full 28-gate run,
  trustworthy below-fold desktop/portrait/landscape screenshot review, commit/push,
  Actions/deployment and live-bundle verification. F33 and F22 correctly remain false.
- First current-bundle landing run exposed a gate-selector defect after the product
  filter counts themselves passed: `FAIL library distinguishes exam skills and
  enrichment`, followed by strict-mode failure because `get_by_role("button",
  name="All 13")` matched both the filter and “View all 13 practicals”. The gate
  was corrected to scope exact button names inside `.library-filters`; assertions
  and expected 7/6 counts were not weakened. Evidence:
  `/tmp/chemlab-iter37-landing-retry.log`.
- The selector-corrected run proved the filters and nearly every desktop/mobile/
  landscape assertion, then exposed two order-dependent gate failures:
  `FAIL primary CTA reaches practical library 3721->3806` and
  `FAIL skip link is first visible keyboard target {'active': False, ...}`.
  Earlier filter clicks had scrolled and focused controls before checks that require
  a fresh top-of-page state. The gate now resets scroll and focus explicitly before
  those checks; the CTA delta and skip-link expectations are unchanged. Evidence:
  `/tmp/chemlab-iter37-landing-selector-retry.log`.
- The first scroll/focus reset still failed with `3721->3785`; assigning
  `scrollTop = 0` itself animated because the scroll container declares smooth
  behavior. The skip link was correctly focused with a solid outline but was
  measured before its 160 ms reveal transition (`top: -51.2`). The identical
  retry budget was exhausted, so the gate setup was structurally isolated:
  setup scrolling now temporarily uses `scroll-behavior: auto`, and visual
  focus is measured after the declared transition. Required destination delta,
  outline and non-negative top assertions remain unchanged. Evidence:
  `/tmp/chemlab-iter37-landing-state-retry.log`.
- Trustworthy section-by-section screenshot capture (internal scroll container,
  not `full_page=True`) found the page coherent across desktop, 390x844 portrait
  and 844x390 landscape, with all five phone feature cards visible. Critique also
  found anchored mobile sections could place their heading under the 70 px header.
  Added matching responsive `scroll-margin-top` to all navigation targets and a
  landing-gate assertion for the `#offline` deep-link clearance. Screenshot sets:
  `shots/landing-sections-iter37/` and `shots/landing-aligned-iter37/`.
- The first anchor assertion sampled during smooth scrolling and therefore saw the
  heading still far below the viewport; a timed trace showed the animation settling
  after ~1 s with the heading at y=180.7, safely below the 70 px header. The gate now
  measures after 1.4 s rather than accepting an in-flight position; the clearance
  criterion itself is unchanged.

## iter-38 checkpoint (2026-08-12)
- Added the 14th practical: iodine–propanone timed rate followed by residual-I₂
  titration with 0.0100 mol dm⁻³ Na₂S₂O₃. Learners withdraw 25.0 cm³, add
  NaHCO₃ at 80 s, dilute to 150.0 cm³, complete one rough plus two concordant
  accurate titres and calculate [I₂] plus average rate from their own mean.
- The model makes technique consequential: removal alone leaves the acid-catalysed
  reaction running; bicarbonate freezes it; early starch creates a persistent
  blue-black complex and a 0.60 cm³ visible-endpoint lag; closed stopcocks are dry.
  Evidence marking awards 10 marks with error-carried-forward calculations.
- Added a five-step coach, 19th persistent course unit, two-stage 3D apparatus and
  responsive portrait/landscape controls. Four-angle critique exposed overlapping
  preparation/titration props and distant framing; depth separation and camera were
  corrected. Quench bubbles were enlarged and labelled after state-shot critique.
- VERIFIED: official 2025–2027 syllabus plus 9701/34/O/N/24 question/mark scheme
  informed the technique; pure model invariants are green; dedicated browser gate
  is green with a 79.6 s quench, early invalid 26.95 cm³ rough, concordant
  26.40/26.30 cm³ accurate titres, dry closed stopcock, 10/10 marking, guide 5/5,
  course unit 19, 390×844 and 844×390 checks.
- Landing proof now reads 14 practicals / 19 milestones / 3 mock papers / offline
  shell. Final landing gate is green: all 14 cards, 8 exam-skill + 6 enrichment,
  desktop/portrait/landscape overflow and CTA checks, keyboard focus, deep-link
  clearance, reduced motion and truthful-copy checks. Course, offline and ULTRA/
  zoom spot gates are green on the same frozen build.
- Frozen production build: Vite 8.2.1, 628 modules, 22 unique PWA entries
  (2119.38 KiB), index bundle `assets/index-DCwjovJc.js`; immutable manifest stayed
  identical across the iodine and spot gates. Lint, two npm audits, Python compile,
  bounded-screenshot audit, actionlint 1.7.12 and `git diff --check` are green.
- NEXT: one serial 29-gate run against this exact immutable build. Do not rebuild
  during it. Only then mark F33/F34, commit/push and verify all four CI shards,
  Appwrite deployment, live hash/counts, robots.txt and sitemap.xml.

## iter-38 release evidence (2026-08-12 ~16:50 CAT)
- Full 29-gate verification on frozen build assets/index-DCwjovJc.js:
  - 10 gates green earlier (gfx gas organic electro chroma flame distill solubility peroxide iodine_rate).
  - 19 remaining gates re-run serially after an operator port-8797 collision (not a product defect):
    19/19 green (/tmp/chemlab-iter38-rerun19.log); mock2 slowest at 169s.
  - dist manifest identical before/after every run (immutable build: PASS).
- F33 and F34 flipped true with gate evidence. Still false: F5 (AAA look), F22 (flips only after
  Actions run is green, Appwrite deploy succeeds, and live hash/counts/robots/sitemap verify).
- Committing combined iter-37 landing + iter-38 iodine-rate release next.

## iter-39+40+41 (2026-08-12) — CI pacing fix: sim-delta clamp + sim-paced gates
Problem: Actions run 31609023837 failed shards core/interaction/library. Two causes:
(1) sim clocks ticked raw frame delta, so multi-second SwiftShader frames skipped
sim time (`FAIL 80 +/- 1 s quench freezes timer: 87.7`); (2) CHEMLAB_TIMEOUT_MS
doubled as action+screenshot budget.
- iter-39: new src/lib/simClock.js (MAX_SIM_FRAME_SEC=0.1, clampSimDelta) applied in
  Chroma/Clock/Distill/Gas/Peroxide/Solubility/IodineRate/Titration scenes; 30 gates
  gained CHEMLAB_SHOT_TIMEOUT_MS + LOW-quality seeding; ci.yml probe env
  TIMEOUT 60000 / SHOT 15000 / QUALITY low. VERIFIED: lint, py_compile, snap audit,
  iodine model 10/10, iodine gate smoke PASS.
- iter-40: clamp means slow renderers slow the sim (correct product), so gates must
  pace on the displayed sim clock, never wall deadlines. graph/mock2/gas/peroxide
  rewritten with progress-aware waits + 20 s stall guards; ClockUI gained
  data-testid="clock-time" (only product change, additive). Full 29-gate run
  (/tmp/chemlab-iter40-full29.log): 28/29 — graph 80s, mock2 391s, peroxide 163s all
  fixed; gas FAIL.
- iter-41: gas FAIL verbatim: `FAIL constant volume reached` + Page.fill timeout on
  gas-purity-input; 230 readings ending 84.0. Cause: gate clicked Record ~every
  wall-s (~3 sim-s apart under SwiftShader); isConstantVolume needs last two
  readings >=20 sim-s apart, so the product CORRECTLY never declared constant.
  Fix (gate only): space Record clicks >=25 sim-s apart like a real learner.
  VERIFIED: gas retry GATE PASS (8 readings, constant at ~235 sim-s, own-volume
  purity 86.5% accepted) against the identical frozen dist
  (sha256sum -c /tmp/chemlab-iter40-build.sha256 → 25/25 OK, bundle index-DB4lvl8F.js).
- Local total: 29/29 gates green. Chemistry constants and assertions untouched.

## iter-42 (2026-08-12)
Root cause of all 7 CI shard failures (run 31627328808): CI runners ~2.5x slower than sandbox; sim-delta clamp slows sim proportionally, but failing gates still paced on wall clock. VERIFIED per-gate verbatim failures logged in PROJECT.md triage.
Fixes (gates + CI config only, zero product changes):
- run_gates.py: per-gate cap env-tunable CHEMLAB_GATE_TIMEOUT_S (default 900); ci.yml sets 1800.
- clock.py: record-button pacing on displayed clock-time testid, 600s cap, 20s stall guard.
- tap.py: hold loop 300s cap w/ reading-progress stall guard; drain marker polled up to 10s; waits for drain end before flow-stops assert.
- chroma.py: wait_complete 90->600s; pg2.set_default_timeout.
- flame.py: pg2.set_default_timeout (pg2 does NOT inherit default timeout).
- distill.py: wait_volume 90->600s w/ stall guard; temp-rise polls up to 60s; bumping loop 60->300s; pg2 timeout.
- solubility.py: 25s waits -> 300s.
- iodine_rate.py: sim-time waits -> 300s; removal-no-quench check polls until displayed clock ticks past baseline (30s cap).
Evidence: local rerun of all 11 affected gates vs frozen dist (index-DB4lvl8F.js): 11/11 PASS (/tmp/chemlab-iter42-fixed11.log; mock2 386s, gas 137s, graph 78s, peroxide 164s). Dist manifest 25/25 OK vs iter-40 sha256. VERIFIED.

## iter-43 (2026-08-12) — drain-window product fix + full CI sanity audit
- Actions run 31636085980 improved core to 7/7 but interaction failed only
  `tap`, verbatim: `FAIL tip drains briefly after release 0`. Root cause was
  product timing, not chemistry: `TitrationScene` measured the ~1 s tip-drain
  state with `clock.getElapsedTime()`, and one slow CI frame could skip that
  whole window. The drain now accumulates clamped simulation delta; the closed
  stopcock remains dry and no gate assertion changed.
- VERIFIED locally on rebuilt bundle `assets/index-Bc6WPutc.js`: exact tap
  regression PASS (`tip drains briefly after release 1`), then the complete
  interaction shard 7/7 PASS.
- The same old CI run's library shard later failed only when opening phone
  pages: desktop flame/distillation assertions were complete, then
  `[data-testid="flame-acid"]` and
  `[data-testid="distill-cooling-lower"]` never mounted within 60 s. Audit
  found those gates kept the heavy desktop WebGL page alive while mounting a
  second SwiftShader canvas. All eight remaining desktop→mobile gates now
  close the first page before opening the second, matching organic/electro's
  already-safe pattern; product assertions are byte-for-byte unchanged.
- Static sanity checks green: ESLint, Python compile, all gate ASTs,
  bounded-screenshot audit, `git diff --check`, actionlint, both npm audits
  (0 vulnerabilities), iodine-rate model invariants, and canonical shard
  coverage. The old assessment job approached the 75-minute outer cap, so
  the next workflow splits assessment and library into smaller jobs and gives
  `mock2` its own `mock-clock` runner: 7 total shards covering 29/29 gates
  exactly once in canonical order. The old run proved mock2's clock half
  correct but hit its 1800 s per-gate cap before enthalpy (`gate mock2
  exceeded 1800s hard timeout`); isolation removes cross-gate resource
  contention and allows a dedicated budget without holding every gate open.
- VERIFIED multi-page audit on frozen bundle `assets/index-Bc6WPutc.js`: all
  eight changed gates PASS (chroma, flame, distill, gas, grav, guided, qual,
  read), and its 25-file manifest remained byte-identical.
- Final clean build after the reset/unmount hardening:
  `assets/index-YfwhpEog.js`, Vite 8.2.1, 629 modules, 22 PWA entries,
  2119.53 KiB. Exact final tap gate PASS: drain appears after real flow,
  closes dry, flow stops, reset returns 0.00 and does not manufacture a drain.
  The final 25-file build manifest remained byte-identical across the gate.
- Ready to commit/push. F22 remains false until the fresh 7-shard workflow,
  Appwrite deploy and live bundle/count/robots/sitemap/disclaimer checks pass.

## iter-44 (2026-08-12) — resilient first paint + explicit soft 404
- Added a zero-JavaScript HTML first paint using only ChemLab brand tokens:
  accessible live status, flask mark, progress treatment and truthful copy
  ("About 1 MB compressed"). CI independently gzips every dist file and fails
  above 1.1 MB; current rebuilt dist is 979800 bytes.
- Added a deliberate unknown-route surface with `noindex, nofollow`, explicit
  page title, canonical-root return action and independent-Cambridge
  disclaimer. It stays inside 390x844 and uses a 48 px primary target.
- Registered the new `shell` gate (canonical total 30): JavaScript-disabled
  phone first paint, static-host SPA fallback, title/meta, desktop + phone fit,
  disclaimer/return behavior. VERIFIED 1/1 PASS on
  `assets/index-DmeZA8-k.js`; screenshots inspected from all three states.
- F35 added and passing with this evidence. This work remains uncommitted until
  iter-43 CI/deploy/live verification finishes, so a new push cannot cancel it.
- Verification-command failure (no product defect): the first immutable-build
  retry quoted `dist/index.html: FAILED open or read` because the generated
  manifest incorrectly retained `dist/` prefixes while being checked from
  inside that directory. Regenerated relative to `dist/` and reran once.
- Verification-command failure (no product defect): attempted an undocumented
  `tests/run_gates.py --validate-shards` CLI; runner correctly rejected it as
  an unknown gate. The shard validator is importable rather than a CLI flag;
  reran through its actual API.
- Final iter-44 pre-commit evidence is green on one frozen build: ESLint,
  Python compilation, actionlint, `git diff --check`, 30/30 unique canonical
  shard coverage, 979800-byte compressed dist, immutable manifest, shell 1/1
  twice and serial landing/offline/shell 3/3. Bundle remains
  `assets/index-DmeZA8-k.js`.
- Iter-43 release gate resolved independently before this release: GitHub
  Actions run 31641582393 completed success at 2026-08-12T21:46:45Z (build,
  all seven probe shards and deploy green). Hard live checks then matched
  `assets/index-YfwhpEog.js`, the 14-practical/19-unit landing claim, robots
  sitemap declaration, canonical sitemap URL and runtime independent-product
  disclaimer. Iter-44 is therefore cleared to commit and push.
- Release-command failure (no product defect): the frozen-build manifest had
  expired from temporary storage before commit, so `sha256sum` could not open
  it. Regenerated the manifest from the unchanged build, reran the focused
  shell/landing/offline gates once, and required that new sentinel to pass.
- Focused-gate rerun failed before opening the product (no product defect):
  Playwright reported `Executable doesn't exist at .../chromium_headless_shell-1234`
  because this restarted environment did not inherit the existing Chromium
  cache location. Retried once with `PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright`.
- Fresh GitHub Actions run 31670636955 completed success: build, all seven
  unique probe shards and Appwrite deploy green. Independent live checks
  matched `assets/index-DmeZA8-k.js`, `14 interactive Cambridge`, the canonical
  robots sitemap declaration, root sitemap URL and runtime independent-product
  disclaimer. Iter-44 is fully released; later local iterations may now push
  without cancelling it.

## iter-45 (2026-08-13) — portable learner progress
- First dedicated progress-gate run failed: `FAIL download carries course
  milestones`, then `KeyError: 'titration-s22'`. Root cause was the probe's
  `add_init_script` seed being overwritten by the service worker's navigation
  lifecycle before store initialisation; this was test setup, not product
  behaviour. Retry seeds localStorage on a loaded page and reloads once before
  asserting the exported state.
- The one allowed progress-gate retry reached the product but still failed two
  test expectations: mock scores correctly auto-completed their corresponding
  course milestones, so the backup contained four valid milestones rather
  than the probe's expected exact two, and reload showed five rather than
  exact three after import. Product merge/persistence assertions themselves
  passed. Per the two-iteration no-diff guard, stop retrying this gate; amend
  the next verification run to assert required milestone subsets and
  non-decreasing counts, not an invalid exact count.

## iter-46 (2026-08-13) — hands-on setup + reference-led realism
- First setup-gate run progressed through all five ordered placements and
  proved the pre-assembly chemistry lock, then timed out reading
  `[data-testid="setup-step-flask"]` after the final placement. That element
  correctly unmounts when the ready confirmation replaces the setup panel;
  this is a probe lifecycle mistake, not a product failure. Retry asserts the
  ready state after the final click and step attributes only for intermediate
  placements.
- The allowed setup-gate retry proved the full valid assembly, unlocked
  dispensing and captured the assembled desktop view, then exposed a real UX
  omission: once ready, the setup panel (and its Reset action) unmounted, so
  there was no way to rebuild without toggling the mode twice. Added a
  persistent 44 px `Rebuild` action to the ready confirmation. No third retry
  is claimed; the next frozen-build regression will verify this product fix.
- Next rebuilt bundle `assets/index-BXfeyyry.js` passed the serial affected
  regression 9/9: progress, setup, titrate, tap, meniscus, meniscus_mobile,
  offline, landing and shell. Setup specifically passed default compatibility,
  ordered five-part placement, chemistry lock/unlock, 44 px rebuild/reset,
  desktop/390x844 fit; the corrected closed-stopcock drain regression also
  remained green. A later DOM drag surface and reduced-motion snap were added,
  so final frozen-build verification is still required before F36/F37 pass.
- Reference log now covers ISO 385, RSC procedure/video notes and manufacturer
  dimensions for a 50 mL burette, retort stand/clamp and 250 mL flask, plus a
  ranked interaction rollout for all 14 practicals. The shared flask now uses
  the documented 85×145 mm envelope with reinforced rim/markings; the retort
  stand has a weightier base, boss knob and sleeved articulated jaws. The
  burette now has half-millilitre whole-bench marks (the meniscus view retains
  true 0.1 mL subdivisions) and a strengthened top bead. A
  front/side/three-quarter/portrait/landscape review led to lowering the jet
  close to the flask neck, reducing the nominal 25 cm³ fill and moving the rod
  rearward to remove implausible gaps/intersections. These are source-led
  visual/procedural improvements, not certified CAD replicas.
- Verification-run failure (no product verdict): a final affected-suite launch
  collided with the just-finished prior gate server and every gate quoted
  `OSError: [Errno 98] Address already in use` before opening ChemLab. The
  runner proceeded through all names, so this is one environmental launch
  failure rather than nine product attempts. Wait for the port to release and
  permit one clean retry against a frozen build; never count this run.
- Shared placement control was extracted and its pointer-critical state moved
  to synchronous refs so rapid real pointer sequences cannot read a stale
  React closure. The rebuilt titration setup gate then passed 22 checks,
  including rejected off-target and accepted aligned DOM drag, all ordered
  fallbacks, valid-assembly unlock, Rebuild and 390x844 fit.
- The 12-gate frozen release suite finished 10/12 green and the dist manifest
  stayed byte-identical. Progress, titration, meniscus desktop/mobile, course,
  all three mocks, offline, landing and shell passed. Setup and tap failed on
  brittle screen-coordinate pointer assertions after the source-led camera/
  apparatus repositioning: setup's DOM drag had already passed separately on
  the same source, while tap's hard-coded `(572,380)` no longer hit the moved
  stopcock. This is not release evidence: replace hard-coded 3D coordinates
  with product-visible DOM affordances/locators, exactly the usability issue
  raised by the external review, then run a new frozen build.

## Iteration 48 — 2026-08-13
- Fixed iter47 failures: TitrationUI bottom control container was full-width pointer-events-auto and swallowed the meniscus trainer Check click → container now pointer-events-none, interactive children auto. (VERIFIED: meniscus gate PASS)
- Gate infra fixes (no check weakening): solubility/peroxide/iodine_rate/gfx replaced reload(networkidle) with goto launcher + wait for experiment-library testid (routes made reload land on practical URLs; SW keeps networkidle from settling); snap() Path/str concat fixed.
- Five-gate rerun: 5/5 PASS (.harness-evidence/iter48-five.log).
- Rebuilt dist (main-CR6-CUdt.js), froze manifest (.harness-evidence/iter48-dist.sha256).
- FULL 34/34 GATE SUITE GREEN on frozen build (.harness-evidence/iter48-full.log); manifest verified unchanged post-suite; screenshots reviewed (landing, mocks, setup desktop/mobile, WebGL fallback, progress card, mock marking).
- Flipped F36 (portable progress) and F37 (hands-on setup/realism) with evidence. F5 (AAA look) and F22 (CI/deploy/live) remain false — F22 flips only after push + green Actions + live verification.

## iter-49 (2026-08-13)
- CI run 31693978708 (1c49792): 6/7 shards green; interaction shard FAILED on
  pour "timer advancing". VERIFIED from job logs: both evidence screenshots
  timed out at 15 s (starved SwiftShader runner), then the single fixed-1.0 s
  body-text comparison saw no repaint. Same build passed pour locally (34/34).
- Fix (no check weakening): pour.py now polls [data-testid="clock-time"] for
  an increase over a 20 s window instead of one fixed-sleep body snapshot.
  Same product assertion; stall-tolerant probe. VERIFIED locally: 4/4 PASS
  against frozen iter48 dist; dist manifest re-verified unchanged (MANIFEST-OK).
- Commit 5b6db52 pushed; new CI run 31695756758 pending. F22 stays false until
  a fully green Actions run + Appwrite deploy + independent live verification.
