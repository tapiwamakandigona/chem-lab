import { useEffect, useState } from 'react'
import {
  ALIAS_MAX,
  CODE_LENGTH,
  JOINED_CLASS_KEY,
  aliasError,
  createLocalDriver,
  joinCodeError,
  kindLabelForItem,
  labelForItem,
  normaliseJoinCode,
  summariseSubmission,
} from '../lib/classroom.js'
import { loadMockResults, makeProgressBackup } from '../lib/progressBackup.js'
import { loadCourseProgress } from '../lib/course.js'
import { routeForExperiment } from '../lib/routes.js'

/**
 * Learner side of the classroom tier.
 *
 * Three rules this screen exists to honour:
 * 1. No account, no email, no real name — a nickname and a code, nothing more.
 * 2. Once joined, the assignment is cached locally, so the practicals can be
 *    done with no connection at all. Only joining and handing in need network.
 * 3. Handing in sends the same progress export the learner can already
 *    download themselves. Nothing secret, nothing extra, no tracking.
 */

/**
 * Tests and offline demos force the local driver with
 * localStorage['chemlab-driver'] = 'local'. Otherwise a configured project id
 * selects Appwrite. Deciding this at runtime rather than build time means the
 * bundle the gates exercise is byte-for-byte the bundle users get.
 */
function wantsLocalDriver() {
  try {
    return globalThis.localStorage?.getItem('chemlab-driver') === 'local'
  } catch {
    return false
  }
}

function appwriteProject() {
  return wantsLocalDriver() ? '' : import.meta.env?.VITE_APPWRITE_PROJECT_ID
}

function useDriver() {
  // Same reasoning as the teacher console: the offline case is knowable at
  // first render, so only the dynamic import needs an effect.
  const [driver, setDriver] = useState(() =>
    appwriteProject() ? null : createLocalDriver()
  )

  useEffect(() => {
    if (driver) return undefined
    let cancelled = false
    import('../lib/appwriteDriver.js')
      .then(({ createAppwriteDriver }) => { if (!cancelled) setDriver(createAppwriteDriver()) })
      .catch(() => { if (!cancelled) setDriver(createLocalDriver()) })
    return () => { cancelled = true }
  }, [driver])

  return driver
}

