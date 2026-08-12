# PROJECT.md — ChemLab ZW gauntlet

## Goal

ChemLab ZW at the level of PhET (interaction clarity) and Labster (3D
fidelity): a virtual Cambridge AS/A-Level (9701) Paper 3 practical lab that a
Zimbabwean student on a cheap phone with bad connectivity can open in a
browser and actually *do* the practicals in — apparatus that looks real,
experiments that respond correctly to the chemistry, working fully offline
after first load. Loop runs until Tapiwa stops it.

## Session-start ritual

1. Read this file, `features.json`, and the tails of both progress logs:
   `notes/progress.md` (legacy iterations 1–16) and `progress.md` (current).
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
- Execute directly in one context. Do not spawn subagents, workers or swarms;
  sequence independent research, build and regression work. (Tapiwa's active
  Single-Agent Harness v3.0.1 setup, 2026-08-12)
- Review every new/changed 3D model from multiple camera angles (front,
  side, three-quarter) via probe screenshots before calling it done —
  single-angle review missed a clipped voltmeter. (Tapiwa, 2026-08-12)
- Public landing copy leads with the practice outcome, uses only current
  product proof (14 practicals, 19 guide units, 3 marked mock papers),
  carries the independent-product disclaimer and never invents learner
  outcomes, partner logos or Cambridge endorsement. (2026-08-12)
- Public release surfaces use the ChemLab flask mark and the self-hosted
  Inter/JetBrains Mono system; generated social artwork must be rebuilt
  with `python3 tools/generate_social_assets.py` when product counts change.
  (2026-08-12)
- Keep local probes serial because each owns port 8797. In GitHub Actions,
  shard the same canonical ordered gate list across isolated runners; deploy
  only after every shard succeeds. Bound best-effort screenshot waits so a
  slow software renderer cannot advance live simulations by minutes.
  (2026-08-12)
- CI must install browser-test dependencies from the pinned
  `requirements-test.txt`, lint and audit before building, and verify the
  deployed bundle plus robots/sitemap with bounded retries. Gate defaults are
  repository-relative; machine-specific paths are never the portable default;
  product assertions receive one attempt rather than a retry that could hide
  a deterministic defect.
  (2026-08-12)
- The iodine–propanone timed-rate practical uses sodium thiosulfate titration,
  which the official 2025–2027 syllabus names explicitly and 9701/34/O/N/24
  uses. Delayed starch addition near the pale-yellow endpoint is a scored
  technique with a persistent-complex consequence, not another colour skin.
  (implemented, 2026-08-12)

## Constraints

- SwiftShader probes ≈ 1–10 fps; allow settle time, don't judge perf there.
- Probe port 8797; never run two probes at once.
- Cambridge 9701 numbers (concentrations, ΔH, rate laws) must stay correct —
  the chemistry is the product.

## Current phase

build — fix render-breaking defects first (offline fonts, lighting), then
raise apparatus/scene fidelity, then interaction depth, then mobile polish.
