import { createPortal } from 'react-dom'
import { useLabStore } from '../store.js'
import { markTestAttempt, saveTestResult } from '../lib/testMode.js'

// Test mode — entry chip, in-test banner and the marked report.
//
// Practice mode: a single "Test mode" chip sits in the left HUD lane under
// the guide chip. Entering test mode hides the guide coach (GuideCoach
// checks the flag) and shows a slim TEST banner with a Hand in button.
// Nothing about the practical itself is blocked: wrong moves are allowed
// and stand uncorrected until the learner hands in. Hand-in marks the
// current state against the same predicates guided mode uses and shows an
// examiner-style report — ✓/✗ per criterion, with a teacher's-margin-note
// correction for every miss.

function ReportOverlay({ report, onClose, onExit }) {
  return createPortal(
    <div
      data-testid="test-report"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3"
      role="dialog"
      aria-label="Marked test report"
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-lab-border bg-lab-panel">
        <div className="border-b border-lab-border p-4">
          <p className="font-mono text-[10px] tracking-wider text-lab-accent">TEST MODE · MARKED</p>
          <h2 className="mt-1 text-lg font-semibold text-lab-ink">
            <span data-testid="test-report-score">{report.score}/{report.total}</span> technique marks
          </h2>
          <p className="mt-1 text-xs text-lab-muted">
            {report.score === report.total
              ? 'Full marks — every criterion met from your own work.'
              : 'Each miss below shows the correction an examiner would write in the margin.'}
          </p>
        </div>
        <ol className="flex-1 space-y-2 overflow-y-auto p-4">
          {report.items.map((item, i) => (
            <li
              key={i}
              data-testid="test-report-item"
              data-done={item.done ? '1' : '0'}
              className={`rounded-xl border p-2.5 text-xs leading-relaxed ${
                item.done ? 'border-lab-success/30 bg-lab-success/5' : 'border-lab-warning/40 bg-lab-warning/5'
              }`}
            >
              <p className={`flex items-start gap-1.5 ${item.done ? 'text-lab-muted' : 'text-lab-ink'}`}>
                <span className={`shrink-0 font-mono ${item.done ? 'text-lab-success' : 'text-lab-warning'}`}>
                  {item.done ? '✓' : '✗'}
                </span>
                {item.text}
              </p>
              {item.correction && (
                <p className="mt-1.5 border-l-2 border-lab-warning/50 pl-2 text-lab-warning">
                  {item.correction}
                </p>
              )}
            </li>
          ))}
        </ol>
        <div className="flex gap-2 border-t border-lab-border p-3">
          <button
            type="button"
            data-testid="test-report-close"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-lab-accent/50 bg-lab-accent/10 px-3 text-sm font-semibold text-lab-accent"
          >
            Keep testing
          </button>
          <button
            type="button"
            data-testid="test-report-exit"
            onClick={onExit}
            className="min-h-11 flex-1 rounded-xl border border-lab-border px-3 text-sm text-lab-muted"
          >
            Back to practice
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function TestModeHUD({ experiment }) {
  const testMode = useLabStore((s) => s.testMode)
  const testReport = useLabStore((s) => s.testReport)
  const setTestMode = useLabStore((s) => s.setTestMode)
  const setTestReport = useLabStore((s) => s.setTestReport)

  const handIn = () => {
    const report = markTestAttempt(experiment, useLabStore.getState())
    saveTestResult(report)
    setTestReport(report)
  }

  return (
    <>
      {/* Same HUD lane as the guide chip, one slot lower — mode controls
          live together and never collide with practical controls. */}
      <div className="absolute left-14 bottom-[calc(52%+0.5rem)] md:bottom-4 md:left-40 pointer-events-auto z-20">
        {testMode ? (
          <div className="flex items-center gap-1.5 rounded-lg border border-lab-warning/50 bg-lab-panel/90 p-1 backdrop-blur-sm">
            <span className="px-1.5 font-mono text-[10px] tracking-wider text-lab-warning">TEST</span>
            <button
              type="button"
              data-testid="test-hand-in"
              onClick={handIn}
              className="min-h-9 rounded-md border border-lab-warning/50 bg-lab-warning/10 px-2.5 text-[11px] font-semibold text-lab-warning"
            >
              Hand in
            </button>
            <button
              type="button"
              data-testid="test-mode-exit"
              onClick={() => setTestMode(false)}
              aria-label="Exit test mode"
              className="min-h-9 px-1.5 text-[11px] text-lab-muted hover:text-lab-ink"
            >
              Exit
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="test-mode-toggle"
            onClick={() => setTestMode(true)}
            title="Hide the guide, work solo, get marked with corrections at hand-in"
            className="rounded-lg border border-lab-border bg-lab-panel/90 px-2.5 py-1.5 text-[11px] text-lab-muted backdrop-blur-sm hover:text-lab-ink"
          >
            Test mode
          </button>
        )}
      </div>
      {testReport && (
        <ReportOverlay
          report={testReport}
          onClose={() => setTestReport(null)}
          onExit={() => setTestMode(false)}
        />
      )}
    </>
  )
}
