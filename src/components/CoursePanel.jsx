import { useEffect, useRef, useState } from 'react'
import { useLabStore } from '../store.js'
import { COURSE_UNITS, courseProgressCount } from '../lib/course.js'
import {
  makeProgressBackup,
  parseProgressBackup,
  progressBackupFilename,
} from '../lib/progressBackup.js'

// CourseTracker: mounted once in App. Watches live experiment state and
// permanently ticks course units the moment their milestone is met —
// learning is tracked while the student just does the practical.
export function CourseTracker() {
  const state = useLabStore()
  const { experiment, courseDone, courseMarkDone } = state

  useEffect(() => {
    // Import can update the store while this tracker stays mounted. Do not
    // immediately infer and add extra milestones in the same render cycle;
    // the imported file is the source of truth until the learner next does
    // work in a practical.
    if (!experiment) return
    for (const u of COURSE_UNITS) {
      if (!courseDone[u.id] && u.check(state)) courseMarkDone(u.id)
    }
  }, [courseDone, courseMarkDone, experiment, state])

  return null
}

const EXPERIMENT_LABEL = {
  titration: 'Titration',
  clock: 'Iodine Clock',
  enthalpy: 'Enthalpy',
  qual: 'Qualitative Analysis',
  grav: 'Water of Crystallisation',
  gas: 'Molar Gas Volume',
  organic: 'Organic Analysis',
  electro: 'Electrochemical Cells',
  chroma: 'Chromatography',
  flame: 'Flame Tests',
  distill: 'Simple Distillation',
  solubility: 'Solubility Curve',
  peroxide: 'Catalytic Kinetics',
  'iodine-rate': 'Iodine Rate Titration',
}

function ProgressSeal({ doneCount, total }) {
  const completed = doneCount === total
  return (
    <section
      className={`progress-seal ${completed ? 'is-complete' : ''}`}
      data-testid="progress-seal"
      aria-label="ChemLab progress card"
    >
      <div className="progress-seal__mark" aria-hidden="true">CL</div>
      <div>
        <p>{completed ? 'PAPER 3 PRACTICE COMPLETE' : 'PAPER 3 PRACTICE RECORD'}</p>
        <strong data-testid="progress-seal-score">{doneCount}/{total} milestones</strong>
        <span>
          {completed
            ? 'Every guided ChemLab skill completed on this device.'
            : 'A local practice record—keep going, then capture or share this card.'}
        </span>
      </div>
    </section>
  )
}

