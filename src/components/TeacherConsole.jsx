import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ASSIGNMENT_TITLE_MAX,
  CLASS_NAME_MAX,
  MAX_ITEMS,
  assignmentError,
  createLocalDriver,
  kindLabelForItem,
  labelForItem,
  submissionsToCsv,
} from '../lib/classroom.js'
import { MOCK_PAPERS, PRACTICAL_META } from '../lib/routes.js'
import PracticalIcon from './PracticalIcon.jsx'

/**
 * Teacher console: sign in, create a class, publish an assignment, read results.
 *
 * The console holds a *driver*, not a backend. When Appwrite is configured it
 * uses the network driver; otherwise it falls back to the offline local driver
 * and says so plainly, because a teacher on a dead connection should still be
 * able to plan an assignment rather than stare at an error page.
 */

const SIGNED_IN_HINT = 'chemlab-teacher-hint-v1'

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
  // The local/offline decision is knowable at first render, so it belongs in a
  // lazy initialiser. Only the dynamic import needs an effect, and that sets
  // state from a promise callback (after an await boundary), which is fine.
  const [state, setState] = useState(() =>
    appwriteProject()
      ? { driver: null, auth: null, mode: 'loading' }
      : { driver: createLocalDriver(), auth: null, mode: 'local' }
  )

  useEffect(() => {
    if (state.mode !== 'loading') return undefined
    let cancelled = false
    // Lazily imported so learners never download teacher code paths.
    import('../lib/appwriteDriver.js')
      .then(({ createAppwriteDriver, createTeacherAuth }) => {
        if (cancelled) return
        setState({ driver: createAppwriteDriver(), auth: createTeacherAuth(), mode: 'appwrite' })
      })
      .catch(() => {
        if (!cancelled) setState({ driver: createLocalDriver(), auth: null, mode: 'local' })
      })
    return () => { cancelled = true }
  }, [state.mode])

  return state
}

function SignIn({ auth, onSignedIn }) {
  const [mode, setMode] = useState(() =>
    globalThis.localStorage?.getItem(SIGNED_IN_HINT) ? 'signin' : 'register'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.includes('@')) {
      setError('Enter the email address you want to sign in with.')
      return
    }
    if (password.length < 8) {
      setError('Appwrite requires at least 8 characters. Longer is better than clever.')
      return
    }
    setBusy(true)
    try {
      const account = mode === 'register'
        ? await auth.register({ email, password, name: name.trim() || 'Teacher' })
        : await auth.signIn({ email, password })
      globalThis.localStorage?.setItem(SIGNED_IN_HINT, '1')
      onSignedIn(account)
    } catch (err) {
      setError(err.message || 'Sign-in failed. Check the email and password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="teach-auth" onSubmit={submit} data-testid="teach-auth">
      <h2>{mode === 'register' ? 'Create a teacher account' : 'Teacher sign-in'}</h2>
      <p className="teach-auth__note">
        Only teachers have accounts. Your learners join with a six-character code and a
        nickname — ChemLab never asks a learner for an email or a real name.
      </p>
      {mode === 'register' && (
        <label>
          Your name
          <input
            type="text"
            value={name}
            autoComplete="name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Mrs Chirwa"
          />
        </label>
      )}
      <label>
        Email
        <input
          type="email"
          value={email}
          required
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          data-testid="teach-email"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          required
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onChange={(event) => setPassword(event.target.value)}
          data-testid="teach-password"
        />
      </label>
      {error && <p className="teach-error" role="alert" data-testid="teach-auth-error">{error}</p>}
      <button type="submit" className="teach-primary" disabled={busy} data-testid="teach-submit">
        {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </button>
      <button
        type="button"
        className="teach-link"
        onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setError('') }}
      >
        {mode === 'register' ? 'I already have an account' : 'I need to create an account'}
      </button>
    </form>
  )
}

