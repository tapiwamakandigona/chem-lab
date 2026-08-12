import { useLabStore } from '../store.js'
import { CHROMA_UNKNOWNS, DYES, FRONT_CM, chromaReadings } from '../lib/chroma.js'

export default function ChromaUI({ onBack }) {
  const { chroma, chromaSetUnknown, chromaStart, chromaToggleDye, chromaSetRf, chromaSubmit, chromaReset } = useLabStore()
  const complete = chroma.phase === 'complete'
  const readings = complete ? chromaReadings(chroma.unknown) : []

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701 AS technique</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Unknown selector */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Unknown food colouring</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(CHROMA_UNKNOWNS).map(([id, u]) => (
              <button
                key={id}
                data-testid={`chroma-unknown-${id}`}
                onClick={() => chromaSetUnknown(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  chroma.unknown === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-lab-muted mt-1.5">
            {CHROMA_UNKNOWNS[chroma.unknown].label} was spotted on the baseline. Develop the
            chromatogram, measure each spot and the solvent front, then match Rf values to
            the reference table.
          </p>
        </div>

        {/* Run */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Development</label>
          {chroma.phase === 'setup' && (
            <button
              data-testid="chroma-start"
              onClick={chromaStart}
              className="w-full px-3 py-2 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium"
            >
              ▶ Lower paper into solvent
            </button>
          )}
          {chroma.phase === 'developing' && (
            <div className="rounded-lg border border-lab-border px-3 py-2">
              <div className="text-xs text-lab-ink mb-1.5">Solvent rising… keep the lid on</div>
              <div className="h-1.5 rounded bg-[#0c1624] overflow-hidden">
                <div
                  className="h-full bg-lab-accent transition-all"
                  style={{ width: `${Math.round(chroma.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
          {complete && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
              Front reached {FRONT_CM.toFixed(1)} cm — paper dried, ready to measure.
            </div>
          )}
        </div>

        {/* Readings */}
        {complete && (
          <div>
            <label className="text-xs text-lab-muted block mb-1">Measurements (from baseline)</label>
            <div className="rounded-lg border border-lab-border overflow-hidden">
              <table className="w-full text-[11px]" data-testid="chroma-readings">
                <thead>
                  <tr className="bg-[#0c1e35] text-lab-muted">
                    <th className="text-left px-2 py-1 font-medium">mark</th>
                    <th className="text-left px-2 py-1 font-medium">distance</th>
                    <th className="text-left px-2 py-1 font-medium">Rf = d / {FRONT_CM.toFixed(1)}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-lab-border/60">
                    <td className="px-2 py-1 text-lab-muted">solvent front</td>
                    <td className="px-2 py-1 text-lab-ink">{FRONT_CM.toFixed(1)} cm</td>
                    <td className="px-2 py-1 text-lab-muted">—</td>
                  </tr>
                  {readings.map((r, i) => (
                    <tr key={r.dye} data-testid="chroma-reading-row" className="border-t border-lab-border/60">
                      <td className="px-2 py-1 text-lab-muted whitespace-nowrap">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                          style={{ background: r.color }}
                        />
                        spot {i + 1}
                      </td>
                      <td className="px-2 py-1 text-lab-ink" data-testid={`chroma-dist-${i}`}>{r.dist.toFixed(1)} cm</td>
                      <td className="px-2 py-1">
                        <input
                          data-testid={`chroma-rf-${i}`}
                          value={chroma.rfEntries[i] ?? ''}
                          onChange={(e) => chromaSetRf(i, e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="w-16 bg-[#0c1624] border border-lab-border rounded px-1.5 py-0.5 text-xs text-lab-ink"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reference table */}
        <details className="text-[11px] text-lab-muted" open={complete}>
          <summary className="cursor-pointer hover:text-lab-ink">Reference — dye Rf values in this solvent</summary>
          <div className="mt-1.5 rounded-lg border border-lab-border px-2 py-1.5 grid grid-cols-1 gap-y-0.5">
            {Object.entries(DYES).map(([id, d]) => (
              <span key={id}>
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ background: d.color }} />
                {id} {d.name}: Rf {d.rf.toFixed(2)}
              </span>
            ))}
          </div>
        </details>

        {/* Conclusion */}
        <div className="space-y-2">
          <label className="text-xs text-lab-muted block">Dyes present in {CHROMA_UNKNOWNS[chroma.unknown].label}</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(DYES).map(([id, d]) => (
              <button
                key={id}
                data-testid={`chroma-dye-${id}`}
                onClick={() => chromaToggleDye(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  chroma.answer.includes(id)
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {chroma.answer.includes(id) ? '✓ ' : ''}{d.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="chroma-submit"
              onClick={chromaSubmit}
              disabled={chroma.answer.length === 0}
              className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check identification
            </button>
            <button
              data-testid="chroma-reset"
              onClick={chromaReset}
              className="px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              New paper
            </button>
          </div>
          {chroma.result && (
            <div
              data-testid="chroma-result"
              data-score={chroma.result.total}
              data-ok={chroma.result.ok ? '1' : '0'}
              className={`rounded-lg border px-3 py-2 text-xs ${
                chroma.result.ok
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              }`}
            >
              <div className="font-medium mb-0.5">{chroma.result.total}/{chroma.result.max} marks</div>
              {chroma.result.ok ? (
                <div>Correct — {CHROMA_UNKNOWNS[chroma.unknown].label} contains {chroma.result.dyeNames}.</div>
              ) : !chroma.result.developed ? (
                <div>Develop the chromatogram first — identification needs measured Rf evidence.</div>
              ) : chroma.result.dyesOk && !chroma.result.rfOk ? (
                <div>Right dyes, but enter an Rf for every spot (distance ÷ solvent front, within ±0.05).</div>
              ) : (
                <div>Not consistent with the chromatogram — recompute each Rf and match against the reference table.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
