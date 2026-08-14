import { useLabStore } from '../store.js'

// Shared verdict display for every practical's answer/technique check.
//
// Practice mode: renders the full examiner verdict (✓/✗, marks, guidance) —
// instant feedback is the point of practice.
//
// Test mode: the verdict is WITHHELD. The answer is still computed and stored
// (hand-in marking reads the same result state), but the learner only sees a
// neutral "recorded" note — otherwise the Check button is an answer oracle
// and the test marks nothing real. This is the single rule for all
// practicals; never re-add a per-practical verdict that bypasses it.
export default function CheckResult({ testid, ok, score, children }) {
  const testMode = useLabStore((s) => s.testMode)
  if (testMode) {
    return (
      <div
        data-testid={testid}
        data-ok="rec"
        className="mt-1.5 rounded-lg border border-lab-border bg-lab-bg/60 px-3 py-2 text-[11px] text-lab-muted"
      >
        Recorded — this will be marked when you hand in.
      </div>
    )
  }
  return (
    <div
      data-testid={testid}
      data-ok={ok ? '1' : '0'}
      data-score={score}
      className={`mt-1.5 rounded-lg border px-3 py-2 text-xs ${
        ok
          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
          : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
      }`}
    >
      {children}
    </div>
  )
}
