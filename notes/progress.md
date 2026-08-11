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
