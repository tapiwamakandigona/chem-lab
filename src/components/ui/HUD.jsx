import { useLabStore } from '../../store/labStore'

export function TopBar() {
  const { quality, setQuality, toggleHelp } = useLabStore()

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3
                    bg-gradient-to-b from-lab-bg/90 to-transparent pointer-events-none">
      <div className="pointer-events-auto">
        <div className="text-lab-accent font-mono text-sm font-medium">ChemLab ZW</div>
        <div className="text-lab-muted text-xs">AS/A Level Chemistry — 9701</div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Quality toggle */}
        <div className="flex rounded-md border border-lab-border overflow-hidden">
          {['low', 'medium', 'high'].map(q => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              className={`px-2 py-1 text-xs font-mono transition-colors
                ${quality === q ? 'bg-lab-accent text-lab-bg font-bold' : 'bg-lab-panel text-lab-muted hover:text-lab-text'}`}
            >
              {q[0].toUpperCase()}
            </button>
          ))}
        </div>
        <button className="btn-action text-xs" onClick={toggleHelp}>?</button>
      </div>
    </div>
  )
}

export function Toast() {
  const { toast } = useLabStore()
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

export function HelpOverlay() {
  const { showHelp, toggleHelp } = useLabStore()
  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={toggleHelp}>
      <div className="bg-lab-panel border border-lab-border rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h2 className="text-lab-text font-semibold mb-4">How to use</h2>
        <ul className="text-sm text-lab-muted space-y-2 list-disc list-inside">
          <li>Select a past paper preset from the panel</li>
          <li>Follow steps 1–5 in order</li>
          <li>Hold <span className="text-lab-accent font-mono">Open stopcock</span> to titrate slowly</li>
          <li>Watch the flask color change at endpoint</li>
          <li>Record multiple readings for concordant titres</li>
          <li>Pinch/drag on mobile to rotate the view</li>
          <li>Use Q (low/med/high) toggle for slower devices</li>
        </ul>
        <button className="btn-action primary w-full mt-4" onClick={toggleHelp}>Got it</button>
      </div>
    </div>
  )
}
