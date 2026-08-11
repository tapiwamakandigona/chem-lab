# progress.md — append-only

## 2026-08-11 iter-0 (baseline)
- Cloned, npm install, vite build green (4.2s, chunk >500kB warning).
- Probe shots: menu fine (clean dark UI). Titration: NO 3D AT ALL — drei
  <Text> loads JetBrains Mono from fonts.gstatic.com, fetch fails in
  sandbox, troika suspends inside <Suspense> → whole scene group never
  mounts. Clock/enthalpy render but bench is blown-out white (Environment
  preset="studio" = runtime HDR fetch + untuned lights), apparatus ghostly,
  beaker labels missing (same font issue), <Stats/> FPS widget overlaps UI
  top-left in HIGH quality.
- VERIFIED: console error "Failure loading font ...gstatic...". Baseline
  shots: shots/base-*.png.
- Critique vs bar: menu is passable; scenes are far below PhET/Labster —
  unlit-looking primitives, no camera composition, no readable graduations.

## 2026-08-11 iter-1 (offline-first + render correctness)
- Bundled subset JetBrains Mono WOFF (30K, public/fonts/chemlab-mono.woff,
  digits+latin+sub/superscripts+Δ°×→); all <Text> now font={LAB_FONT} via
  src/lib/labFont.js. Removed Environment preset="studio" (runtime HDR fetch)
  → procedural <Environment><Lightformer/> (bundled, zero network). Removed
  <Stats/>. Deleted dead parallel tree (src/scenes, components/apparatus,
  components/ui, store/labStore, App.css) — held last gstatic ref.
- Fixed all 4 lint errors properly (no check weakening): ClockScene turbidity
  now derived from store state instead of ref-in-render; ClockUI/EnthalpyUI
  setState moved from effects into handlers.
- VERIFIED: lint 0 problems; vite build green; probe with ALL non-localhost
  requests aborted renders every scene (dbg4-clock-45s.png shows labels from
  bundled font). GSUB "LookupType 6" console debugs are benign Typr noise.
- PROBE LESSON: SwiftShader needs ~10s after scene click before screenshot;
  6s gives a false blank. gl.readPixels from probe JS stalls SwiftShader
  indefinitely — never do canvas readback, use PIL on screenshots.
- Critique vs bar: scenes now too DARK (bench near-black), camera frames
  bench edge-on with apparatus tiny/center-far, labels microscopic,
  glassware still primitive cones. Next: lighting grade + per-experiment
  camera composition.

## 2026-08-11 iter-2 (lab room + lighting grade + cameras)
- Shared scene/LabRoom.jsx (epoxy bench, maple apron, steel legs, floor,
  wall+stripe) replacing 3 copy-pasted LabBench defs. Bright teaching-lab
  light rig (warm key/cool fill/wall bounce + brighter Lightformer env).
  Per-experiment CAMERAS map in App.jsx; OrbitControls targets.
- VERIFIED: lint+build green; dbg5 renders with network fully blocked
  (frac 0.996 at 16s; probe settle must be ≥16s BLOCKED, shots at 12s gave
  false blank — updated shot.py to 18s).
- Critique vs bar (dbg5-titr-30s.png): burette towers out of frame (real
  apparatus scale ≠ my framing), flask = opaque grey cone (transmission
  renders grey under SwiftShader + costs too much on weak phones), pipette
  floats mid-air, stand base misaligned, wall stripe cuts composition at
  bench height. Scene is bright but amateur. Next: full titration apparatus
  rebuild (lathe glassware, no-transmission glass material, proper layout).

