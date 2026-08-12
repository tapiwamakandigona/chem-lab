import assert from 'node:assert/strict'
import {
  endpointTitreAt,
  expectedCalculations,
  hasConcordantPair,
  iodineConcentrationAt,
  markIodineRate,
  starchTiming,
  titrationAppearance,
  visibleEndpoint,
} from '../../src/lib/iodineRate.js'

assert.equal(iodineConcentrationAt(0), 0.05)
assert(Math.abs(iodineConcentrationAt(80) - 0.0315) < 1e-12)
assert.equal(endpointTitreAt(80, 0), 26.25)
assert.equal(endpointTitreAt(80, 1), 26.30)
assert.equal(endpointTitreAt(80, 2), 26.20)
assert(endpointTitreAt(70) > endpointTitreAt(90))
assert.equal(starchTiming(20, 26.25), 'early')
assert.equal(starchTiming(25.30, 26.25), 'good')
assert.equal(starchTiming(26.25, 26.25), 'late')
assert.equal(visibleEndpoint(26.25, 'early'), 26.85)
assert.equal(titrationAppearance(26.85, 26.25, 10, 'early'), 'colourless')
assert.equal(titrationAppearance(25.30, 26.25, 10, 'good'), 'blue-black')
assert.equal(titrationAppearance(26.25, 26.25, 10, 'good'), 'colourless')

const titres = [
  { kind: 'rough', titre: 26.25, valid: true },
  {
    kind: 'accurate',
    titre: 26.30,
    valid: true,
    starchTiming: 'good',
    starchDrops: 10,
  },
  {
    kind: 'accurate',
    titre: 26.20,
    valid: true,
    starchTiming: 'good',
    starchDrops: 10,
  },
]
assert(hasConcordantPair(titres))

const calc = expectedCalculations(26.25)
assert(Math.abs(calc.nThio - 0.0002625) < 1e-12)
assert(Math.abs(calc.nIodine150 - 0.0007875) < 1e-12)
assert(Math.abs(calc.iodineM - 0.0315) < 1e-12)
assert(Math.abs(calc.rate - 0.00023125) < 1e-12)

const state = {
  quenchTime: 80,
  preparedAfterQuench: true,
  titres,
  answers: {
    mean: '26.25',
    nThio: '0.0002625',
    nIodine: '0.0007875',
    concentration: '0.0315',
    initial: '0.0500',
    rate: '0.00023125',
    units: 'mol dm-3 s-1',
    starchReason:
      'Concentrated iodine forms a persistent starch iodine complex that releases iodine slowly',
    quenchReason:
      'Sodium hydrogencarbonate neutralises the acid catalyst and quenches the reaction',
  },
}
const result = markIodineRate(state)
assert.equal(result.total, 10, JSON.stringify(result, null, 2))
assert.equal(
  markIodineRate({ ...state, answers: { ...state.answers, mean: '26.250' } })
    .criteria.find((item) => item.id === 'mean').ok,
  false,
)

// Calculation credit follows the learner's mean even when that mean itself is
// wrong: this is the same error-carried-forward policy used by ChemLab papers.
const ecf = { ...state, answers: { ...state.answers, mean: '26.35' } }
const ecfCalc = expectedCalculations(26.35)
ecf.answers.nThio = String(ecfCalc.nThio)
ecf.answers.nIodine = String(ecfCalc.nIodine150)
ecf.answers.concentration = String(ecfCalc.iodineM)
ecf.answers.rate = String(ecfCalc.rate)
const ecfResult = markIodineRate(ecf)
assert(ecfResult.criteria.find((item) => item.id === 'moles').ok)
assert(ecfResult.criteria.find((item) => item.id === 'concentration').ok)
assert(ecfResult.criteria.find((item) => item.id === 'rate').ok)
assert(!ecfResult.criteria.find((item) => item.id === 'mean').ok)

console.log('iodine-rate model: invariants green; perfect run 10/10; ECF preserved')
