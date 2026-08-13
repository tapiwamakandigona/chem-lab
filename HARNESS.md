# Harness — the AAABench loop, adapted to ChemLab

Adopted 2026-08-13 on the owner's instruction ("use this as your harness, forget
everything else"): https://github.com/ukanwat/aaabench. This file is the operating
method; `DEMAND.md` is the standard being built to. Together they replace the
previous harness docs.

## The loop

Run relentlessly until the owner says stop:

**build → test → LOOK at it → find what a stranger would call fake, ugly, empty or
confusing in 3 seconds → fix the rule that produced it, never the one instance → repeat.**

- Capture screenshots after every meaningful change and actually read the image.
- Close-ups, not just wide shots — a single burette valve, one shelf label, a button
  at 390 px. Wide shots hide everything that is wrong.
- Verify it is a *product*, not a scene: click through it the way a stranger would,
  on desktop and at 390×844, before calling anything done.
- Lighting and materials are where realism lives; spend effort there before adding
  more objects.
- Leave the working tree in a working state at every commit.

## What a stranger reads in three seconds (the tells)

None of these throw an error and no gate catches them by default. Hunt them
deliberately — from inside the generator they are invisible, from outside they are
the only thing:

1. **A repeating pattern.** Any visible tiling or period — wood grain, bench surface,
   background texture, identical bottles in a row at identical angles.
2. **Things not touching.** Anything floating above or sunk into its surface;
   apparatus whose parts have come apart; a clamp that grips nothing.
3. **Curves made of too few pieces.** Faceted glassware silhouettes, blocky liquid
   surfaces, low-segment rims read instantly as generated geometry.
4. **Uniformity of any kind.** One spacing along a shelf, one orientation across
   bottles, one brightness across materials. Real distributions are lumpy.
5. **The words.** A raw slug, a `0/1`, a lorem-flavoured sentence, an empty counter —
   text tells are read faster than geometry tells.

Both kinds of fault count: the one you can name, and the one with no nameable defect
that simply is not convincing. The second kind matters more and is easier to talk
yourself out of.

## State lives in files, never in memory

- `PROJECT.md` — what the product is; standing decisions. `DEMAND.md` — the standard.
- `features.json` — definition of done; flip `passes` only with evidence.
- `progress.md` — **sacred, append-only.** The known-problems list may only shrink
  when a problem is actually fixed. A diagnosis is the most expensive thing in the
  file; carry every open item forward verbatim. If the file were ever lost, the
  first task is to reconstruct it before building anything new.
- A fresh session stands only on what was written down. Write as you go, not at the
  end — you do not control when the session stops.

## Verification

- Every claim is VERIFIED (command output, diff, artifact inspected) or ASSUMED, and
  labelled. "Committed" means `git ls-files` shows it; "deployed" means the live
  bytes were compared.
- Gates (`tests/run_gates.py`) are the floor, not the bar. A gate that passes proves
  the mechanism works; only looking proves the product is right. Never edit a gate to
  make it pass; when a rule legitimately changes, change the assertion and write the
  reason in a comment beside it.
- Audit at a regular rhythm, not at the end: after every pass that changes a lot,
  stop and look with fresh eyes at real render size, from multiple angles and
  viewports. A fault found now is one rule to fix; the same fault found tomorrow is
  ten thousand corrections.

## Never stop and wait — nobody is coming

While anything is building, deploying or running gates, do the work that does not
need it: write copy, prepare assets, study references, author the scripts to run
when it returns, hunt tells in existing screenshots. Retry the blocked thing
periodically. Ending a session early wastes the budget; there is always offline
work worth doing. If tooling dies, restarting it is this session's job, not
anyone else's.

## Execution constraints (owner's standing rules, unchanged by the switch)

- Single agent, single context. No subagents, no swarms; parallel-looking work is
  sequenced.
- Credentials never appear in commits, logs, reports or prompts; they live outside
  the repo in locked files.
- Halt and report after 2 consecutive iterations with no diff.
- Escalate only for destructive/irreversible actions, spending money, missing
  credentials, or genuine ambiguity. Everything else: decide, document, proceed —
  "this needs a decision" is not a place to stop.
