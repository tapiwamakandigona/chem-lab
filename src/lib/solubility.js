// KNO3 solubility in g solute / 100 g water.
// Values use a standard school-lab table; interpolate linearly between points.
export const KNO3_SOLUBILITY = Object.freeze([
  [0, 13.25],
  [20, 31.66],
  [40, 63.9],
  [60, 109.9],
  [80, 169.0],
  [100, 245.2],
])

export const SOLUBILITY_RUNS = Object.freeze([
  { id: 'sc1', label: 'SC 1', soluteMass: 7.0, waterMass: 20.0 },
  { id: 'sc2', label: 'SC 2', soluteMass: 10.0, waterMass: 20.0 },
  { id: 'sc3', label: 'SC 3', soluteMass: 15.0, waterMass: 20.0 },
  { id: 'sc4', label: 'SC 4', soluteMass: 22.0, waterMass: 20.0 },
  { id: 'sc5', label: 'SC 5', soluteMass: 30.0, waterMass: 20.0 },
])

export const SOLUBILITY_ROOM_C = 22
export const SOLUBILITY_HEAT_RATE = 12 // °C simulated per real second
export const SOLUBILITY_COOL_RATE = 5 // °C simulated per real second

export function solubilityAt(tempC) {
  const t = Math.max(0, Math.min(100, Number(tempC) || 0))
  for (let i = 1; i < KNO3_SOLUBILITY.length; i += 1) {
    const [t1, s1] = KNO3_SOLUBILITY[i - 1]
    const [t2, s2] = KNO3_SOLUBILITY[i]
    if (t <= t2) {
      const f = (t - t1) / (t2 - t1)
      return s1 + f * (s2 - s1)
    }
  }
  return KNO3_SOLUBILITY.at(-1)[1]
}

export function concentrationPer100(run) {
  return (run.soluteMass / run.waterMass) * 100
}

export function saturationTemperature(run) {
  const target = concentrationPer100(run)
  for (let i = 1; i < KNO3_SOLUBILITY.length; i += 1) {
    const [t1, s1] = KNO3_SOLUBILITY[i - 1]
    const [t2, s2] = KNO3_SOLUBILITY[i]
    if (target <= s2) {
      const f = (target - s1) / (s2 - s1)
      return t1 + f * (t2 - t1)
    }
  }
  return 100
}

export function requiredDissolveTemperature(run) {
  // A small margin avoids showing "clear" exactly on the solubility boundary.
  return Math.min(98, saturationTemperature(run) + 3)
}

export function crystalMassAt(run, tempC) {
  const dissolved = solubilityAt(tempC) * run.waterMass / 100
  return Math.max(0, run.soluteMass - dissolved)
}

export function solubilityStatus({
  runId,
  temperature,
  heatedClear,
  cooling,
  phase,
  rushing,
  nucleated,
}) {
  const run = SOLUBILITY_RUNS.find((item) => item.id === runId) ?? SOLUBILITY_RUNS[1]
  const satTemp = saturationTemperature(run)
  const clear = temperature >= requiredDissolveTemperature(run)
  const isCooling = cooling ?? ['cooling', 'crystals', 'complete'].includes(phase)
  const supersaturated = heatedClear && isCooling && temperature <= satTemp + 0.5
  const visibleCrystals =
    ['crystals', 'complete'].includes(phase) ||
    (supersaturated && (rushing || nucleated || temperature <= satTemp - 2))
  return {
    run,
    saturationTemp: satTemp,
    clear,
    supersaturated,
    visibleCrystals,
    crystalMass: visibleCrystals ? crystalMassAt(run, temperature) : 0,
    quality: rushing ? 'fine crystals; impurities may be trapped' : 'large, well-formed crystals',
  }
}

export function markSolubility(runId, observations, calculatedSolubility) {
  const run = SOLUBILITY_RUNS.find((item) => item.id === runId) ?? SOLUBILITY_RUNS[1]
  const expected = concentrationPer100(run)
  const runObs = (observations ?? []).filter((item) => item.runId === runId)
  const valid = runObs.some((item) =>
    Math.abs(item.temperature - saturationTemperature(run)) <= 2 &&
    item.appearance === 'first crystals',
  )
  const calc = Number.parseFloat(calculatedSolubility)
  const calculated = Number.isFinite(calc) && Math.abs(calc - expected) <= 0.6
  const warmedClear = runObs.some((item) => item.heatedClear)
  return {
    ok: warmedClear && valid && calculated,
    warmedClear,
    evidence: valid,
    calculated,
    expected,
    total: Number(warmedClear) + Number(valid) + Number(calculated),
    max: 3,
  }
}
