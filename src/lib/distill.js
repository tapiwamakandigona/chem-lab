// Simple distillation — separation of pure water from a coloured aqueous
// solution. This is an enrichment apparatus/technique practical: it supports
// the 9701 theory outcomes around distillation and core practical skills
// without pretending to be a standard current Paper 3 quantitative type.
//
// Pure state model: a 20 cm³ copper(II) sulfate solution is heated gently in
// a round-bottom flask. Correct Liebig-condenser flow enters at the lower
// nozzle, keeping the jacket full. Anti-bumping granules prevent bumping.

export const DISTILL_INITIAL_VOLUME = 20.0 // cm³
export const DISTILL_TIME_SCALE = 5
export const DISTILL_BOIL_C = 100.0
export const DISTILL_MAX_SEC = 180 // simulated seconds

// Heat-up (22→100 °C), then a near-steady vapour temperature at water's bp.
export function distillTemperature(timeSec, heating) {
  if (!heating) return 22
  if (timeSec <= 45) {
    const f = Math.max(0, timeSec) / 45
    return Math.round((22 + 78 * (1 - Math.pow(1 - f, 2))) * 10) / 10
  }
  return DISTILL_BOIL_C
}

// Condensation begins only when water vapour reaches the still head. Correct
// lower-inlet cooling recovers 95%; reversed upper-inlet flow recovers 55%;
// no cooling loses vapour to the room.
export function condenserEfficiency(cooling) {
  if (cooling === 'lower') return 0.95
  if (cooling === 'upper') return 0.55
  return 0
}

export function distillateVolume(timeSec, heating, cooling) {
  if (!heating || timeSec <= 45) return 0
  const raw = Math.min(15, (timeSec - 45) * 0.12)
  return Math.round(raw * condenserEfficiency(cooling) * 10) / 10
}

export function distillStatus(state) {
  const temperature = distillTemperature(state.timeSec, state.heating)
  const volume = distillateVolume(state.timeSec, state.heating, state.cooling)
  const bumping = state.heating && !state.granules && temperature >= 88
  const boilingDry = state.heating && volume >= 14.5
  return { temperature, volume, bumping, boilingDry }
}

// Evidence-based 3-mark technique check:
//  1 correct condenser direction (lower inlet);
//  2 anti-bumping granules present while heating;
//  3 collect colourless distillate near the 100 °C vapour plateau.
export function markDistillation(cooling, granules, observations) {
  const lowerInlet = cooling === 'lower'
  const granulesOk = granules === true
  const evidence = (observations || []).some(
    (o) =>
      o.volume >= 5 &&
      o.temperature >= 98 &&
      o.temperature <= 102 &&
      o.colourless === true,
  )
  const total = (lowerInlet ? 1 : 0) + (granulesOk ? 1 : 0) + (evidence ? 1 : 0)
  return {
    ok: lowerInlet && granulesOk && evidence,
    lowerInlet,
    granulesOk,
    evidence,
    total,
    max: 3,
  }
}
