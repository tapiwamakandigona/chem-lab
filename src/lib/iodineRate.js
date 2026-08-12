export const IODINE_INITIAL_M = 0.0500
export const IODINE_RATE_M_PER_S = 0.00023125
export const IODINE_TARGET_SEC = 80
export const IODINE_TIME_SCALE = 16
export const THIOSULFATE_M = 0.0100
export const IODINE_TITRE_OFFSETS = [0, 0.05, -0.05, 0]
export const STARCH_LAG_CM3 = 0.60
export const STARCH_WINDOW_CM3 = 1.00

export const round05 = (value) => Math.round(value * 20) / 20
export const withinRelative = (actual, expected, relative = 0.01) =>
  Number.isFinite(actual) &&
  Math.abs(actual - expected) <= Math.max(Math.abs(expected) * relative, 1e-12)

export function iodineConcentrationAt(timeSec) {
  return Math.max(0, IODINE_INITIAL_M - IODINE_RATE_M_PER_S * Math.max(0, timeSec))
}

export function endpointTitreAt(timeSec, runIndex = 0) {
  const exact = iodineConcentrationAt(timeSec) / 0.0012
  return round05(exact + IODINE_TITRE_OFFSETS[runIndex % IODINE_TITRE_OFFSETS.length])
}

export function titrationAppearance(reading, endpoint, starchDrops, starchTimingValue) {
  const remaining = endpoint - reading
  if (starchDrops > 0) {
    if (starchTimingValue === 'good' && remaining > 0) return 'blue-black'
    if (
      starchTimingValue === 'early' &&
      reading < visibleEndpoint(endpoint, 'early') - 0.000001
    ) return 'blue-black'
  }
  if (reading >= endpoint) return 'colourless'
  if (remaining <= STARCH_WINDOW_CM3) return 'pale-yellow'
  if (remaining <= 5) return 'amber'
  return 'brown'
}

export function starchTiming(reading, endpoint) {
  const remaining = endpoint - reading
  if (remaining >= 0.05 && remaining <= STARCH_WINDOW_CM3) return 'good'
  if (remaining > STARCH_WINDOW_CM3) return 'early'
  return 'late'
}

export function visibleEndpoint(endpoint, timing) {
  return round05(endpoint + (timing === 'early' ? STARCH_LAG_CM3 : 0))
}

export function hasConcordantPair(titres, tolerance = 0.100001) {
  const accurate = titres.filter((run) => run.kind === 'accurate' && run.valid)
  for (let i = 0; i < accurate.length - 1; i += 1) {
    for (let j = i + 1; j < accurate.length; j += 1) {
      if (Math.abs(accurate[i].titre - accurate[j].titre) <= tolerance) {
        return [accurate[i], accurate[j]]
      }
    }
  }
  return null
}

export function expectedCalculations(meanTitre) {
  const nThio = meanTitre / 1000 * THIOSULFATE_M
  const nIodine150 = nThio / 2 * 6
  const iodineM = nIodine150 / 0.025
  const rate = (IODINE_INITIAL_M - iodineM) / IODINE_TARGET_SEC
  return { nThio, nIodine150, iodineM, initialM: IODINE_INITIAL_M, rate }
}

function includesAll(text, groups) {
  const normalized = String(text || '').toLowerCase()
  return groups.every((group) => group.some((word) => normalized.includes(word)))
}

export function markIodineRate(state) {
  const pair = hasConcordantPair(state.titres)
  const selectedMean = pair ? (pair[0].titre + pair[1].titre) / 2 : NaN
  const enteredMean = Number.parseFloat(state.answers.mean)
  const meanHasTwoDecimals = /^\d+\.\d{2}$/.test(String(state.answers.mean).trim())
  const basis = Number.isFinite(enteredMean) ? enteredMean : selectedMean
  const calc = expectedCalculations(basis)
  const quantized = pair?.every(
    (run) => Math.abs(run.titre * 20 - Math.round(run.titre * 20)) < 1e-8,
  )
  const starchTechnique = pair?.every(
    (run) => run.starchTiming === 'good' && run.starchDrops === 10,
  )
  const criteria = [
    {
      id: 'quench',
      ok: Number.isFinite(state.quenchTime) &&
        Math.abs(state.quenchTime - IODINE_TARGET_SEC) <= 1,
    },
    {
      id: 'prepare',
      ok: state.preparedAfterQuench === true &&
        state.titres.some((run) => run.kind === 'rough'),
    },
    { id: 'starch', ok: !!starchTechnique },
    { id: 'concordant', ok: !!pair && !!quantized },
    {
      id: 'mean',
      ok: !!pair && meanHasTwoDecimals &&
        Math.abs(enteredMean - selectedMean) <= 0.011,
    },
    {
      id: 'moles',
      ok: withinRelative(Number.parseFloat(state.answers.nThio), calc.nThio) &&
        withinRelative(Number.parseFloat(state.answers.nIodine), calc.nIodine150),
    },
    {
      id: 'concentration',
      ok: withinRelative(Number.parseFloat(state.answers.concentration), calc.iodineM),
    },
    {
      id: 'rate',
      ok: withinRelative(Number.parseFloat(state.answers.initial), IODINE_INITIAL_M) &&
        withinRelative(Number.parseFloat(state.answers.rate), calc.rate) &&
        includesAll(state.answers.units, [['mol'], ['dm'], ['s']]),
    },
    {
      id: 'starch-reason',
      ok: includesAll(state.answers.starchReason, [
        ['starch'], ['iodine'], ['complex', 'precipitate'],
        ['slow', 'persistent', 'decompose'],
      ]),
    },
    {
      id: 'quench-reason',
      ok: includesAll(state.answers.quenchReason, [
        ['hydrogencarbonate', 'nahco3', 'bicarbonate'],
        ['acid'], ['catalyst'], ['stop', 'quench', 'neutral'],
      ]),
    },
  ]
  const total = criteria.filter((item) => item.ok).length
  return {
    total,
    max: criteria.length,
    ok: total === criteria.length,
    criteria,
    pair,
    selectedMean,
    calc,
  }
}
