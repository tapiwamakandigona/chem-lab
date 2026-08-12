import { useState } from 'react'
import { createPortal } from 'react-dom'
import { markPaper } from '../lib/marking.js'
import { useLabStore } from '../store.js'

// Exam-style mock paper overlay. Generic over a paper spec + ctx built from
// the student's OWN results (like real Paper 3 — you analyse what you got).

export default function MockPaper({ paper, ctx, onClose }) {
  const [answers, setAnswers] = useState({})
  const [marked, setMarked] = useState(null)
  const recordMockResult = useLabStore((s) => s.recordMockResult)

  const submit = () => {
    const m = markPaper(paper.parts, ctx, answers)
    setMarked(m)
    recordMockResult(paper.id, m.score, m.total)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 pointer-events-auto" onClick={onClose}>
      <div
        data-testid="mock-paper"
        className="bg-lab-panel border border-lab-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lab-ink font-semibold text-base">{paper.title}</h2>
          <button
            onClick={onClose}
            data-testid="mock-close"
            className="text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-[11px] text-lab-muted leading-relaxed mb-4">{paper.intro}</p>

        <div className="space-y-4">
          {paper.parts.map((part) => {
            const r = marked?.results[part.id]
            return (
              <div key={part.id}>
                <p className="text-xs text-lab-ink leading-relaxed mb-1.5">
                  {part.prompt}
                  <span className="text-lab-muted"> [{part.marks}]</span>
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={answers[part.id] ?? ''}
                    onChange={(e) => {
                      setAnswers((a) => ({ ...a, [part.id]: e.target.value }))
                      setMarked(null)
                    }}
                    data-testid={`mock-input-${part.id}`}
                    className="w-full min-w-0 bg-lab-bg border border-lab-border rounded-lg px-2 py-1.5 font-mono text-sm text-lab-ink focus:border-lab-accent focus:outline-none"
                  />
                  <span className="text-[10px] text-lab-muted font-mono shrink-0">{part.unit}</span>
                  {r && (
                    <span
                      data-testid={`mock-mark-${part.id}`}
                      data-ok={r.ok ? '1' : '0'}
                      className={`shrink-0 font-mono text-sm ${r.ok ? 'text-lab-success' : 'text-lab-warning'}`}
                    >
                      {r.ok ? (r.why === 'ecf' ? '✓ecf' : '✓') : '✗'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={submit}
            data-testid="mock-submit"
            className="px-4 py-2 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-sm font-medium"
          >
            Mark my paper
          </button>
          {marked && (
            <p data-testid="mock-score" className="font-mono text-sm text-lab-ink">
              {marked.score}/{marked.total}
            </p>
          )}
        </div>
        {marked && marked.score === marked.total && (
          <p className="mt-2 text-[11px] text-lab-success">Full marks — exam ready.</p>
        )}
        {marked && marked.score < marked.total && (
          <p className="mt-2 text-[11px] text-lab-muted leading-relaxed">
            ✗ parts: check your working. ECF applies — if an early part is wrong
            but you carried it through correctly, later parts still score.
          </p>
        )}
      </div>
    </div>,
    document.body
  )
}
