/**
 * Appwrite-backed classroom driver.
 *
 * Implements exactly the same seven operations as createLocalDriver, returning
 * the same row shapes, so App code never branches on which driver it holds.
 * The local driver stays the one the gates run against: no network, no flake.
 *
 * Deliberate choices:
 * - Uses the REST endpoints directly over fetch instead of the Appwrite SDK.
 *   The SDK is ~40 kB for the handful of calls we make, and this app ships a
 *   1 MB first-load budget for learners on 2G. Teachers are the only users who
 *   touch this code path, and it is lazily imported.
 * - Learner-facing reads (findClassByCode, listAssignments) and submitResults
 *   are unauthenticated by design: learners have no accounts. Teacher-only
 *   operations carry the session automatically via cookies.
 * - Every method degrades to a thrown Error with a human-readable message;
 *   callers already show offline/degraded states.
 */

import {
  ASSIGNMENT_TITLE_MAX,
  CLASS_NAME_MAX,
  makeJoinCode,
  normaliseJoinCode,
  sanitiseAlias,
  sanitiseItems,
} from './classroom.js'

const DB = 'chemlab'
const CLASSES = 'classes'
const ASSIGNMENTS = 'assignments'
const SUBMISSIONS = 'submissions'

function readConfig() {
  const env = import.meta.env ?? {}
  return {
    endpoint: env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
    project: env.VITE_APPWRITE_PROJECT_ID || '',
  }
}

/** Appwrite returns {message, type}; surface the message, never the raw body. */
async function toError(response) {
  let message = `Request failed (${response.status})`
  try {
    const body = await response.json()
    if (body?.message) message = body.message
  } catch {
    // Non-JSON error (proxy, offline): keep the status-only message.
  }
  return new Error(message)
}

