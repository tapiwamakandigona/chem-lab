import { useLabStore } from '../store.js'
import { REAGENTS, QUAL_UNKNOWNS, CATIONS, ANIONS } from '../lib/qual.js'
import CheckResult from './CheckResult.jsx'

const REAGENT_BY_ID = Object.fromEntries(REAGENTS.map((r) => [r.id, r]))

export default function QualUI({ onBack }) {
  const { qual, qualSetUnknown, qualRunTest, qualSetAnswer, qualSubmit, qualReset } = useLabStore()
  const done = (id) => qual.tests.some((t) => t.reagent === id)
  const locked = (id) =>
    (id === 'naoh_excess' && !done('naoh_drop')) ||
    (id === 'nh3_excess' && !done('nh3_drop'))

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701 P3 · Q3 style</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Unknown selector */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Unknown solution</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(QUAL_UNKNOWNS).map(([id, u]) => (
              <button
                key={id}
                data-testid={`qual-unknown-${id}`}
                onClick={() => qualSetUnknown(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  qual.unknown === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-lab-muted mt-1.5">
            {QUAL_UNKNOWNS[qual.unknown].label} contains ONE cation and ONE anion. Test, record, identify.
          </p>
        </div>

        {/* Reagent tests */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Add reagent to a fresh portion</label>
          <div className="grid grid-cols-1 gap-1.5">
            {REAGENTS.map((r) => (
              <button
                key={r.id}
                data-testid={`qual-test-${r.id}`}
                onClick={() => qualRunTest(r.id)}
                disabled={done(r.id) || locked(r.id)}
                className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  done(r.id)
                    ? 'border-lab-border text-lab-muted/60 bg-[#141f2e] cursor-default'
                    : locked(r.id)
                      ? 'border-lab-border text-lab-muted/40 cursor-not-allowed'
                      : 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5'
                }`}
              >
                {done(r.id) ? '✓ ' : ''}{r.label}
                {locked(r.id) && <span className="text-[10px] text-lab-muted/60"> — add dropwise first</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Observations table — the real P3 recording skill */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Your observations</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="qual-observations">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">test</th>
                  <th className="text-left px-2 py-1 font-medium">observation</th>
                </tr>
              </thead>
              <tbody>
                {qual.tests.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-lab-muted/60">no tests yet — add a reagent above</td></tr>
                )}
                {qual.tests.map((t) => (
                  <tr key={t.reagent} data-testid="qual-obs-row" className="border-t border-lab-border/60">
                    <td className="px-2 py-1 text-lab-muted align-top whitespace-nowrap">{REAGENT_BY_ID[t.reagent]?.label.split(' — ')[0]}{REAGENT_BY_ID[t.reagent]?.label.includes('—') ? ` (${REAGENT_BY_ID[t.reagent].label.split(' — ')[1]})` : ''}</td>
                    <td className="px-2 py-1 text-lab-ink">{t.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Identification */}
        <div className="space-y-2">
          <label className="text-xs text-lab-muted block">Identify the ions</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              data-testid="qual-cation"
              value={qual.answer.cation}
              onChange={(e) => qualSetAnswer('cation', e.target.value)}
              className="bg-[#0c1624] border border-lab-border rounded-lg px-2 py-1.5 text-xs text-lab-ink"
            >
              <option value="">cation…</option>
              {Object.entries(CATIONS).map(([id, c]) => (
                <option key={id} value={id}>{c.name}</option>
              ))}
            </select>
            <select
              data-testid="qual-anion"
              value={qual.answer.anion}
              onChange={(e) => qualSetAnswer('anion', e.target.value)}
              className="bg-[#0c1624] border border-lab-border rounded-lg px-2 py-1.5 text-xs text-lab-ink"
            >
              <option value="">anion…</option>
              {Object.entries(ANIONS).map(([id, a]) => (
                <option key={id} value={id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="qual-submit"
              onClick={qualSubmit}
              disabled={!qual.answer.cation || !qual.answer.anion}
              className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Check identification
            </button>
            <button
              data-testid="qual-reset"
              onClick={qualReset}
              className="px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Fresh sample
            </button>
          </div>
          {qual.result && (
            <CheckResult
              testid="qual-result"
              ok={qual.result.total === qual.result.max}
              score={qual.result.total}
            >
              <div className="font-medium mb-0.5">{qual.result.total}/{qual.result.max} marks</div>
              <div>
                cation: {qual.result.cation.ok ? '✓' : '✗'}
                {qual.result.cation.ok && !qual.result.cation.evidence && ' (no supporting test — no mark)'}
                {' · '}
                anion: {qual.result.anion.ok ? '✓' : '✗'}
                {qual.result.anion.ok && !qual.result.anion.evidence && ' (no supporting test — no mark)'}
              </div>
              {qual.result.total === qual.result.max && (
                <div className="mt-0.5 text-emerald-200/90">Correct — {QUAL_UNKNOWNS[qual.unknown].label} is {qual.result.formula}.</div>
              )}
            </CheckResult>
          )}
        </div>
      </div>
    </div>
  )
}
