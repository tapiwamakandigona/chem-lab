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
