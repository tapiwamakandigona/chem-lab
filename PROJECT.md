# PROJECT.md — ChemLab ZW gauntlet

## Goal

ChemLab ZW at the level of PhET (interaction clarity) and Labster (3D
fidelity): a virtual Cambridge AS/A-Level (9701) Paper 3 practical lab that a
Zimbabwean student on a cheap phone with bad connectivity can open in a
browser and actually *do* the practicals in — apparatus that looks real,
experiments that respond correctly to the chemistry, working fully offline
after first load. Loop runs until Tapiwa stops it.

## Session-start ritual

1. Read this file, `features.json`, tail of `notes/progress.md`.
2. `npm run lint && npx vite build` must be green before new work.
3. Probe: `uv run python /work/build/chemlab/probe/shot.py <tag>` →
   shots in `/work/build/chemlab/shots/`. Critique blind vs reference.
4. Pick the single most important unfinished feature; work only on that.

## Standing decisions

- Offline-first is non-negotiable: no runtime fetches (fonts, HDRIs, CDNs).
  Target user has intermittent 2G/3G. (2026-08-11)
- Reference bar: PhET for interaction/pedagogy, Labster promo shots for 3D
  look. Judged from probe screenshots each iteration. (2026-08-11)
- Stack stays React 19 + R3F + Zustand + Tailwind + Vite. No new heavy deps
  without need. (2026-08-11)
- Multi-agent work is allowed for independent research/regression lanes, but
  the main agent still integrates and verifies one feature per iteration.
  If helper credits are unavailable, keep the main loop moving. (Tapiwa,
  2026-08-12)
- Review every new/changed 3D model from multiple camera angles (front,
  side, three-quarter) via probe screenshots before calling it done —
  single-angle review missed a clipped voltmeter. (Tapiwa, 2026-08-12)

## Constraints

- SwiftShader probes ≈ 1–10 fps; allow settle time, don't judge perf there.
- Probe port 8797; never run two probes at once.
- Cambridge 9701 numbers (concentrations, ΔH, rate laws) must stay correct —
  the chemistry is the product.

## Current phase

build — fix render-breaking defects first (offline fonts, lighting), then
raise apparatus/scene fidelity, then interaction depth, then mobile polish.
