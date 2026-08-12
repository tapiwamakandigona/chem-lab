// Gas collection — purity of an impure Group 2 carbonate by molar gas
// volume (9701 Paper 3 Q2 style). An impure sample of CaCO₃ reacts with
// excess dilute HCl; the CO₂ evolved is collected in a 100 cm³ gas
// syringe. The learner records syringe readings against time until the
// volume is constant, then computes the % purity from their OWN final
// volume using Vm = 24.0 dm³ mol⁻¹ at r.t.p.
//
// Pure model: V(t) = Vmax(1 − e^(−kt)) over SIMULATED seconds. The store
// owns the timer; the scene only animates plunger + fizz from V(t).

export const GAS = {
  sampleMass: 0.4,      // impure carbonate weighed in, g
  mrCarbonate: 100.1,   // CaCO₃
  molarVolume: 24000,   // cm³ mol⁻¹ at r.t.p.
  truePurity: 87.5,     // % by mass
  k: 0.02,              // first-order-ish rate constant, s⁻¹ (sim time)
}

// Vmax = (0.400 × 0.875 / 100.1) × 24000 = 83.9 cm³ (syringe max 100)
export const GAS_VMAX = (GAS.sampleMass * (GAS.truePurity / 100) / GAS.mrCarbonate) * GAS.molarVolume

export const GAS_TIME_SCALE = 10   // sim seconds per real second
export const SYRINGE_MAX = 100     // cm³
export const READ_QUANTUM = 0.5    // gas syringe read to nearest 0.5 cm³

/** True CO₂ volume (cm³) at simulated time t seconds. */
export function volumeAt(tSec) {
  if (tSec <= 0) return 0
  return GAS_VMAX * (1 - Math.exp(-GAS.k * tSec))
}

/** What the learner reads off the syringe: nearest 0.5 cm³. */
export function readSyringe(tSec) {
  return Math.round(volumeAt(tSec) / READ_QUANTUM) * READ_QUANTUM
}

/**
 * Reaction complete = volume constant: last two readings agree within
 * 0.5 cm³ AND were taken at least 20 simulated seconds apart (mirrors
 * "no change over several minutes" in the real paper).
 */
export function isConstantVolume(readings) {
  if (readings.length < 2) return false
  const a = readings[readings.length - 1]
  const b = readings[readings.length - 2]
  return Math.abs(a.v - b.v) <= 0.500001 && a.t - b.t >= 20
}

/**
 * Mark the learner's purity % against their OWN final constant volume
 * (own-results marking): purity = (V/24000 × 100.1 ÷ 0.400) × 100.
 */
export function markPurity(readings, answer) {
  if (!isConstantVolume(readings)) return { ok: false, reason: 'volume not yet constant' }
  const vFinal = readings[readings.length - 1].v
  const mol = vFinal / GAS.molarVolume
  const purity = (mol * GAS.mrCarbonate / GAS.sampleMass) * 100
  if (!(purity > 0)) return { ok: false, reason: 'bad readings' }
  const ok = Math.abs(answer - purity) <= 2.0
  return { ok, purity, vFinal, mol }
}