// Menu-level "learn by doing" path: ordered milestones across all
// experiments, with a Start button that drops the learner into the right
// experiment with the step coach open.
export default function CoursePanel({ onClose, onNavigateExperiment }) {
  const {
    courseDone,
    mockResults,
    mergeLearnerProgress,
    setExperiment,
    setGuideOpen,
    setCourseOpen,
  } = useLabStore()
  const [backupStatus, setBackupStatus] = useState(null)
  const importRef = useRef(null)
  const doneCount = courseProgressCount(courseDone)
  const total = COURSE_UNITS.length
  const nextUnit = COURSE_UNITS.find((u) => !courseDone[u.id])

  const start = (unit) => {
    // Close the panel so returning to the menu doesn't re-cover it with the
    // overlay — the learner reopens it to see fresh ticks.
    setCourseOpen(false)
    setGuideOpen(true)
    if (onNavigateExperiment) {
      onNavigateExperiment(unit.experiment)
    } else {
      setExperiment(unit.experiment)
    }
  }

  const exportProgress = () => {
    const backup = makeProgressBackup(courseDone, mockResults)
    const url = URL.createObjectURL(
      new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: 'application/json' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = progressBackupFilename()
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    setBackupStatus({
      ok: true,
      text: `Backup downloaded: ${courseProgressCount(backup.courseDone)} milestones and ${Object.keys(backup.mockResults).length} best mock ${Object.keys(backup.mockResults).length === 1 ? 'score' : 'scores'}.`,
    })
  }

  const importProgress = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      if (file.size > 100_000) throw new Error('That file is too large to be a ChemLab backup.')
      const incoming = parseProgressBackup(await file.text())
      mergeLearnerProgress(incoming)
      setBackupStatus({
        ok: true,
        text: `Progress merged — nothing already completed was erased.`,
      })
    } catch (error) {
      setBackupStatus({ ok: false, text: error.message })
    }
  }

  return (
    <div
      data-testid="course-panel"
      className="fixed inset-0 z-40 bg-lab-bg flex items-center justify-center p-2 md:p-4"
    >
      <div
        className="bg-lab-panel border border-lab-border rounded-xl w-full max-w-2xl max-h-[calc(100vh-1rem)] md:max-h-[calc(100vh-2rem)] overflow-y-auto p-5"
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lab-ink font-semibold text-base">Learner&apos;s Guide</h1>
          <button
            onClick={onClose}
            data-testid="course-close"
            className="text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-lab-muted leading-relaxed mb-3">
          Learn Paper 3 by doing it. Each milestone ticks itself the moment you
          achieve it in the lab — technique first, then analysis, then a mock
          paper marked like the real thing. Progress is saved on this device.
        </p>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-[10px] text-lab-muted mb-1">
            <span>Progress</span>
            <span data-testid="course-progress" data-done={doneCount} data-total={total}>
              {doneCount}/{total}
            </span>
          </div>
          <div className="h-1.5 bg-[#0c1e35] rounded-full overflow-hidden">
            <div
              className="h-full bg-lab-accent rounded-full transition-all"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        </div>

        <section className="progress-backup" aria-labelledby="progress-backup-title">
          <div>
            <h3 id="progress-backup-title">Move progress to another device</h3>
            <p>
              Download a small JSON backup, then import it on another phone or computer.
              It stays in your files: ChemLab does not upload it. Import only adds milestones
              and keeps the higher mock-paper score.
            </p>
          </div>
          <div className="progress-backup__actions">
            <button type="button" data-testid="progress-export" onClick={exportProgress}>
              Download backup
            </button>
            <button
              type="button"
              data-testid="progress-import"
              onClick={() => importRef.current?.click()}
            >
              Import backup
            </button>
            <input
              ref={importRef}
              data-testid="progress-import-file"
              type="file"
              accept="application/json,.json"
              onChange={importProgress}
              className="sr-only"
            />
          </div>
          {backupStatus && (
            <p
              className={`progress-backup__status ${backupStatus.ok ? 'is-success' : 'is-error'}`}
              data-testid="progress-backup-status"
              role="status"
            >
              {backupStatus.text}
            </p>
          )}
        </section>

        <ProgressSeal doneCount={doneCount} total={total} />
        <div className="progress-share-actions">
          <button
            type="button"
            data-testid="progress-print"
            onClick={() => window.print()}
          >
            Print / save progress card
          </button>
          <button
            type="button"
            data-testid="progress-share"
            onClick={async () => {
              const text = `I have completed ${doneCount}/${total} ChemLab Paper 3 practice milestones.`
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: 'My ChemLab practice record',
                    text,
                    url: window.location.href,
                  })
                  return
                } catch (error) {
                  if (error?.name === 'AbortError') return
                }
              }
              try {
                await navigator.clipboard.writeText(`${text} ${window.location.href}`)
                setBackupStatus({ ok: true, text: 'Share text copied to your clipboard.' })
              } catch {
                setBackupStatus({ ok: false, text: 'Use Print / save, or take a screenshot of the card.' })
              }
            }}
          >
            Share progress
          </button>
        </div>

        <div className="space-y-2">
          {COURSE_UNITS.map((u, i) => {
            const done = !!courseDone[u.id]
            const isNext = nextUnit?.id === u.id
            return (
              <div
                key={u.id}
                data-testid={`course-unit-${u.id}`}
                data-done={done ? '1' : '0'}
                className={`p-3 rounded-lg border ${
                  done
                    ? 'border-emerald-700/50 bg-emerald-900/15'
                    : isNext
                      ? 'border-lab-accent/60 bg-lab-accent/5'
                      : 'border-lab-border bg-[#141f2e]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                      done ? 'bg-emerald-600 text-white' : 'bg-[#0c1e35] text-lab-muted border border-lab-border'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${done ? 'text-emerald-300' : 'text-lab-ink'}`}>
                        {u.title}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
                        {EXPERIMENT_LABEL[u.experiment]}
                      </span>
                    </div>
                    <p className="text-[10px] text-lab-muted mt-0.5 leading-relaxed">{u.desc}</p>
                  </div>
                  {!done && (
                    <button
                      onClick={() => start(u)}
                      data-testid={`course-start-${u.id}`}
                      className={`shrink-0 text-[10px] px-2.5 py-1.5 rounded border transition-colors ${
                        isNext
                          ? 'border-lab-accent text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20'
                          : 'border-lab-border text-lab-muted hover:border-lab-muted'
                      }`}
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {doneCount === total && (
          <p className="text-emerald-300 text-xs mt-4 text-center" data-testid="course-complete">
            Course complete — you have practised every Paper 3 skill on this platform.
          </p>
        )}
      </div>
    </div>
  )
}
