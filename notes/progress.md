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