## 2026-08-11 iter-3 (titration apparatus rebuild) 
- New scene/glassware.jsx: lathe-profile Erlenmeyer + beaker + lying pipette,
  RetortStand (base under rod, boss head, brass jaws), WhiteTile. GLASS RULE:
  never `transmission` — opaque grey on SwiftShader/weak GPUs; transparent +
  clearcoat + envMapIntensity reads as glass everywhere. Burette rebuilt:
  56cm graduated tube, 51 tick marks + numerals (bundled font), correct
  liquid column (surface at reading, liquid below to stopcock), PTFE key,
  jet tip. Flask+burette+drop share one axis; stand behind-right. Colourless
  solution renders as water-tint (#d9edf8 @0.4), not milk. Skirting stripe
  moved below bench line. Camera [-0.68,0.52,1.55]→[0.14,0.4,0].
- F2 gate probe/titrate.py PASSES: 4x5 + 3x1 + 8x0.1 clicks → 23.80, +0.05
  → 23.85 endpoint, UI "Endpoint reached", flask pink (f2-endpoint.png).
  Endpoint pointLight cut 0.6→0.08 (was flooding the bench pink).
- VERIFIED: lint clean, build green, network-blocked probe renders.

## 2026-08-11 iter-4 (clock reaction: model + scene + gate)
- BUG FOUND: endpoint formula `(0.004/conc)*1000` = 40 MILLISECONDS at
  0.100 M (comment claimed 40 s) — reaction ended on frame 1. Also two
  desynced timers (store frame-ticks vs ClockUI Date.now interval).
- Fix: store owns time. CLOCK_TIME_SCALE=5 (sim time), K_CLOCK=4.0 =>
  t=4.0/[S2O3] s (0.100→40s, 0.020→200s sim). ClockUI displays store
  timerMs; Stop early = record what you saw; auto-stop CLAMPS timerMs to
  endpoint so slow frames can't inflate readings. Re-run of a conc replaces
  its row. Scene: griffin reaction beaker (turbidity lerp #dceff8→#f3f0d8 +
  pow(p,1.8), cross fades pow(p,2.6) — "suddenly gone" feel), swirl,
  labeled reagent beakers w/ outlined Text.
- F3 gate probe/clock.py ALL PASS: 40.0s & 100.0s recorded, ratio 2.5,
  table rows rate=1000/t exact. VERIFIED lint+build green.
- Critique: clock camera too shallow (bench void dominates); steepened.

## 2026-08-11 iter-5 (enthalpy: physical model + calorimeter scene + gate)
- Replaced fantasy ΔT ("4 + 2·m/5.3") with physics: ΔH_soln(Na2CO3) =
  -23.0 kJ/mol, ΔT = 0.92·n·23000/(4.2·V) (92% calorimeter efficiency →
  students get -21.2 vs data-book -23.0, an error to discuss). Default
  5.30 g / 25 cm³ → ΔT +10.1 °C, T2 32.1.
- Scene: proper 9701 rig — polystyrene cup nested in support beaker, lid,
  thermometer through lid (red column tracks T2, bulb in water), dissolving
  powder swirl while running, digital balance w/ live readout that empties
  when the powder is added.
- F4 gate probe/enthalpy.py ALL PASS (ΔT 10.1, q 1060.5, ΔH -21.2, T2 32.1).
- Probe lesson: match UI numbers with loose regex across newlines — the calc
  sheet breaks lines mid-equation.

## 2026-08-11 iter-6 (code split + mobile layout)
- LabViewport.jsx behind React.lazy: menu first paint = react chunk only
  (~65 kB gz vs ~370 before); three.js (303 kB gz) loads on experiment
  open with LoadingScreen fallback. F8 evidence: build output chunks.
- Mobile (F7): Titration side panels hidden <md, replaced by inline
  readings strip (+Record button at endpoint, mean readout); Clock/Enthalpy
  w-80 side panel becomes bottom sheet (max-h 46%) — scene visible above.
  mob4-*.png verified: rig, cross beaker, cup all visible + tappable
  controls.
- PROBE LESSON (2nd false alarm): fixed sleeps are unreliable — SwiftShader
  render time varies 8-40 s run to run. shot.py now POLLS screenshots until
  content-fraction > 0.5 (75 s timeout). Never conclude 'blank/broken'
  from one fixed-delay screenshot; dbg5.py confirms with 8/16/30 s series.
- VERIFIED: lint clean, build green, desktop + mobile probes all render.

## 2026-08-11 iter-7 (F5 look pass 1: set-dressing + grounding + swirl)
- scene/props.jsx: ReagentShelf (10 varied bottles), WallCabinets,
  BackCounter, CeilingLights, WashBottle, LabNotebook, AccentBeaker,
  BlobShadow (radial CanvasTexture — grounds apparatus at every quality,
  since shadow maps only run on HIGH).
- LabRoom wires the set; fog('#dfe7ef', 3.2, 9) for aerial depth.
- Titration EndpointSwirl: 3 pink torus wisps spiral + fade over 1.6 s at
  endpoint (colour-swirl queue item done).
- VERIFIED: lint 0, build green, offline probe all scenes (frac>0.99 at
  15 s), gates titrate/clock/enthalpy all exit 0.
- Critique for iter-8: clock+enthalpy cameras drown in black bench void;
  clock tile blob pokes out as stray ring; enthalpy blobs read as stains;
  bench could be a touch lighter.

## 2026-08-11 iter-8 (F5 look pass 2: framing + shadow tuning)
- Cameras: clock [-0.19,0.33,0.5]->[0.02,0.07,0.03], enthalpy
  [-0.3,0.3,0.6]->[0.1,0.09,0.04] — subjects fill the frame, bench void gone.
- Bench epoxy lightened #26292e->#31363c; clock beaker blob moved ON the
  tile (r .048 @.22), enthalpy blobs softened (.062/.1 @ .22/.2).
- VERIFIED: lint 0, build green, desktop+mobile probes frac>0.99, gates
  titrate/clock/enthalpy exit 0.

## 2026-08-11 iter-9 (offline hardening: PWA + self-hosted fonts) — F9 PASS
- index.html still fetched Google Fonts at runtime (offline violation missed
  in iter-1, which only fixed the troika 3D font). Removed gstatic <link>;
  self-hosted Inter + JetBrains Mono variable woff2 (48k+31k) via @font-face.
- vite-plugin-pwa (generateSW): precache 17 unique entries incl. vendor-three
  (4MB cap), autoUpdate, manifest + PIL-generated flask icons (192/512/maskable).
- New gate probe/offline.py: load once -> SW precache complete (count parity
  vs sw.js manifest, no magic numbers) -> httpd.shutdown() (TCP-dead, SW can't
  cheat) -> reload -> menu + titration 3D render verified.
- GATE BUG CAUGHT: first offline.py used pixel>12 as "lit" but app bg is
  #0f172a (L~23) -> loading screen scored frac=1.000 at 0s = spurious pass,
  saved shot showed empty viewport. Fixed to shot.py's hist[:25] metric PLUS
  std-dev>25 contrast guard (flat fog-colored canvas can't pass either).
  Lesson: every new probe metric must be validated against a known-negative.
- VERIFIED: lint 0, build green, offline.py/titrate/clock/enthalpy all exit 0,
  iter9 desktop shots frac>0.99, offline-titration.png shows full apparatus.

## 2026-08-11 iter-10 (F5 pass 3: fresnel rim glass + liquid surface discs)
- FresnelRim: additive ShaderMaterial shell (pow(1-|N.V|, 2.5) * 0.55,
  #cfe4ff) on shared lathe geometry, scale 1.002 — glass edges catch light
  at grazing angles, zero texture/light cost, SwiftShader-safe.
- Wired into ConicalFlaskGlass + BeakerGlass; beaker liquids get glossy
  surface disc (rough .05, envMapIntensity 1.8).
- VERIFIED: lint 0, build green, titrate/clock/enthalpy gates exit 0,
  iter10 shots inspected — clock beakers + flask visibly glassier.

## 2026-08-11 iter-11 (F10: meniscus-reading practice)
- MeniscusPractice.jsx: SVG zoomed burette window (140 px/cm³, ticks 0.1,
  labelled whole cm³, scale increases downwards, meniscus bezier dipping
  to the true value). Random target on 0.05 grid; grades exact / close
  (±0.05) / too high-low with directional hints; score tracker; New reading.
- Toggle in titration right panel (desktop); self-contained, live burette
  state untouched.
- New gate probe/meniscus.py: reads data-target from SVG, asserts grading
  of +0.30 / -0.05 / exact answers, score 1/3, input reset on re-randomise.
- VERIFIED: lint 0, build green, meniscus.py exit 0, titrate/clock/
  enthalpy/offline all exit 0, iter11-meniscus.png inspected.
- Queue remaining: drag-to-pour interactions; mobile entry point for
  meniscus practice.

## 2026-08-11 iter-12 (F10 mobile entry + duplicate-instance fix)
- Mobile toggle under readings strip opens meniscus practice as overlay.
- BUG caught by gate strict-mode: mobile+desktop sections both mounted
  (breakpoints are CSS-only) -> TWO independent MeniscusPractice instances
  with different targets. Fix: single shared instance positioned
  responsively (right-2 top-[7.5rem] w-[240px] / md:bottom-28 md:w-40).
  Lesson: never render a stateful component once per breakpoint section.
- New gate probe/meniscus_mobile.py (390x844, touch): toggle visible,
  panel opens, exact answer graded correct.
- VERIFIED: lint 0, build green, meniscus_mobile.py + meniscus.py +
  titrate.py exit 0, iter12 shots + iter12-meniscus-mobile.png inspected.

## 2026-08-11 iter-13 (F11: drag-to-pour, clock experiment)
- PourableBeaker in ClockScene: pointer-drag on bench-height plane
  (ray.intersectPlane), pointer capture, OrbitControls disabled during
  drag via imperative useThree get() helper (lint immutability rule
  rejects mutating hook-returned controls directly — helper outside
  component passes). Drop within 0.11 of reaction beaker -> anchored
  tilt (-1.25 rad) + falling stream + clockStart(); else spring home.
  Animation in refs (no 60fps re-renders); beaker empties after pour
  (fill 0.55 -> 0.18), refills on reset.
- Drop-zone ring affordance while dragging; grab cursor; oversized
  invisible hit cylinder for touch.
- Stream-lip fix: lip of base-pivoted beaker tilted -1.25 rad is
  ~(+0.095, -0.002) from anchor — first guess (+0.055) poured from the
  beaker's side (caught in inspected shot).
- New gate probe/pour.py: real mouse drag, asserts reaction running +
  timer advancing + reset restores button path.
- VERIFIED: lint 0, build green, all 7 gates exit 0, pour shots inspected.
- Queue: drag-to-pour for enthalpy (tip solid into cup); F5 polish pass.
