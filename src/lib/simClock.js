// Simulated-clock frame guard.
//
// Every practical advances its simulated clock inside useFrame with the
// renderer's frame delta. On a low-end phone (or a software renderer) one
// slow frame can carry a delta of several seconds, which would jump the
// simulated clock past a timing-sensitive window — e.g. a student tapping
// "quench" at a displayed 80 s would get 85+ s recorded. Clamping the
// per-frame delta means a slow device runs the simulation slightly slower
// instead of skipping time the student never saw. At 10 fps and above the
// clamp never engages, so fast devices are unaffected.
export const MAX_SIM_FRAME_SEC = 0.1

export function clampSimDelta(delta) {
  return Math.min(delta, MAX_SIM_FRAME_SEC)
}
