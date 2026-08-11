import { useLabStore } from '../store.js'
import { getGuideSteps } from '../lib/guides.js'

// Guided-mode coach — ONE shared instance rendered by App for the active
// experiment. Collapsible pill (bottom-left, above the mobile controls);
// open/closed state lives in the store so responsive re-renders share it.

export default function GuideCoach({ experiment }) {
  const state = useLabStore()
  const { guideOpen, setGuideOpen } = state
  const steps = getGuideSteps(experiment, state)
  if (steps.length === 0) return null

  const doneCount = steps.filter((s) => s.done).length
  const activeIdx = steps.findIndex((s) => !s.done)

  return (
    <div className="absolute left-2 bottom-24 md:bottom-4 md:left-48 pointer-events-auto z-20 max-w-[260px]">
      {guideOpen ? (
        <div
          data-testid="guide-panel"
          className="bg-lab-panel/95 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-lab-muted uppercase tracking-wider">
              Guide · {doneCount}/{steps.length}
            </p>
            <button
              onClick={() => setGuideOpen(false)}
              data-testid="guide-toggle"
              className="text-[10px] text-lab-muted hover:text-lab-ink px-1"
            >
              Hide
            </button>
          </div>
          <ol className="space-y-1">
            {steps.map((s, i) => (
              <li
                key={i}
                data-testid="guide-step"
                data-done={s.done ? '1' : '0'}
                data-active={i === activeIdx ? '1' : '0'}
                className={`flex items-start gap-1.5 text-[11px] leading-snug ${
                  s.done
                    ? 'text-lab-muted line-through decoration-lab-muted/50'
                    : i === activeIdx
                      ? 'text-lab-ink'
                      : 'text-lab-muted'
                }`}
              >
                <span
                  className={`shrink-0 mt-[1px] font-mono ${
                    s.done ? 'text-lab-success' : i === activeIdx ? 'text-lab-accent' : 'text-lab-muted'
                  }`}
                >
                  {s.done ? '✓' : i === activeIdx ? '▸' : '○'}
                </span>
                {s.text}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <button
          onClick={() => setGuideOpen(true)}
          data-testid="guide-toggle"
          className="px-2.5 py-1.5 rounded-lg border border-lab-border bg-lab-panel/90 backdrop-blur-sm text-[11px] text-lab-muted hover:text-lab-ink"
        >
          Guide {doneCount}/{steps.length}
        </button>
      )}
    </div>
  )
}
