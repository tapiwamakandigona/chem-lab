import { useState } from 'react'
import { useLabStore, TITRATION_PRESETS } from '../store.js'
import MeniscusPractice from './MeniscusPractice.jsx'
import BuretteScale from './BuretteScale.jsx'
import MockPaper from './MockPaper.jsx'
import { TITRATION_PAPER_S22, titrationPaperCtx } from '../lib/marking.js'

function ReadingDisplay({ label, value, unit = 'cm³', masked = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-lab-muted uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lab-ink text-base">
        {masked ? '?.??' : value.toFixed(2)} <span className="text-lab-muted text-xs">{unit}</span>
      </span>
    </div>
  )
}

export default function TitrationUI({ onBack }) {
  const {
    titration, titrationDispense, titrationReset,
    setTitrationPreset,
    titrationReadInput, titrationReadCheckSubmit, titrationReadReveal,
  } = useLabStore()
  const dripping = useLabStore((s) => s.dripping)

  // At the endpoint the numeric reading is hidden — the student must read
  // the burette scale themselves before the titre can be recorded.
  const mustRead = titration.endpointReached

  const [showPractice, setShowPractice] = useState(false)
  const [showPaper, setShowPaper] = useState(false)
  const preset = TITRATION_PRESETS[titration.preset]
  const titre = Math.round((titration.buretteReading - titration.initialReading) * 20) / 20

  const dispense = (amount) => {
    if (titration.endpointReached) return
    titrationDispense(amount)
  }

  // Concordant titres (within 0.10 cm3 of each other)
  const concordant = (() => {
    const vals = titration.titreValues
    if (vals.length < 2) return null
    for (let i = 0; i < vals.length - 1; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        if (Math.abs(vals[i] - vals[j]) <= 0.10) return [vals[i], vals[j]]
      }
    }
    return null
  })()

  const meanTitre = concordant
    ? ((concordant[0] + concordant[1]) / 2).toFixed(2)
    : null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <span data-testid="tip-drip" data-active={dripping ? '1' : '0'} className="hidden" />
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-lab-bg/80 backdrop-blur-sm border-b border-lab-border pointer-events-auto">
        <button
          onClick={onBack}
          className="text-lab-muted hover:text-lab-ink text-sm px-2 py-1 rounded"
        >
          ← Menu
        </button>
        <span className="text-lab-ink text-xs font-medium truncate mx-2">{preset.label}</span>
        <select
          value={titration.preset}
          onChange={(e) => setTitrationPreset(e.target.value)}
          className="text-xs bg-lab-panel border border-lab-border text-lab-ink rounded px-1.5 py-1"
        >
          {Object.entries(TITRATION_PRESETS).map(([k]) => (
            <option key={k} value={k}>{k.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Mobile strip — readings inline, scene stays visible */}
      <div className="md:hidden absolute top-12 left-2 right-2 pointer-events-auto">
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <ReadingDisplay label="Initial" value={titration.initialReading} />
          <ReadingDisplay label="Current" value={titration.buretteReading} masked={mustRead} />
          <ReadingDisplay label="Titre" value={titre} masked={mustRead} />
        </div>
        {concordant && (
          <div className="mt-1 flex items-center justify-end gap-2 pr-1">
            <p className="text-[11px] text-lab-accent font-mono">mean {meanTitre} cm³</p>
            {titration.preset === 's22' && (
              <button
                onClick={() => setShowPaper(true)}
                data-testid="mock-open-mobile"
                className="px-2 py-1 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 text-[11px]"
              >
                📝 Mock paper
              </button>
            )}
          </div>
        )}
        <div className="mt-1 flex justify-end">
          <button
            onClick={() => setShowPractice((s) => !s)}
            data-testid="meniscus-toggle-mobile"
            className="px-2.5 py-1 rounded-lg border border-lab-border bg-lab-panel/90 backdrop-blur-sm text-[11px] text-lab-muted active:text-lab-ink"
          >
            {showPractice ? 'Hide practice' : 'Meniscus practice'}
          </button>
        </div>
      </div>

      {/* Left panel — readings + instructions (desktop) */}
      <div className="hidden md:flex absolute top-12 left-2 bottom-28 w-44 flex-col gap-2 pointer-events-auto overflow-y-auto">
        {/* Burette readings */}
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-3">
          <ReadingDisplay label="Initial reading" value={titration.initialReading} />
          <ReadingDisplay label="Current reading" value={titration.buretteReading} masked={mustRead} />
          <div className="border-t border-lab-border pt-2">
            <ReadingDisplay label="Titre" value={titre} masked={mustRead} />
          </div>
        </div>


        {/* Past titres */}
        {titration.titreValues.length > 0 && (
          <div className="bg-lab-panel/90 border border-lab-border rounded-xl p-3">
            <p className="text-[10px] text-lab-muted uppercase tracking-wider mb-2">Titres (cm³)</p>
            {titration.titreValues.map((v, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-lab-muted">Run {i + 1}</span>
                <span className={`font-mono ${concordant?.includes(v) ? 'text-lab-success' : 'text-lab-ink'}`}>
                  {v.toFixed(2)}
                </span>
              </div>
            ))}
            {concordant && (
              <div className="mt-2 pt-2 border-t border-lab-border">
                <p className="text-[10px] text-lab-muted">Concordant mean</p>
                <p className="font-mono text-lab-accent text-sm">{meanTitre} cm³</p>
                {titration.preset === 's22' && (
                <button
                  onClick={() => setShowPaper(true)}
                  data-testid="mock-open"
                  className="mt-2 w-full py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs"
                >
                  📝 Mock paper
                </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-lab-panel/90 border border-lab-border rounded-xl p-3">
          <p className="text-[10px] text-lab-muted uppercase tracking-wider mb-2">Procedure</p>
          <ol className="space-y-1.5">
            {preset.instructions.map((step, i) => (
              <li key={i} className="text-[10px] text-lab-muted leading-relaxed">
                <span className="text-lab-accent">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Right panel — reagent info (desktop) */}
      <div className="hidden md:flex absolute top-12 right-2 bottom-28 w-40 flex-col gap-2 pointer-events-auto overflow-y-auto">
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-lab-muted uppercase tracking-wider">Reagents</p>
          <div>
            <p className="text-[10px] text-lab-muted">Flask (25.00 cm³)</p>
            <p className="text-[10px] text-lab-ink leading-snug">{preset.acidLabel}</p>
          </div>
          <div>
            <p className="text-[10px] text-lab-muted">Burette</p>
            <p className="text-[10px] text-lab-ink leading-snug">{preset.alkaliLabel}</p>
          </div>
          <div>
            <p className="text-[10px] text-lab-muted">Indicator</p>
            <p className="text-[10px] text-lab-ink">{preset.indicator}</p>
            <p className="text-[10px] text-lab-muted mt-0.5">{preset.endpointColor}</p>
          </div>
        </div>

        <button
          onClick={() => setShowPractice((s) => !s)}
          data-testid="meniscus-toggle"
          className="w-full py-1.5 rounded-xl border border-lab-border bg-lab-panel/90 backdrop-blur-sm text-[11px] text-lab-muted hover:text-lab-ink shrink-0"
        >
          {showPractice ? 'Hide meniscus practice' : 'Practise reading the meniscus'}
        </button>
      </div>

      {/* Endpoint — read the burette yourself (ONE shared instance).
          Numeric reading is masked; the student reads this zoomed scale and
          types the final reading to the nearest 0.05 before recording. */}
      {mustRead && (
        <div
          data-testid="endpoint-read-card"
          className="absolute pointer-events-auto left-1/2 -translate-x-1/2 top-[7.5rem] md:top-16 w-[220px] bg-lab-panel/95 backdrop-blur-sm border border-lab-success/40 rounded-xl p-3 space-y-2 max-h-[70%] overflow-y-auto"
        >
          <p className="text-lab-success text-xs font-medium">✓ Endpoint reached</p>
          <p className="text-[10px] text-lab-muted leading-snug">
            Read the burette: bottom of the meniscus, to the nearest 0.05 cm³.
          </p>
          <BuretteScale value={titration.buretteReading} testid="endpoint-scale" />
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={titration.readCheck.entered}
              onChange={(e) => titrationReadInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && titrationReadCheckSubmit()}
              placeholder="0.00"
              data-testid="burette-read-input"
              className="w-full min-w-0 bg-lab-bg border border-lab-border rounded-lg px-2 py-1.5 font-mono text-sm text-lab-ink placeholder:text-lab-muted/50 focus:border-lab-accent focus:outline-none"
            />
            <button
              onClick={titrationReadCheckSubmit}
              data-testid="burette-read-check"
              className="px-2.5 py-1.5 rounded-lg border border-lab-success/50 text-lab-success bg-lab-success/10 hover:bg-lab-success/20 text-xs font-mono shrink-0"
            >
              Record
            </button>
          </div>
          {titration.readCheck.status === 'wrong' && (
            <p data-testid="burette-read-feedback" className="text-[11px] leading-snug text-lab-warning">
              ✗ Not quite — read the bottom of the meniscus, to the nearest 0.05 cm³. The scale increases downwards.
            </p>
          )}
          {titration.readCheck.attempts >= 3 && (
            <button
              onClick={titrationReadReveal}
              data-testid="burette-read-reveal"
              className="w-full py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Show me the reading
            </button>
          )}
        </div>
      )}

      {/* Mock paper overlay — uses the student's OWN concordant results */}
      {showPaper && concordant && titration.preset === 's22' && (
        <MockPaper
          paper={TITRATION_PAPER_S22}
          ctx={titrationPaperCtx(titration.titreValues)}
          onClose={() => setShowPaper(false)}
        />
      )}

      {/* Meniscus practice — one shared instance (mobile + desktop toggles) */}
      {showPractice && (
        <div className="absolute pointer-events-auto right-2 top-[7.5rem] w-[240px] md:top-auto md:bottom-28 md:w-40 max-h-[70%] overflow-y-auto">
          <MeniscusPractice />
        </div>
      )}

      {/* Bottom — dispense controls */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 pointer-events-auto px-4">
        <div className="flex items-center gap-2">
          {[
            { label: '5 cm³', val: 5 },
            { label: '1 cm³', val: 1 },
            { label: '0.10', val: 0.10 },
            { label: '0.05', val: 0.05 },
          ].map(({ label, val }) => (
            <button
              key={val}
              onPointerDown={() => dispense(val)}
              disabled={titration.endpointReached || titration.buretteReading >= 50}
              className={`px-3 py-2 rounded-lg border text-sm font-mono transition-all active:scale-95
                ${titration.endpointReached
                  ? 'border-lab-border text-lab-muted cursor-not-allowed opacity-40'
                  : 'border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={titrationReset}
          className="text-xs text-lab-muted hover:text-lab-warning px-3 py-1"
        >
          Reset burette
        </button>
      </div>
    </div>
  )
}
