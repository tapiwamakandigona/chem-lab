// Continuous-monitoring kinetics: catalysed decomposition of hydrogen
// peroxide, 2H2O2(aq) -> 2H2O(l) + O2(g).
// Presets vary ONE independent variable at a time from the control.
export const PEROXIDE_RUNS = Object.freeze([
  {
    id: 'control',
    label: 'Control',
    concentration: 0.50,
    catalyst: 'MnO2',
    catalystMass: 0.20,
    catalystForm: 'powder',
    temperature: 22,
  },
  {
    id: 'high-conc',
    label: '2× [H₂O₂]',
    concentration: 1.00,
    catalyst: 'MnO2',
    catalystMass: 0.20,
    catalystForm: 'powder',
    temperature: 22,
  },
  {
    id: 'no-catalyst',
    label: 'No catalyst',
    concentration: 0.50,
    catalyst: 'none',
    catalystMass: 0,
    catalystForm: 'none',
    temperature: 22,
  },
  {
    id: 'granules',
    label: 'MnO₂ granules',
    concentration: 0.50,
    catalyst: 'MnO2',
    catalystMass: 0.20,
    catalystForm: 'granules',
    temperature: 22,
  },
  {
    id: 'warm',
    label: 'Warm, 35 °C',
    concentration: 0.50,
    catalyst: 'MnO2',
    catalystMass: 0.20,
    catalystForm: 'powder',
    temperature: 35,
  },
])

// Five cm3 keeps even the 1.00 mol dm-3 run inside a 100 cm3 gas syringe:
// n(O2) = 1/2 * c * V, with 24.0 dm3 mol-1 at room conditions.
export const PEROXIDE_VOLUME_CM3 = 5.0
export const PEROXIDE_TIME_SCALE = 8
export const PEROXIDE_MAX_SEC = 180
export const PEROXIDE_RECORD_INTERVAL = 20

export function peroxideRun(id) {
  return PEROXIDE_RUNS.find((item) => item.id === id) ?? PEROXIDE_RUNS[0]
}

export function rateConstant(id) {
  const run = peroxideRun(id)
  // Tuned so a three-minute school-lab run reaches ~98% conversion: the
  // learner sees the plateau without pretending the exponential is linear.
  let k = 0.022
  if (run.catalyst === 'none') k *= 0.12
  if (run.catalystForm === 'granules') k *= 0.42
  // Modest school-lab temperature effect (~2x per 10 C).
  k *= 2 ** ((run.temperature - 22) / 10)
  return k
}

export function maximumOxygenVolume(id) {
  const run = peroxideRun(id)
  const molesH2O2 = run.concentration * (PEROXIDE_VOLUME_CM3 / 1000)
  return (molesH2O2 / 2) * 24_000
}

export function oxygenVolumeAt(id, tSec) {
  const t = Math.max(0, Number(tSec) || 0)
  return maximumOxygenVolume(id) * (1 - Math.exp(-rateConstant(id) * t))
}

export function syringeReading(id, tSec) {
  return Math.round(oxygenVolumeAt(id, tSec) * 2) / 2
}

export function initialRate(id) {
  return maximumOxygenVolume(id) * rateConstant(id)
}

export function isRunComplete(readings) {
  if (!readings?.length) return false
  return readings.at(-1).t >= PEROXIDE_MAX_SEC
}

export function compareRuns(runData, fasterId, reason) {
  const complete = (id) => isRunComplete(runData?.[id] ?? [])
  const evidence = complete('control') && complete(fasterId)
  const target = peroxideRun(fasterId)
  const faster = evidence && initialRate(fasterId) > initialRate('control') * 1.2
  const validReason = (
    fasterId === 'high-conc' && reason === 'collisions' ||
    fasterId === 'warm' && reason === 'energy' ||
    fasterId === 'control' && reason === 'surface'
  )
  return {
    ok: evidence && faster && validReason,
    evidence,
    faster,
    validReason,
    chosen: target.label,
    controlRate: initialRate('control'),
    chosenRate: initialRate(fasterId),
    total: Number(evidence) + Number(faster) + Number(validReason),
    max: 3,
  }
}
