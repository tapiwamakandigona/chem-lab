import { COURSE_UNITS } from './course.js'
import { EXPERIMENT_IDS, MOCK_PAPERS } from './routes.js'
import { parseProgressBackup } from './progressBackup.js'

export const CLASSROOM_VERSION = 1
export const CLASSROOM_KEY = 'chemlab-classroom-v1'
export const JOINED_CLASS_KEY = 'chemlab-joined-class-v1'

// Deliberately excludes 0/O, 1/I/L, 2/Z, 5/S, 8/B: a join code gets read off a
// whiteboard and typed by thirty learners, so lookalikes cost real lesson time.
export const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679'
export const CODE_LENGTH = 6

const COURSE_IDS = new Set(COURSE_UNITS.map((unit) => unit.id))
const PRACTICAL_IDS = new Set(EXPERIMENT_IDS)
const MOCK_IDS = new Set(MOCK_PAPERS.map((paper) => paper.id))
const MOCK_TITLES = new Map(MOCK_PAPERS.map((paper) => [paper.id, paper.title]))

export const ITEM_KINDS = ['practical', 'unit', 'mock']
export const ALIAS_MAX = 24
const ALIAS_MIN = 2
export const CLASS_NAME_MAX = 60
export const ASSIGNMENT_TITLE_MAX = 80
export const MAX_ITEMS = 25

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function randomInt(max, rng) {
  if (rng) return Math.floor(rng() * max)
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
  if (cryptoObj?.getRandomValues) {
    // Rejection-sample so the modulo does not bias the alphabet.
    const limit = Math.floor(256 / max) * max
    const buf = new Uint8Array(1)
    for (;;) {
      cryptoObj.getRandomValues(buf)
      if (buf[0] < limit) return buf[0] % max
    }
  }
  return Math.floor(Math.random() * max)
}

export function makeJoinCode(rng) {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length, rng)]
  }
  return code
}

/** Accepts what a learner actually types: lower case, spaces, hyphens. */
export function normaliseJoinCode(raw) {
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[\s-]+/g, '')
}

export function joinCodeError(raw) {
  const code = normaliseJoinCode(raw)
  if (code.length === 0) return 'Enter the class code your teacher gave you.'
  if (code.length !== CODE_LENGTH) return `Class codes are ${CODE_LENGTH} characters.`
  for (const char of code) {
    if (!CODE_ALPHABET.includes(char)) {
      return `That code contains ${char}, which class codes never use. Check it against the board.`
    }
  }
  return null
}

/**
 * Learners are pseudonymous by design: an alias, never an email or real name.
 * Schools run this with minors, so the safest record is the one we never hold.
 */
export function sanitiseAlias(raw) {
  const alias = String(raw ?? '')
    // Tab and newline are control characters too, so collapse whitespace FIRST;
    // stripping controls first turned 'Rue\tKuda' into 'RueKuda' (gate caught it).
    .replace(/\s+/g, ' ')
    // Then strip the whole C0 range plus DEL — an alias lands in a CSV export.
    // This must be a RANGE: [-...] is a set containing a literal hyphen, which
    // silently deleted hyphens from names like Ana-Maria.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, ALIAS_MAX)
  return alias
}

export function aliasError(raw) {
  const alias = sanitiseAlias(raw)
  if (alias.length < ALIAS_MIN) return 'Choose a display name of at least 2 characters.'
  if (alias.includes('@')) return 'Use a nickname, not an email address — we never store learner emails.'
  return null
}

export function labelForItem(item) {
  if (!isRecord(item)) return 'Unknown item'
  if (item.kind === 'practical') {
    return PRACTICAL_IDS.has(item.id) ? `Practical: ${item.id}` : 'Unknown practical'
  }
  if (item.kind === 'unit') {
    const unit = COURSE_UNITS.find((candidate) => candidate.id === item.id)
    return unit ? `Guide: ${unit.title}` : 'Unknown guide unit'
  }
  if (item.kind === 'mock') {
    return MOCK_TITLES.has(item.id) ? `Mock: ${MOCK_TITLES.get(item.id)}` : 'Unknown mock paper'
  }
  return 'Unknown item'
}

export function itemExists(item) {
  if (!isRecord(item) || !ITEM_KINDS.includes(item.kind)) return false
  if (item.kind === 'practical') return PRACTICAL_IDS.has(item.id)
  if (item.kind === 'unit') return COURSE_IDS.has(item.id)
  return MOCK_IDS.has(item.id)
}

export function sanitiseItems(items) {
  if (!Array.isArray(items)) return []
  const seen = new Set()
  const clean = []
  for (const item of items) {
    if (!itemExists(item)) continue
    const key = `${item.kind}:${item.id}`
    if (seen.has(key)) continue
    seen.add(key)
    clean.push({ kind: item.kind, id: item.id })
    if (clean.length >= MAX_ITEMS) break
  }
  return clean
}

export function assignmentError({ title, items, dueAt } = {}) {
  const cleanTitle = String(title ?? '').trim()
  if (cleanTitle.length < 3) return 'Give the assignment a title learners will recognise.'
  if (sanitiseItems(items).length === 0) return 'Add at least one practical, guide unit or mock paper.'
  if (dueAt) {
    const due = new Date(dueAt)
    if (Number.isNaN(due.getTime())) return 'That due date is not a valid date.'
  }
  return null
}

/**
 * Turns a learner's existing chemlab-progress export into the teacher-facing
 * summary. Reuses the versioned backup format rather than inventing a second
 * wire shape, so an offline learner can hand in the very same file.
 */
