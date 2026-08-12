// Gravimetric analysis — water of crystallisation by heating to constant
// mass (9701 Paper 3 Q2 style). Hydrated magnesium sulfate MgSO₄·xH₂O is
// heated in a crucible over a Bunsen; the learner weighs, heats, cools and
// re-weighs until two successive masses agree within 0.01 g, then computes x.
//
// All physics here is a pure model over "how many completed heating cycles";
// the store owns phase transitions, the scene only animates them.

export const GRAV = {
  emptyMass: 23.45,       // crucible + lid, g
  sampleMass: 2.46,       // hydrated MgSO₄·xH₂O as weighed in, g
  mrAnhydrous: 120.4,     // MgSO₄
  mrWater: 18.0,
  trueX: 7,
  anhydrousMass: 1.2016,  // 2.46/246.4 × 120.4
  waterMass: 1.2584,
  // fraction of the ORIGINAL water still bound after each completed heat —
  // forces the real constant-mass loop: 3 heats before Δ ≤ 0.01 g.
  waterLeftAfterHeat: [0.14, 0.008, 0.0008, 0],
}

export const HEAT_MS = 2500  // one strong-heating cycle (sim-accelerated)
export const COOL_MS = 2000  // cooling on the pipeclay triangle before weighing

/** Water (g) still in the crucible after n completed heating cycles. */
export function waterLeft(heats) {
  if (heats === 0) return GRAV.waterMass
  const f = GRAV.waterLeftAfterHeat[Math.min(heats - 1, GRAV.waterLeftAfterHeat.length - 1)]
  return GRAV.waterMass * f
}

/** True crucible+contents mass (g) after n heats; balance shows 2 dp. */
export function crucibleMass(heats, loaded) {
  if (!loaded) return GRAV.emptyMass
  return GRAV.emptyMass + GRAV.anhydrousMass + waterLeft(heats)
}

export const round2 = (m) => Math.round(m * 100) / 100

/** Constant mass = last two after-heating readings within 0.01 g. */
export function isConstantMass(readings) {
  const heated = readings.filter((r) => r.kind === 'heated')
  if (heated.length < 2) return false
  const a = heated[heated.length - 1].mass
  const b = heated[heated.length - 2].mass
  return Math.abs(a - b) <= 0.010001
}

/**
 * Mark the learner's x against their OWN readings (own-results marking, like
 * the real paper): x = (water lost / 18) ÷ (anhydrous / 120.4).
 */
export function markX(readings, xAnswer) {
  const empty = readings.find((r) => r.kind === 'empty')
  const loadedR = readings.find((r) => r.kind === 'loaded')
  const heated = readings.filter((r) => r.kind === 'heated')
  if (!empty || !loadedR || heated.length < 2) return { ok: false, reason: 'incomplete readings' }
  const finalMass = heated[heated.length - 1].mass
  const anhydrous = finalMass - empty.mass
  const water = loadedR.mass - finalMass
  if (anhydrous <= 0 || water <= 0) return { ok: false, reason: 'bad readings' }
  const x = (water / GRAV.mrWater) / (anhydrous / GRAV.mrAnhydrous)
  const ok = Math.abs(xAnswer - x) <= 0.25
  return { ok, x, anhydrous, water, expected: Math.round(x) }
}
