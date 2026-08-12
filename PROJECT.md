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
- Keep each CI shard comfortably below its 75-minute job cap; isolate the
  slowest software-rendered simulations rather than raising that outer cap.
  `validate_shards()` must still prove exact, duplicate-free canonical gate
  coverage. (Actions run 31636085980, 2026-08-12)
- Within a probe, keep only one WebGL page alive at a time. Close the desktop
  page before opening its mobile page: simultaneous SwiftShader canvases can
  starve the new page before React mounts, producing false missing-control
  timeouts after all desktop assertions have passed. (Actions run
  31636085980, 2026-08-12)
- State-bearing frame windows use accumulated `clampSimDelta(dt)`, never
  `clock.getElapsedTime()`. One slow SwiftShader frame can exceed a short
  wall-time window entirely; wall clock remains valid only for cosmetic
  animation and UI-only accelerated waits. (Actions run 31636085980,
  2026-08-12)
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

## External critique triage (2026-08-12, from Tapiwa's reviewer)

Verdict: the headline is correct — the live domain is weeks stale because CI
has never gone green, so deploy never fired. Deploy-blocking work stays first.
Triage of the rest, against the CURRENT (undeployed) build:

Already fixed in the undeployed build (ships with next green CI):
- designed flask favicon.svg (emoji data-URI gone); og:/twitter/canonical
  meta prerendered in index.html; independent-Cambridge disclaimer + footer
  (data-testid=independent-disclaimer, FAQ entry); manifest description says
  fourteen practicals; robots.txt + sitemap.xml real files; landing page with
  pitch/proof/screenshots; viewport allows pinch zoom (maximum-scale removed);
  quality auto-detect by device (store.js detectQuality) with LOW/MED/HIGH/ULTRA.

Accepted, new backlog (do after deploy is green):
- B1 soft-404: unknown paths should render a real not-found view + meta
  noindex; keep SPA shell for known routes only.
- B2 progress export/import: localStorage progress → export code / file and
  import on another device (shared phones are the norm, not the edge).
- B3 loading skeleton in the HTML shell: inline critical CSS spinner +
  "loading ChemLab (~0.5 MB first visit, then offline)" so 2G users see
  feedback, not a white screen.
- B4 defer three.js vendor chunk off the launcher (import behind LabViewport)
  so the menu/guide/mock papers are readable before 3D loads.
- B5 WebGL-failure fallback message with the text practicals still usable.
- B6 teacher layer (class code + milestone visibility) — biggest product
  lever; needs design; likely server or share-code based.
- B7 exam-timer mode for mock papers (Paper 3 time pressure is a scored skill).
- B8 contact/report-an-error link in footer.
- B9 launcher: title visible on 390px first paint; label the guide badge.
- B10 light theme / high-brightness mode for outdoor low-nit screens.
- B11 "lite" text-only mode (guide + mocks, no 3D) for data-capped users.

Explicitly out of scope for the build loop (business decisions for Tapiwa):
naming/brand beyond ZW, pricing/licensing, analytics choice, demand-test
kill gate, NGO/press outreach. Documented so the loop stops re-deciding them.
