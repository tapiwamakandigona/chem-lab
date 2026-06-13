// Note: useState removed — previously used for touch/hold state (future feature)

import { useLabStore, TITRATION_PRESETS } from '../store.js'

function ReadingDisplay({ label, value, unit = 'cm³' }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-lab-muted uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lab-ink text-base">
        {value.toFixed(2)} <span className="text-lab-muted text-xs">{unit}</span>
      </span>
    </div>
  )
}

export default function TitrationUI({ onBack }) {
  const {
    titration, titrationDispense, titrationReset,
    titrationRecordTitre, setTitrationPreset
  } = useLabStore()

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

      {/* Left panel — readings + instructions */}
      <div className="absolute top-12 left-2 bottom-28 w-44 flex flex-col gap-2 pointer-events-auto overflow-y-auto">
        {/* Burette readings */}
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-3">
          <ReadingDisplay label="Initial reading" value={titration.initialReading} />
          <ReadingDisplay label="Current reading" value={titration.buretteReading} />
          <div className="border-t border-lab-border pt-2">
            <ReadingDisplay label="Titre" value={titre} />
          </div>
        </div>

        {/* Endpoint status */}
        {titration.endpointReached && (
          <div className="bg-lab-success/10 border border-lab-success/40 rounded-xl p-3">
            <p className="text-lab-success text-xs font-medium">✓ Endpoint reached</p>
            <p className="text-lab-muted text-[10px] mt-1">Titre: {titre.toFixed(2)} cm³</p>
            <button
              onClick={titrationRecordTitre}
              className="mt-2 w-full py-1.5 bg-lab-success/20 hover:bg-lab-success/30 border border-lab-success/40 text-lab-success text-xs rounded-lg"
            >
              Record & Refill
            </button>
          </div>
        )}

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

      {/* Right panel — reagent info */}
      <div className="absolute top-12 right-2 w-40 pointer-events-auto">
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
      </div>

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