export function summariseSubmission(payload, assignmentItems = []) {
  const backup = parseProgressBackup(payload)
  const items = sanitiseItems(assignmentItems)
  const unitsDone = Object.keys(backup.courseDone ?? {})
  const mocks = backup.mockResults ?? {}
  let marks = 0
  let available = 0
  for (const result of Object.values(mocks)) {
    marks += result.score
    available += result.total
  }
  const requiredUnits = items.filter((item) => item.kind === 'unit')
  const requiredMocks = items.filter((item) => item.kind === 'mock')
  const doneRequiredUnits = requiredUnits.filter((item) => unitsDone.includes(item.id))
  const doneRequiredMocks = requiredMocks.filter((item) => Object.hasOwn(mocks, item.id))
  const requiredCount = requiredUnits.length + requiredMocks.length
  const doneCount = doneRequiredUnits.length + doneRequiredMocks.length
  return {
    unitsDone: unitsDone.length,
    mockResults: mocks,
    marks,
    available,
    requiredCount,
    doneCount,
    // A practical has no single completion flag, so it is never scored as
    // "done" from a progress file — the teacher sees mock marks and units.
    complete: requiredCount > 0 && doneCount === requiredCount,
  }
}

function emptyStore() {
  return { version: CLASSROOM_VERSION, classes: [], assignments: [], submissions: [] }
}

function newId(prefix, rng) {
  let tail = ''
  for (let i = 0; i < 10; i += 1) tail += CODE_ALPHABET[randomInt(CODE_ALPHABET.length, rng)]
  return `${prefix}_${tail}`
}

/**
 * localStorage-backed driver: no network at all. The probe gates run against
 * this so classroom assertions stay deterministic and the offline promise is
 * testable; the Appwrite driver implements the same seven operations.
 */
export function createLocalDriver({ storage, rng } = {}) {
  const store = () => {
    const backing = storage ?? globalThis.localStorage
    try {
      const raw = backing.getItem(CLASSROOM_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (!isRecord(parsed)) return emptyStore()
      return {
        version: CLASSROOM_VERSION,
        classes: Array.isArray(parsed.classes) ? parsed.classes : [],
        assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      }
    } catch {
      return emptyStore()
    }
  }
  const commit = (next) => {
    const backing = storage ?? globalThis.localStorage
    try {
      backing.setItem(CLASSROOM_KEY, JSON.stringify(next))
    } catch {
      // Storage full or private mode: the caller still gets its return value
      // for this session, matching how progress saving already degrades.
    }
  }

  return {
    name: 'local',
    async createClass({ name, teacherId }) {
      const data = store()
      const clean = String(name ?? '').trim().slice(0, CLASS_NAME_MAX)
      let code = makeJoinCode(rng)
      let guard = 0
      while (data.classes.some((row) => row.code === code) && guard < 50) {
        code = makeJoinCode(rng)
        guard += 1
      }
      const row = {
        id: newId('class', rng),
        name: clean,
        code,
        teacherId: teacherId ?? 'local-teacher',
        createdAt: new Date().toISOString(),
      }
      data.classes.push(row)
      commit(data)
      return row
    },
    async listClasses({ teacherId } = {}) {
      return store().classes.filter(
        (row) => !teacherId || row.teacherId === teacherId
      )
    },
    async findClassByCode(code) {
      const wanted = normaliseJoinCode(code)
      return store().classes.find((row) => row.code === wanted) ?? null
    },
    async publishAssignment({ classId, title, items, dueAt }) {
      const data = store()
      const row = {
        id: newId('asg', rng),
        classId,
        title: String(title ?? '').trim().slice(0, ASSIGNMENT_TITLE_MAX),
        items: sanitiseItems(items),
        dueAt: dueAt ?? null,
        createdAt: new Date().toISOString(),
      }
      data.assignments.push(row)
      commit(data)
      return row
    },
    async listAssignments({ classId }) {
      return store().assignments.filter((row) => row.classId === classId)
    },
    async submitResults({ assignmentId, alias, payload, summary }) {
      const data = store()
      const row = {
        id: newId('sub', rng),
        assignmentId,
        alias: sanitiseAlias(alias),
        summary,
        payload,
        submittedAt: new Date().toISOString(),
      }
      // One submission per alias per assignment: a resubmit replaces, so a
      // learner fixing a mock does not appear twice in the teacher's list.
      const index = data.submissions.findIndex(
        (existing) => existing.assignmentId === assignmentId && existing.alias === row.alias
      )
      if (index >= 0) data.submissions[index] = row
      else data.submissions.push(row)
      commit(data)
      return row
    },
    async listSubmissions({ assignmentId }) {
      return store().submissions.filter((row) => row.assignmentId === assignmentId)
    },
  }
}

export function submissionsToCsv(submissions, assignment) {
  const header = ['alias', 'submitted_at', 'items_done', 'items_required', 'mock_marks', 'mock_available']
  const rows = submissions.map((row) => [
    row.alias,
    row.submittedAt,
    row.summary?.doneCount ?? 0,
    row.summary?.requiredCount ?? sanitiseItems(assignment?.items).length,
    row.summary?.marks ?? 0,
    row.summary?.available ?? 0,
  ])
  return [header, ...rows]
    .map((cells) =>
      cells
        .map((cell) => {
          const text = String(cell ?? '')
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
        })
        .join(',')
    )
    .join('\n')
}
