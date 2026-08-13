import { COURSE_UNITS } from './course.js'

export const PROGRESS_BACKUP_VERSION = 1
export const MOCK_RESULTS_KEY = 'chemlab-mock-results-v1'

const COURSE_IDS = new Set(COURSE_UNITS.map((unit) => unit.id))
const MOCK_TOTALS = {
  'titration-s22': 6,
  'clock-s23': 6,
  'enthalpy-s20': 5,
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function sanitiseCourseDone(value) {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(([id, done]) => COURSE_IDS.has(id) && done === true)
  )
}

export function sanitiseMockResults(value) {
  if (!isRecord(value)) return {}
  const clean = {}
  for (const [paperId, result] of Object.entries(value)) {
    if (!Object.hasOwn(MOCK_TOTALS, paperId) || !isRecord(result)) continue
    const score = Number(result.score)
    const total = Number(result.total)
    if (
      !Number.isInteger(score) ||
      total !== MOCK_TOTALS[paperId] ||
      score < 0 ||
      score > total
    ) continue
    clean[paperId] = { score, total }
  }
  return clean
}

export function loadMockResults() {
  try {
    const raw = localStorage.getItem(MOCK_RESULTS_KEY)
    return raw ? sanitiseMockResults(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

export function saveMockResults(results) {
  try {
    localStorage.setItem(MOCK_RESULTS_KEY, JSON.stringify(sanitiseMockResults(results)))
  } catch {
    // storage full / private mode — the current session still keeps the result
  }
}

export function makeProgressBackup(courseDone, mockResults) {
  return {
    format: 'chemlab-progress',
    version: PROGRESS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    courseDone: sanitiseCourseDone(courseDone),
    mockResults: sanitiseMockResults(mockResults),
  }
}

export function parseProgressBackup(raw) {
  let backup
  try {
    backup = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!isRecord(backup) || backup.format !== 'chemlab-progress') {
    throw new Error('That is not a ChemLab progress backup.')
  }
  if (backup.version !== PROGRESS_BACKUP_VERSION) {
    throw new Error(`This backup version is not supported (found ${String(backup.version)}).`)
  }
  if (!isRecord(backup.courseDone) || !isRecord(backup.mockResults)) {
    throw new Error('The backup is missing its progress records.')
  }
  const courseDone = sanitiseCourseDone(backup.courseDone)
  const mockResults = sanitiseMockResults(backup.mockResults)
  const suppliedCourse = Object.keys(backup.courseDone).length
  const suppliedMocks = Object.keys(backup.mockResults).length
  if (
    Object.keys(courseDone).length !== suppliedCourse ||
    Object.keys(mockResults).length !== suppliedMocks
  ) {
    throw new Error('The backup contains unknown or invalid progress.')
  }
  return { courseDone, mockResults }
}

export function mergeProgress(currentCourse, currentMocks, incoming) {
  const courseDone = {
    ...sanitiseCourseDone(currentCourse),
    ...incoming.courseDone,
  }
  const mockResults = { ...sanitiseMockResults(currentMocks) }
  for (const [paperId, result] of Object.entries(incoming.mockResults)) {
    const previous = mockResults[paperId]
    if (!previous || result.score > previous.score) mockResults[paperId] = result
  }
  return { courseDone, mockResults }
}

export function progressBackupFilename(date = new Date()) {
  return `chemlab-progress-${date.toISOString().slice(0, 10)}.json`
}