function readJoined() {
  try {
    const raw = globalThis.localStorage?.getItem(JOINED_CLASS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && parsed.classId ? parsed : null
  } catch {
    return null
  }
}

function writeJoined(value) {
  try {
    if (value) globalThis.localStorage?.setItem(JOINED_CLASS_KEY, JSON.stringify(value))
    else globalThis.localStorage?.removeItem(JOINED_CLASS_KEY)
  } catch {
    // Private mode: the session still works, it just will not be remembered.
  }
}

export default function ClassJoin({ onBack, onOpenExperiment }) {
  const driver = useDriver()
  const [joined, setJoined] = useState(readJoined)
  const [code, setCode] = useState('')
  const [alias, setAlias] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [assignments, setAssignments] = useState(() => joined?.assignments ?? [])
  const [sent, setSent] = useState('')

  useEffect(() => {
    if (!driver || !joined?.classId) return undefined
    let alive = true
    driver
      .listAssignments({ classId: joined.classId })
      .then((rows) => {
        if (!alive) return
        setAssignments(rows)
        // Cache so the work itself never needs a connection again.
        writeJoined({ ...joined, assignments: rows })
      })
      .catch(() => {
        // Offline: keep whatever was cached at join time. Expected, not an
        // error worth shouting about on a learner's phone.
      })
    return () => { alive = false }
  }, [driver, joined])

  const join = async (event) => {
    event.preventDefault()
    const codeProblem = joinCodeError(code)
    if (codeProblem) { setError(codeProblem); return }
    const aliasProblem = aliasError(alias)
    if (aliasProblem) { setError(aliasProblem); return }
    setBusy(true)
    setError('')
    try {
      const klass = await driver.findClassByCode(code)
      if (!klass) {
        setError('No class with that code. Check the letters with your teacher.')
        return
      }
      const rows = await driver.listAssignments({ classId: klass.id })
      const next = {
        classId: klass.id,
        className: klass.name,
        code: klass.code,
        teacherId: klass.teacherId,
        alias: alias.trim(),
        assignments: rows,
      }
      writeJoined(next)
      setJoined(next)
      setAssignments(rows)
    } catch (err) {
      setError(err.message || 'Could not reach the class. Try again when you have signal.')
    } finally {
      setBusy(false)
    }
  }

  const handIn = async (assignment) => {
    setBusy(true)
    setError('')
    try {
      // Exactly the artefact the learner can already download for themselves.
      const payload = makeProgressBackup(loadCourseProgress(), loadMockResults())
      const summary = summariseSubmission(payload, assignment.items)
      await driver.submitResults({
        assignmentId: assignment.id,
        classId: joined.classId,
        alias: joined.alias,
        payload,
        summary,
        teacherId: joined.teacherId,
      })
      setSent(assignment.id)
    } catch (err) {
      setError(err.message || 'Could not hand in yet — this needs a connection. Your work is saved.')
    } finally {
      setBusy(false)
    }
  }

  const leave = () => {
    writeJoined(null)
    setJoined(null)
    setAssignments([])
    setCode('')
    setAlias('')
  }

  if (!joined) {
    return (
      <section className="join" data-testid="join-panel">
        <header className="join-head">
          <button type="button" className="teach-link" onClick={onBack}>← Back to lab</button>
        </header>
        <h1>Join your class</h1>
        <p className="join-lede">
          Your teacher will give you a {CODE_LENGTH}-character code. You do not need an
          account, an email address or a phone number.
        </p>
        <form className="join-form" onSubmit={join}>
          <label>
            Class code
            <input
              type="text"
              value={code}
              inputMode="latin"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              maxLength={CODE_LENGTH + 2}
              className="join-code-input"
              onChange={(event) => setCode(normaliseJoinCode(event.target.value))}
              data-testid="join-code"
            />
          </label>
          <label>
            Your nickname
            <input
              type="text"
              value={alias}
              maxLength={ALIAS_MAX}
              autoComplete="off"
              placeholder="Tino B"
              onChange={(event) => setAlias(event.target.value)}
              data-testid="join-alias"
            />
            <small className="join-hint">
              Pick something your teacher will recognise. Not your full name — a nickname
              or your first name and an initial is enough.
            </small>
          </label>
          {error && <p className="teach-error" role="alert" data-testid="join-error">{error}</p>}
          <button type="submit" className="teach-primary" disabled={busy} data-testid="join-submit">
            {busy ? 'Checking…' : 'Join class'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className="join" data-testid="join-panel">
      <header className="join-head">
        <button type="button" className="teach-link" onClick={onBack}>← Back to lab</button>
        <button type="button" className="teach-link" onClick={leave} data-testid="join-leave">
          Leave class
        </button>
      </header>

      <h1>{joined.className}</h1>
      <p className="join-lede" data-testid="join-identity">
        Joined as <strong>{joined.alias}</strong> · code <code>{joined.code}</code>
      </p>

      {error && <p className="teach-error" role="alert" data-testid="join-error">{error}</p>}

      {assignments.length === 0 ? (
        <p className="teach-muted" data-testid="join-empty">
          Your teacher has not set anything yet. This page will show the work when they do.
        </p>
      ) : (
        <ul className="join-assignments" data-testid="join-assignments">
          {assignments.map((assignment) => (
            <li key={assignment.id}>
              <h2>{assignment.title}</h2>
              {assignment.dueAt && <p className="join-due">Due {assignment.dueAt}</p>}
              <ol className="teach-items">
                {assignment.items.map((item) => (
                  <li key={`${item.kind}:${item.id}`}>
                    <span className="teach-kind">{kindLabelForItem(item)}</span>
                    {item.kind === 'practical' ? (
                      <button
                        type="button"
                        className="teach-link"
                        onClick={() => onOpenExperiment?.(item.id, routeForExperiment(item.id))}
                      >
                        {labelForItem(item)}
                      </button>
                    ) : (
                      labelForItem(item)
                    )}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="teach-primary"
                disabled={busy}
                onClick={() => handIn(assignment)}
                data-testid={`hand-in-${assignment.id}`}
              >
                {sent === assignment.id ? 'Handed in ✓' : 'Hand in my results'}
              </button>
              <p className="join-hint">
                Sends the same progress summary you can download yourself. You can hand in
                again after doing more — your teacher sees only your latest.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
