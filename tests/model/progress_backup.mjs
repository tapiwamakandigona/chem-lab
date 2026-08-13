import assert from 'node:assert/strict'
import {
  makeProgressBackup,
  mergeProgress,
  parseProgressBackup,
  sanitiseCourseDone,
  sanitiseMockResults,
} from '../../src/lib/progressBackup.js'

globalThis.localStorage = {
  getItem() { return null },
  setItem() {},
}

assert.deepEqual(
  sanitiseCourseDone({
    'titration-endpoint': true,
    'clock-runs': false,
    unknown: true,
  }),
  { 'titration-endpoint': true },
)
assert.deepEqual(
  sanitiseMockResults({
    'titration-s22': { score: 5, total: 6 },
    'clock-s23': { score: 7, total: 6 },
    unknown: { score: 1, total: 1 },
  }),
  { 'titration-s22': { score: 5, total: 6 } },
)

const backup = makeProgressBackup(
  { 'titration-endpoint': true, unknown: true },
  { 'titration-s22': { score: 5, total: 6 } },
)
const parsed = parseProgressBackup(JSON.stringify(backup))
assert.deepEqual(parsed.courseDone, { 'titration-endpoint': true })
assert.deepEqual(parsed.mockResults, { 'titration-s22': { score: 5, total: 6 } })

const merged = mergeProgress(
  { 'clock-runs': true },
  {
    'titration-s22': { score: 6, total: 6 },
    'clock-s23': { score: 3, total: 6 },
  },
  {
    courseDone: { 'titration-endpoint': true },
    mockResults: {
      'titration-s22': { score: 4, total: 6 },
      'clock-s23': { score: 5, total: 6 },
    },
  },
)
assert.deepEqual(merged.courseDone, {
  'clock-runs': true,
  'titration-endpoint': true,
})
assert.deepEqual(merged.mockResults, {
  'titration-s22': { score: 6, total: 6 },
  'clock-s23': { score: 5, total: 6 },
})

assert.throws(() => parseProgressBackup('{broken'), /not valid JSON/)
assert.throws(() => parseProgressBackup({ format: 'other', version: 1 }), /not a ChemLab/)
assert.throws(
  () => parseProgressBackup({
    format: 'chemlab-progress',
    version: 99,
    courseDone: {},
    mockResults: {},
  }),
  /not supported/,
)
assert.throws(
  () => parseProgressBackup({
    format: 'chemlab-progress',
    version: 1,
    courseDone: { unknown: true },
    mockResults: {},
  }),
  /unknown or invalid/,
)

console.log('progress backup model: schema, validation and non-destructive merge green')