export function createAppwriteDriver(config = {}) {
  const { endpoint, project } = { ...readConfig(), ...config }
  if (!project) {
    throw new Error('Appwrite project id is not configured')
  }

  async function call(method, path, { body, query } = {}) {
    const url = new URL(endpoint.replace(/\/$/, '') + path)
    for (const q of query ?? []) url.searchParams.append('queries[]', q)
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': project,
      },
      // Teacher session cookie; harmless on the learner-facing public reads.
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) throw await toError(response)
    return response.status === 204 ? {} : response.json()
  }

  const documents = (collection) => `/databases/${DB}/collections/${collection}/documents`

  // Appwrite Query helpers, written literally to avoid pulling in the SDK.
  const equal = (field, value) => JSON.stringify({ method: 'equal', attribute: field, values: [value] })
  const limit = (n) => JSON.stringify({ method: 'limit', values: [n] })
  const orderDesc = (field) => JSON.stringify({ method: 'orderDesc', attribute: field })

  const classRow = (doc) => ({
    id: doc.$id,
    name: doc.name,
    code: doc.code,
    teacherId: doc.teacherId,
    createdAt: doc.$createdAt,
  })

  const assignmentRow = (doc) => ({
    id: doc.$id,
    classId: doc.classId,
    title: doc.title,
    items: parseItems(doc.items),
    dueAt: doc.dueAt ?? null,
    createdAt: doc.$createdAt,
  })

  const submissionRow = (doc) => ({
    id: doc.$id,
    assignmentId: doc.assignmentId,
    classId: doc.classId,
    alias: doc.alias,
    payload: parseJson(doc.payload),
    summary: {
      doneCount: doc.itemsDone ?? 0,
      requiredCount: doc.itemsRequired ?? 0,
      marks: doc.mockMarks ?? 0,
      available: doc.mockAvailable ?? 0,
    },
    submittedAt: doc.$createdAt,
  })

  function parseItems(raw) {
    return sanitiseItems(parseJson(raw) ?? [])
  }

  function parseJson(raw) {
    if (typeof raw !== 'string') return raw ?? null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  return {
    name: 'appwrite',

    async createClass({ name, teacherId }) {
      const clean = String(name ?? '').trim().slice(0, CLASS_NAME_MAX)
      // The unique index on `code` is the real guard against collisions; retry
      // a few times rather than trusting a client-side existence check that
      // races with other teachers creating classes at the same moment.
      let lastError = null
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const code = makeJoinCode()
        try {
          const doc = await call('POST', documents(CLASSES), {
            body: {
              documentId: 'unique()',
              data: { name: clean, code, teacherId },
              permissions: [
                `read("user:${teacherId}")`,
                `update("user:${teacherId}")`,
                `delete("user:${teacherId}")`,
              ],
            },
          })
          return classRow(doc)
        } catch (error) {
          lastError = error
          if (!/already exists|unique/i.test(error.message)) throw error
        }
      }
      throw lastError ?? new Error('Could not allocate a join code')
    },

    async listClasses({ teacherId } = {}) {
      const query = [limit(100), orderDesc('$createdAt')]
      if (teacherId) query.unshift(equal('teacherId', teacherId))
      const body = await call('GET', documents(CLASSES), { query })
      return (body.documents ?? []).map(classRow)
    },

    async findClassByCode(code) {
      const wanted = normaliseJoinCode(code)
      if (!wanted) return null
      const body = await call('GET', documents(CLASSES), { query: [equal('code', wanted), limit(1)] })
      const doc = (body.documents ?? [])[0]
      return doc ? classRow(doc) : null
    },

    async publishAssignment({ classId, title, items, dueAt, teacherId }) {
      const clean = sanitiseItems(items)
      const doc = await call('POST', documents(ASSIGNMENTS), {
        body: {
          documentId: 'unique()',
          data: {
            classId,
            title: String(title ?? '').trim().slice(0, ASSIGNMENT_TITLE_MAX),
            items: JSON.stringify(clean),
            dueAt: dueAt ?? null,
          },
          permissions: teacherId
            ? [`update("user:${teacherId}")`, `delete("user:${teacherId}")`]
            : [],
        },
      })
      return assignmentRow(doc)
    },

    async listAssignments({ classId }) {
      const body = await call('GET', documents(ASSIGNMENTS), {
        query: [equal('classId', classId), limit(100), orderDesc('$createdAt')],
      })
      return (body.documents ?? []).map(assignmentRow)
    },

    async submitResults({ assignmentId, classId, alias, payload, summary, teacherId }) {
      const doc = await call('POST', documents(SUBMISSIONS), {
        body: {
          documentId: 'unique()',
          data: {
            assignmentId,
            classId: classId ?? '',
            alias: sanitiseAlias(alias),
            payload: JSON.stringify(payload ?? {}),
            itemsDone: summary?.doneCount ?? 0,
            itemsRequired: summary?.requiredCount ?? 0,
            mockMarks: summary?.marks ?? 0,
            mockAvailable: summary?.available ?? 0,
          },
          // Only the owning teacher may read a submission. The learner keeps
          // their own copy locally; nobody else can read it back.
          permissions: teacherId
            ? [`read("user:${teacherId}")`, `update("user:${teacherId}")`, `delete("user:${teacherId}")`]
            : [],
        },
      })
      return submissionRow(doc)
    },

    async listSubmissions({ assignmentId }) {
      const body = await call('GET', documents(SUBMISSIONS), {
        query: [equal('assignmentId', assignmentId), limit(200), orderDesc('$createdAt')],
      })
      return (body.documents ?? []).map(submissionRow)
    },
  }
}

/** Teacher auth. Sessions are cookie-based; no key or token ever reaches the client. */
export function createTeacherAuth(config = {}) {
  const { endpoint, project } = { ...readConfig(), ...config }

  async function call(method, path, body) {
    const response = await fetch(endpoint.replace(/\/$/, '') + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': project },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok) throw await toError(response)
    return response.status === 204 ? {} : response.json()
  }

  return {
    async signIn({ email, password }) {
      await call('POST', '/account/sessions/email', { email, password })
      return call('GET', '/account')
    },
    async register({ email, password, name }) {
      await call('POST', '/account', { userId: 'unique()', email, password, name })
      return this.signIn({ email, password })
    },
    async current() {
      try {
        return await call('GET', '/account')
      } catch {
        return null
      }
    },
    async signOut() {
      try {
        await call('DELETE', '/account/sessions/current')
      } catch {
        // Already signed out or offline: the UI clears local state regardless.
      }
      return true
    },
    async sendVerification(redirectUrl) {
      return call('POST', '/account/verification', { url: redirectUrl })
    },
  }
}
