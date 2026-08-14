import { useLabStore } from '../store.js'
import { FLAME_UNKNOWNS, FLAME_IONS } from '../lib/flame.js'
import CheckResult, { CheckVerb } from './CheckResult.jsx'

const PROCEDURE = [
  {
    id: 'acid',
    label: '1 · Dip loop in dilute HCl',
  },
  {
    id: 'blank',
    label: '2 · Heat loop — check blank',
  },
  {
    id: 'load',
    label: '3 · Load unknown chloride',
  },
  {
    id: 'observe',
    label: '4 · Place loop in hottest flame',
  },
]

export default function FlameUI({ onBack }) {
  const {
    flame,
    flameSetUnknown,
    flameDipAcid,
    flameHeatBlank,
    flameRecordBlank,
    flameLoadSample,
    flameObserve,
    flameToggleCobalt,
    flameSetAnswer,
    flameSubmit,
    flameReset,
  } = useLabStore()

  const blankReady = flame.loop === 'clean' && !flame.blankClean
  const hasSampleObservation = flame.observations.some((o) => o.kind === 'sample')
  const latestSample = [...flame.observations].reverse().find((o) => o.kind === 'sample')

  const action = (id) => {
    if (id === 'acid') flameDipAcid()
    if (id === 'blank') {
      if (blankReady) flameRecordBlank()
      else flameHeatBlank()
    }
    if (id === 'load') flameLoadSample()
    if (id === 'observe') flameObserve()
  }

  const enabled = (id) => {
    if (id === 'acid') return flame.loop !== 'loaded'
    if (id === 'blank') return flame.loop === 'acid' || blankReady
    if (id === 'load') return (flame.loop === 'clean' && flame.blankClean) || flame.loop === 'dirty'
    if (id === 'observe') return flame.loop === 'loaded'
    return false
  }

  const done = (id) => {
    if (id === 'acid') return ['acid', 'clean'].includes(flame.loop) || (flame.loop === 'loaded' && flame.sampleClean)
    if (id === 'blank') return flame.blankClean
    if (id === 'load') return flame.loop === 'loaded'
    if (id === 'observe') return hasSampleObservation
    return false
  }

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
          qualitative enrichment
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div>
          <label className="text-xs text-lab-muted block mb-1">Unknown metal chloride</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FLAME_UNKNOWNS).map(([id, u]) => (
              <button
                key={id}
                data-testid={`flame-unknown-${id}`}
                onClick={() => flameSetUnknown(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  flame.unknown === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-lab-muted mt-1.5 leading-relaxed">
            Identify the metal ion from its flame colour. Clean the reusable nichrome
            loop first: contamination — especially sodium — can hide the true result.
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">Procedure</label>
          <div className="grid grid-cols-1 gap-1.5">
            {PROCEDURE.map((p) => (
              <button
                key={p.id}
                data-testid={`flame-${p.id}`}
                onClick={() => action(p.id)}
                disabled={!enabled(p.id)}
                className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  done(p.id)
                    ? 'border-emerald-700/50 text-emerald-300 bg-emerald-900/10'
                    : enabled(p.id)
                      ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5'
                      : 'border-lab-border text-lab-muted/40 cursor-not-allowed'
                }`}
              >
                {done(p.id) ? '✓ ' : ''}{p.label}
                {p.id === 'blank' && blankReady && (
                  <span className="text-lab-accent"> — no persistent colour; confirm</span>
                )}
              </button>
            ))}
          </div>

          <button
            data-testid="flame-cobalt"
            onClick={flameToggleCobalt}
            className={`mt-2 w-full px-3 py-1.5 rounded-lg border text-xs text-left ${
              flame.cobaltGlass
                ? 'border-indigo-400 text-indigo-200 bg-indigo-500/15'
                : 'border-lab-border text-lab-muted hover:text-lab-ink'
            }`}
          >
            {flame.cobaltGlass ? '✓ ' : ''}View through cobalt-blue glass
            <span className="block text-[10px] opacity-75 mt-0.5">
              absorbs intense sodium-yellow emission; useful when contamination masks a weaker colour
            </span>
          </button>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">Observation record</label>
          <div
            data-testid="flame-observations"
            className="rounded-lg border border-lab-border overflow-hidden text-[11px]"
          >
            {flame.observations.length === 0 ? (
              <div className="px-2 py-2 text-lab-muted/60">no observation yet — follow the procedure above</div>
            ) : (
              flame.observations.map((o, i) => (
                <div
                  key={`${o.kind}-${i}`}
                  data-testid="flame-obs-row"
                  className="flex gap-2 items-start px-2 py-1.5 border-t first:border-t-0 border-lab-border/60"
                >
                  <span
                    className="mt-0.5 w-3 h-3 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: o.kind === 'blank' ? '#bdd6e7' : o.color }}
                  />
                  <div>
                    <span className="text-lab-ink">{o.label}</span>
                    <span className="text-lab-muted"> — {o.note}</span>
                    {o.filtered && <span className="text-indigo-300"> · cobalt glass</span>}
                  </div>
                </div>
              ))
            )}
          </div>
          {latestSample?.masked && (
            <div className="mt-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-300">
              Masked result: clean and retest, or use cobalt glass to diagnose sodium contamination.
            </div>
          )}
        </div>

        <details className="text-[11px] text-lab-muted">
          <summary className="cursor-pointer hover:text-lab-ink">Reference — characteristic flame colours</summary>
          <div className="mt-1.5 rounded-lg border border-lab-border px-2 py-1.5 grid grid-cols-1 gap-y-0.5">
            {Object.entries(FLAME_IONS).map(([id, ion]) => (
              <span key={id}>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle border border-white/20"
                  style={{ backgroundColor: ion.color }}
                />
                {ion.ion} {ion.name}: {ion.flame}
              </span>
            ))}
          </div>
        </details>

        <div className="space-y-2">
          <label className="text-xs text-lab-muted block">
            Conclusion — metal ion in {FLAME_UNKNOWNS[flame.unknown].label}
          </label>
          <select
            data-testid="flame-answer"
            value={flame.answer}
            onChange={(e) => flameSetAnswer(e.target.value)}
            className="w-full bg-[#0c1624] border border-lab-border rounded-lg px-2 py-1.5 text-xs text-lab-ink"
          >
            <option value="">metal ion…</option>
            {Object.entries(FLAME_IONS).map(([id, ion]) => (
              <option key={id} value={id}>{ion.name}, {ion.ion}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              data-testid="flame-submit"
              onClick={flameSubmit}
              disabled={!flame.answer}
              className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckVerb practice="Check identification" />
            </button>
            <button
              data-testid="flame-reset"
              onClick={flameReset}
              className="px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Fresh test
            </button>
          </div>
          {flame.result && (
            <CheckResult testid="flame-result" ok={flame.result.ok} score={flame.result.total}>
              <div className="font-medium mb-0.5">{flame.result.total}/{flame.result.max} marks</div>
              {flame.result.ok ? (
                <div>
                  Correct — {flame.result.ionName}, {flame.result.ionSymbol}: {flame.result.flame}.
                </div>
              ) : flame.result.identityOk && !flame.result.evidence ? (
                <div>Right ion, but no clean-loop observation supports it. Acid-clean, confirm a colourless blank, then retest.</div>
              ) : (
                <div>Not consistent with the recorded flame. Check whether contamination masked the sample colour.</div>
              )}
            </CheckResult>
          )}
        </div>

        <p className="text-[10px] text-lab-muted/70 leading-relaxed">
          Safety: eye protection; tie back hair; use a non-luminous flame under teacher supervision.
          This enrichment practical is not presented as a table from the current 9701 Paper 3
          qualitative-analysis notes.
        </p>
      </div>
    </div>
  )
}
