## Iteration 33 — flame-test practical

- [x] Run the clean-baseline lint/build ritual.
- [x] Research and encode Cambridge-appropriate flame-test chemistry.
- [x] Build a complete interactive flame-test practical with contamination-safe procedure.
- [x] Add guided practice, learner-course unit, mobile controls, and marking.
- [x] Add a dedicated Playwright gate and vendor it into CI.
- [x] Verify lint/build, chemistry invariants, gate assertions, offline behavior, and multiple camera angles.
- [x] Record evidence, commit, and push only after all checks pass.

## Iteration 34 — simple distillation practical

- [x] Research the current 9701 distillation outcomes, procedure, safety and likely learning task.
- [x] Define a physics model for vapour temperature, condenser cooling, distillate purity and volume.
- [x] Build the apparatus and interactions without adding runtime dependencies.
- [x] Add evidence-based marking, guide and the 16th course unit.
- [x] Gate desktop, mobile, safety interlocks and chemistry invariants.
- [x] Inspect the assembled model from at least four camera angles.
- [x] Re-run affected regressions, record evidence, commit and push.

## Iteration 35 — solubility curve / crystallisation practical

- [x] Run the clean-baseline lint/build ritual.
- [x] Research a Cambridge-appropriate solubility/crystallisation task and encode honest assumptions.
- [x] Define temperature-dependent solubility, saturation, cooling and crystal-yield model.
- [x] Build heating/cooling apparatus, animations and learner interactions.
- [x] Add evidence-based marking, guided practice and the 17th course unit.
- [x] Gate desktop, mobile, model invariants and safety/technique interlocks.
- [x] Inspect the assembled model from at least four camera angles and fix visual defects.
- [x] Re-run affected/offline regressions, record evidence, commit and push.

## Iteration 36 — catalytic decomposition kinetics practical

- [x] Run the clean-baseline lint/build ritual.
- [x] Research Cambridge-appropriate gas-rate/catalyst investigation and safety.
- [x] Define comparable rate curves for concentration, catalyst and temperature variables.
- [x] Build oxygen-evolution apparatus, animations, timed readings and graph.
- [x] Add evidence-based conclusion marking, guide and the 18th course unit.
- [x] Gate controls, one-variable validity, graph, conclusion, desktop and mobile.
- [x] Inspect the full apparatus from four angles and fix visual defects.
- [x] Re-run affected/offline regressions, record evidence, commit and push.

## Iteration 37 — production landing page

- [x] Critique the current desktop/mobile entry screen and research current virtual-lab landing patterns.
- [x] Establish the ChemLab brand spec from the shipped identity and verified product claims.
- [x] Replace the internal-looking menu with an outcome-led, mobile-first landing page.
- [x] Use a real ChemLab product capture and verified proof only; refresh stale social metadata/art.
- [x] Keep the expanded 14-practical library, 19-unit learner guide, quality controls and existing gate locators functional.
- [x] Add a dedicated landing-page gate for structure, actions, mobile layout, keyboard access and truthful counts.
- [x] Run lint/build, landing/offline/course/gfx regressions and inspect desktop plus both phone orientations.
- [ ] Record final 29-gate evidence, commit and push only after every affected check is green.
- [x] Rebuild after the final zoom, contrast, filter-count and six-card mobile fixes.
- [x] Run the landing gate against the frozen final build.
- [ ] Run all 29 gates against that exact build; below-fold section-by-section review is already complete.
- [ ] Only after those checks: mark F33/F34, commit/push, verify Actions/deployment/live counts, and consider F22.

## Iteration 38 — iodine/thiosulfate titration (queued research)

- [x] Check the official 2025–2027 practical scope and recent Paper 3 examples.
- [x] Confirm the chemistry/procedure: I₂ + 2S₂O₃²⁻, starch only near the pale-yellow endpoint.
- [x] Define the complete learner flow, zero-order timed model, persistent-complex endpoint consequence and 10-mark ECF scheme.
- [x] Build the two-stage 3D bench, phone-first controls, five-step coach and 19th learner-course milestone.
- [x] Add pure-model invariants and a dedicated gate covering removal-only, timed quench, early starch, dry closed stopcock, concordancy, ECF, mobile and landscape.
- [x] Inspect the current model from front, side and both three-quarter views; correct depth separation, framing and quench visibility defects rather than accepting the first camera.
- [x] Run landing/course/offline/gfx plus full 29-gate regression against one immutable final build.
- [ ] Mark F33/F34 only with final evidence; commit/push once, then verify all Actions shards, deployment, live counts/hash/robots/sitemap before F22.

## Iteration 43 — CI timing defect repair and release sanity pass

- [x] Reproduce and isolate the failed tap probe without weakening its assertion.
- [x] Replace the burette tip-drain wall-time window with clamped simulation time.
- [x] Verify the exact tap regression and the complete 7-gate interaction shard locally.
- [x] Retrieve the independent library-shard CI failures and quote their real failure points.
- [x] Audit every multi-page gate for concurrent SwiftShader/WebGL contention.
- [x] Split slow CI groups so healthy jobs cannot overrun the 75-minute shard cap.
- [x] Re-run every affected multi-page gate against one frozen production build.
- [x] Run lint, Python compile, test-harness audits, model checks, and immutable-build checks.
- [x] Commit and push only after the old CI run has yielded all remaining shard evidence.
- [ ] Require all seven fresh CI shards, deployment, and hard live-domain verification before F22.
