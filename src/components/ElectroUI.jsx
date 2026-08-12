import { useLabStore } from '../store.js'
import { ELECTRO_UNKNOWNS, ELECTRODES, REFERENCES } from '../lib/electro.js'

export default function ElectroUI({ onBack }) {
  const { electro, electroSetUnknown, electroMeasure, electroSetAnswer, electroSubmit, electroReset } = useLabStore()
  const measured = (ref) => electro.measurements.some((m) => m.ref === ref)

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701 A2 practical</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Unknown selector */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Unknown metal electrode</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ELECTRO_UNKNOWNS).map(([id, u]) => (
              <button
                key={id}
                data-testid={`electro-unknown-${id}`}
                onClick={() => electroSetUnknown(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  electro.unknown === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-lab-muted mt-1.5">
            {ELECTRO_UNKNOWNS[electro.unknown].label} is a metal strip in a 1.00 mol/dm³ solution of its own ions. Measure E cell against both references, then use the Data Booklet E° values to identify it.
          </p>
        </div>

        {/* Measure */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Connect the cell</label>
          <div className="grid grid-cols-1 gap-1.5">
            {REFERENCES.map((ref) => (
              <button
                key={ref}
                data-testid={`electro-measure-${ref}`}
                onClick={() => electroMeasure(ref)}
                disabled={measured(ref)}
                className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  measured(ref)
                    ? 'border-lab-border text-lab-muted/60 bg-[#141f2e] cursor-default'
                    : 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5'
                }`}
              >
                {measured(ref) ? '✓ ' : ''}Measure vs {ref}²⁺/{ref} (E° {ELECTRODES[ref].e0 >= 0 ? '+' : ''}{ELECTRODES[ref].e0.toFixed(2)} V)
              </button>
            ))}
          </div>
        </div>

        {/* Readings */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Your measurements</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="electro-readings">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">cell</th>
                  <th className="text-left px-2 py-1 font-medium">reading</th>
                </tr>
              </thead>
              <tbody>
                {electro.measurements.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-lab-muted/60">no measurements yet — connect a reference</td></tr>
                )}
                {electro.measurements.map((m) => (
                  <tr key={m.ref} data-testid="electro-reading-row" className="border-t border-lab-border/60">
                    <td className="px-2 py-1 text-lab-muted whitespace-nowrap">vs {m.ref}²⁺/{m.ref}</td>
                    <td className="px-2 py-1 text-lab-ink">{m.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* E0 reference table */}
        <details className="text-[11px] text-lab-muted">
          <summary className="cursor-pointer hover:text-lab-ink">Data Booklet — standard electrode potentials</summary>
          <div className="mt-1.5 rounded-lg border border-lab-border px-2 py-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(ELECTRODES).map(([sym, e]) => (
              <span key={sym}>{sym}²⁺/{sym}{sym === 'Ag' ? ' (Ag⁺/Ag)' : ''}: {e.e0 >= 0 ? '+' : ''}{e.e0.toFixed(2)} V</span>
            ))}
          </div>
        </details>

        {/* Conclusion */}
        <div className="space-y-2">
          <label className="text-xs text-lab-muted block">Identify the metal</label>
          <select
            data-testid="electro-answer"
            value={electro.answer}
            onChange={(e) => electroSetAnswer(e.target.value)}
            className="w-full bg-[#0c1624] border border-lab-border rounded-lg px-2 py-1.5 text-xs text-lab-ink"
          >
            <option value="">metal…</option>
            {Object.entries(ELECTRODES).filter(([sym]) => !REFERENCES.includes(sym)).map(([sym, e]) => (
              <option key={sym} value={sym}>{e.name} ({sym})</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              data-testid="electro-submit"
              onClick={electroSubmit}
              disabled={!electro.answer}
              className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check identification
            </button>
            <button
              data-testid="electro-reset"
              onClick={electroReset}
              className="px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Rewire
            </button>
          </div>
          {electro.result && (
            <div
              data-testid="electro-result"
              data-score={electro.result.total}
              data-ok={electro.result.ok ? '1' : '0'}
              className={`rounded-lg border px-3 py-2 text-xs ${
                electro.result.ok
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              }`}
            >
              <div className="font-medium mb-0.5">{electro.result.total}/{electro.result.max} marks</div>
              {electro.result.ok ? (
                <div>Correct — {ELECTRO_UNKNOWNS[electro.unknown].label} is {electro.result.metalName}.</div>
              ) : electro.result.metalOk && !electro.result.evidence ? (
                <div>Right metal, but measure against BOTH references — one reading can match two metals.</div>
              ) : (
                <div>Not consistent with your readings — check magnitude AND polarity against the E° values.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