function AssignmentBuilder({ klass, driver, teacherId, onPublished }) {
  const [title, setTitle] = useState('')
  const [items, setItems] = useState([])
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (kind, id) => {
    setItems((current) => {
      const found = current.some((item) => item.kind === kind && item.id === id)
      if (found) return current.filter((item) => !(item.kind === kind && item.id === id))
      if (current.length >= MAX_ITEMS) return current
      return [...current, { kind, id }]
    })
  }

  const publish = async (event) => {
    event.preventDefault()
    const problem = assignmentError({ title, items })
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError('')
    try {
      const row = await driver.publishAssignment({
        classId: klass.id,
        title,
        items,
        dueAt: dueAt || null,
        teacherId,
      })
      setTitle(''); setItems([]); setDueAt('')
      onPublished(row)
    } catch (err) {
      setError(err.message || 'Could not publish this assignment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="teach-builder" onSubmit={publish} data-testid="assignment-builder">
      <label>
        Assignment title
        <input
          type="text"
          value={title}
          maxLength={ASSIGNMENT_TITLE_MAX}
          placeholder="Week 3 — titration technique"
          onChange={(event) => setTitle(event.target.value)}
          data-testid="assignment-title"
        />
      </label>
      <label>
        Due date <span className="teach-optional">(optional)</span>
        <input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      </label>

      <fieldset className="teach-picker">
        <legend>Practicals</legend>
        <div className="teach-picker__grid">
          {PRACTICAL_META.map(({ id, title: label }) => {
            const on = items.some((item) => item.kind === 'practical' && item.id === id)
            return (
              <button
                type="button"
                key={id}
                className={`teach-chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle('practical', id)}
                data-testid={`pick-practical-${id}`}
              >
                <PracticalIcon id={id} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="teach-picker">
        <legend>Marked mock papers</legend>
        <div className="teach-picker__grid">
          {MOCK_PAPERS.map(({ id, title: label, subtitle }) => {
            const on = items.some((item) => item.kind === 'mock' && item.id === id)
            return (
              <button
                type="button"
                key={id}
                className={`teach-chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle('mock', id)}
                data-testid={`pick-mock-${id}`}
              >
                <span>{label}<small>{subtitle}</small></span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <p className="teach-count" data-testid="assignment-count">
        {items.length} of {MAX_ITEMS} selected
      </p>
      {error && <p className="teach-error" role="alert" data-testid="assignment-error">{error}</p>}
      <button type="submit" className="teach-primary" disabled={busy} data-testid="assignment-publish">
        {busy ? 'Publishing…' : 'Publish to class'}
      </button>
    </form>
  )
}

function Results({ assignment, driver }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  // Refresh bumps a token; the effect is the single place that loads. This
  // keeps state updates on the far side of an await, never synchronous.
  const [token, setToken] = useState(0)

  useEffect(() => {
    let alive = true
    driver
      .listSubmissions({ assignmentId: assignment.id })
      .then((next) => { if (alive) setRows(next) })
      .catch((err) => { if (alive) setError(err.message || 'Could not load submissions.') })
    return () => { alive = false }
  }, [assignment.id, driver, token])

  const csv = useMemo(() => (rows ? submissionsToCsv(rows, assignment) : ''), [rows, assignment])

  const download = () => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const slug = assignment.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    link.href = url
    link.download = `chemlab-${slug || 'assignment'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (error) return <p className="teach-error" role="alert">{error}</p>
  if (!rows) return <p className="teach-muted">Loading results…</p>

  const required = assignment.items.length

  return (
    <div className="teach-results" data-testid="assignment-results">
      <div className="teach-results__head">
        <h4>{rows.length} submission{rows.length === 1 ? '' : 's'}</h4>
        <div>
          <button type="button" className="teach-link" onClick={() => setToken((n) => n + 1)}>Refresh</button>
          <button
            type="button"
            className="teach-secondary"
            onClick={download}
            disabled={!rows.length}
            data-testid="results-csv"
          >
            Export CSV
          </button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="teach-muted">
          Nothing handed in yet. Learners submit from the class screen after finishing the work.
        </p>
      ) : (
        <table className="teach-table">
          <thead>
            <tr>
              <th scope="col">Learner</th>
              <th scope="col">Done</th>
              <th scope="col">Mock marks</th>
              <th scope="col">Handed in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.alias}</td>
                <td>
                  {row.summary?.doneCount ?? 0}/{row.summary?.requiredCount ?? required}
                </td>
                <td>
                  {row.summary?.available
                    ? `${row.summary.marks}/${row.summary.available}`
                    : '—'}
                </td>
                <td>{new Date(row.submittedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function TeacherConsole({ onBack }) {
  const { driver, auth, mode } = useDriver()
  // `undefined` = not yet known, `null` = signed out, object = signed in. The
  // distinction lets "checking" be derived instead of set from an effect.
  const [account, setAccount] = useState(undefined)
  const [classes, setClasses] = useState([])
  const [activeClassId, setActiveClassId] = useState(null)
  const [assignmentsFor, setAssignmentsFor] = useState({ classId: null, rows: [] })
  const [openAssignmentId, setOpenAssignmentId] = useState(null)
  const [className, setClassName] = useState('')
  const [error, setError] = useState('')
  const [classesToken, setClassesToken] = useState(0)
  const [assignmentsToken, setAssignmentsToken] = useState(0)
  const copyTimer = useRef(null)
  const [copied, setCopied] = useState('')

  const teacherId = account?.$id ?? 'local-teacher'
  const checking = mode === 'loading' || (Boolean(auth) && account === undefined)

  useEffect(() => {
    if (mode === 'loading' || !auth) return undefined
    let cancelled = false
    auth.current().then((current) => { if (!cancelled) setAccount(current) })
    return () => { cancelled = true }
  }, [auth, mode])

  const signedIn = auth ? Boolean(account) : true

  useEffect(() => {
    if (!driver || !signedIn) return undefined
    let alive = true
    driver
      .listClasses({ teacherId })
      .then((rows) => {
        if (!alive) return
        setClasses(rows)
        setActiveClassId((current) => current ?? rows[0]?.id ?? null)
      })
      .catch((err) => { if (alive) setError(err.message || 'Could not load your classes.') })
    return () => { alive = false }
  }, [driver, signedIn, teacherId, classesToken])

  const activeClass = classes.find((row) => row.id === activeClassId) ?? null

  useEffect(() => {
    if (!driver || !activeClass) return undefined
    let alive = true
    driver
      .listAssignments({ classId: activeClass.id })
      .then((rows) => { if (alive) setAssignmentsFor({ classId: activeClass.id, rows }) })
      .catch((err) => { if (alive) setError(err.message || 'Could not load assignments.') })
    return () => { alive = false }
  }, [driver, activeClass, assignmentsToken])

  // Derived rather than cleared in an effect: assignments belonging to another
  // class must never flash on screen while the new class loads.
  const assignments = assignmentsFor.classId === activeClass?.id ? assignmentsFor.rows : []

  useEffect(() => () => clearTimeout(copyTimer.current), [])

  const createClass = async (event) => {
    event.preventDefault()
    const clean = className.trim()
    if (clean.length < 2) {
      setError('Give the class a name you will recognise, like “12B Chemistry”.')
      return
    }
    setError('')
    try {
      const row = await driver.createClass({ name: clean, teacherId })
      setClassName('')
      setClasses((current) => [row, ...current])
      setActiveClassId(row.id)
      setClassesToken((n) => n + 1)
    } catch (err) {
      setError(err.message || 'Could not create the class.')
    }
  }

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(''), 2000)
    } catch {
      // Clipboard blocked (http, permissions): the code is on screen anyway.
    }
  }

  if (mode === 'loading' || checking) {
    return (
      <section className="teach" data-testid="teach-panel">
        <p className="teach-muted">Opening the teacher console…</p>
      </section>
    )
  }

  if (auth && account === null) {
    return (
      <section className="teach" data-testid="teach-panel">
        <header className="teach-head">
          <button type="button" className="teach-link" onClick={onBack}>← Back to lab</button>
        </header>
        <SignIn auth={auth} onSignedIn={setAccount} />
      </section>
    )
  }

  return (
    <section className="teach" data-testid="teach-panel">
      <header className="teach-head">
        <button type="button" className="teach-link" onClick={onBack}>← Back to lab</button>
        <div className="teach-head__who">
          {account ? (
            <>
              <span>{account.name || account.email}</span>
              <button
                type="button"
                className="teach-link"
                onClick={async () => { await auth.signOut(); setAccount(null); setClasses([]); setActiveClassId(null) }}
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="teach-badge" data-testid="teach-local-badge">
              Offline mode — saved on this device only
            </span>
          )}
        </div>
      </header>

      <h1>Your classes</h1>
      {error && <p className="teach-error" role="alert" data-testid="teach-error">{error}</p>}

      <div className="teach-grid">
        <div className="teach-col">
      <form className="teach-newclass" onSubmit={createClass}>
        <label>
          New class
          <input
            type="text"
            value={className}
            maxLength={CLASS_NAME_MAX}
            placeholder="12B Chemistry"
            onChange={(event) => setClassName(event.target.value)}
            data-testid="class-name"
          />
        </label>
        <button type="submit" className="teach-primary" data-testid="class-create">Create class</button>
      </form>

      {classes.length === 0 ? (
        <p className="teach-muted" data-testid="teach-empty">
          No classes yet. Create one and you will get a join code to read out.
        </p>
      ) : (
        <ul className="teach-classes" data-testid="class-list">
          {classes.map((row) => (
            <li key={row.id} className={row.id === activeClassId ? 'is-active' : ''}>
              <button type="button" onClick={() => setActiveClassId(row.id)}>
                <strong>{row.name}</strong>
                <code data-testid={`class-code-${row.id}`}>{row.code}</code>
              </button>
              <button
                type="button"
                className="teach-link"
                onClick={() => copyCode(row.code)}
                data-testid={`copy-code-${row.id}`}
              >
                {copied === row.code ? 'Copied' : 'Copy code'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeClass && (
        <div className="teach-codecard" data-testid="active-class-code">
            <p>Learners join at <strong>chemlab.tapiwa.me/join</strong> with</p>
            <code>{activeClass.code}</code>
          <p className="teach-muted">
            No sign-up, no email. The code is all they need — write it on the board.
          </p>
        </div>
      )}
        </div>

        <div className="teach-col">
      {activeClass && (
        <>
          <h2>Set an assignment</h2>
          <AssignmentBuilder
            klass={activeClass}
            driver={driver}
            teacherId={teacherId}
            onPublished={(row) => { setAssignmentsToken((n) => n + 1); setOpenAssignmentId(row.id) }}
          />

          <h2>Published assignments</h2>
          {assignments.length === 0 ? (
            <p className="teach-muted">Nothing set for this class yet.</p>
          ) : (
            <ul className="teach-assignments" data-testid="assignment-list">
              {assignments.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="teach-assignment"
                    aria-expanded={openAssignmentId === row.id}
                    onClick={() => setOpenAssignmentId(openAssignmentId === row.id ? null : row.id)}
                    data-testid={`assignment-${row.id}`}
                  >
                    <strong>{row.title}</strong>
                    <span>
                      {row.items.length} item{row.items.length === 1 ? '' : 's'}
                      {row.dueAt ? ` · due ${row.dueAt}` : ''}
                    </span>
                  </button>
                  {openAssignmentId === row.id && (
                    <div className="teach-assignment__body">
                      <ol className="teach-items">
                        {row.items.map((item) => (
                          <li key={`${item.kind}:${item.id}`}>
                            <span className="teach-kind">{kindLabelForItem(item)}</span>
                            {labelForItem(item)}
                          </li>
                        ))}
                      </ol>
                      <Results assignment={row} driver={driver} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
        </div>
      </div>
    </section>
  )
}
