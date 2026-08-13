# The demand

ChemLab is judged the way AAABench judges a world: **it has to survive a stranger
looking at it** — a chemistry teacher with twenty browser tabs open and no reason to
be generous. Not "does it load", but: would that teacher, in the first three
seconds, believe a real company built this and trust it in front of a class?

## The standard

- **The lab has to look like a lab**, not a render of one. Glass that reads as
  glass, liquid that meets the walls of its vessel, apparatus that is clamped,
  seated and touching what it stands on, from every angle a user can reach —
  including zoomed in on a phone. If the period of any texture is visible, that is
  a rule to fix, not a texture to swap.
- **The chemistry has to be right before it is pretty.** Every number a learner can
  read must be defensible against the real technique: quantised burette readings,
  correct significant figures, endpoints, tolerances, ECF marking. A beautiful
  wrong lab is worse than an ugly right one.
- **The words are part of the product.** No slugs, no `0/1` insults, no
  placeholder tone. Copy is written for a Cambridge learner on a cheap phone, in
  the voice: clear, capable, encouraging, chemistry-literate.
- **It has to run where the learners are.** ~1 MB compressed first load, works
  offline after the first visit, usable at 390×844 in both orientations with
  44 px+ touch targets, on hardware with no GPU worth naming.
- **Nothing may reveal this is not a production company.** Emails, error states,
  empty states, 404s, exports, the teacher console — every surface a user can
  reach is a surface being judged.

## Definition of failure

- A visible tiling period, a floating object, a faceted curve, uniform spacing —
  anywhere a user can point the camera.
- A number a chemistry teacher would mark wrong.
- A gate weakened to pass, or a claim of "done" without evidence.
- A learner asked for an email address or password, ever.
- A first load that a 2G connection cannot survive.
- Waiting for permission where a decision would do.

## Current known gap (owner-visible)

F5 — the scene does not yet meet the "stranger believes it" bar. That is the open
demand; everything else in `features.json` passes with evidence.
