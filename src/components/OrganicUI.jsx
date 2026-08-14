import { useLabStore } from '../store.js'
import { ORGANIC_TESTS, ORGANIC_UNKNOWNS, ORGANIC_CLASSES } from '../lib/organic.js'
import CheckResult, { CheckVerb } from './CheckResult.jsx'

const TEST_BY_ID = Object.fromEntries(ORGANIC_TESTS.map((t) => [t.id, t]))

export default function OrganicUI({ onBack }) {
  const { organic, organicSetUnknown, organicRunTest, organicSetAnswer, organicSubmit, organicReset } = useLabStore()
  const done = (id) => organic.tests.some((t) => t.test === id)

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701 P3 · Q4 style</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Unknown selector */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Unknown organic liquid</label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ORGANIC_UNKNOWNS).map(([id, u]) => (
              <button
                key={id}
                data-testid={`organic-unknown-${id}`}
                onClick={() => organicSetUnknown(id)}
                className={`px-2.5 py-1 rounded-lg border text-xs ${
                  organic.unknown === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-lab-muted mt-1.5">
            {ORGANIC_UNKNOWNS[organic.unknown].label} contains ONE functional group. Run the deduction tests, then conclude.
          </p>
        </div>

        {/* Tests */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Test a fresh portion</label>
          <div className="grid grid-cols-1 gap-1.5">
            {ORGANIC_TESTS.map((t) => (
              <button
                key={t.id}
                data-testid={`organic-test-${t.id}`}
                onClick={() => organicRunTest(t.id)}
                disabled={done(t.id)}
                className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  done(t.id)
                    ? 'border-lab-border text-lab-muted/60 bg-[#141f2e] cursor-default'
                    : 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5'
                }`}
              >
                {done(t.id) ? '✓ ' : ''}{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Observations table */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Your observations</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="organic-observations">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">test</th>
                  <th className="text-left px-2 py-1 font-medium">observation</th>
                </tr>
              </thead>
              <tbody>
                {organic.tests.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-lab-muted/60">no tests yet — run a test above</td></tr>
                )}
                {organic.tests.map((t) => (
                  <tr key={t.test} data-testid="organic-obs-row" className="border-t border-lab-border/60">
                    <td className="px-2 py-1 text-lab-muted align-top whitespace-nowrap">{TEST_BY_ID[t.test]?.label.split(' — ')[0]}</td>
                    <td className="px-2 py-1 text-lab-ink">{t.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conclusion */}
        <div className="space-y-2">
          <label className="text-xs text-lab-muted block">Conclusion — the functional group present</label>
          <select
            data-testid="organic-class"
            value={organic.answer}
            onChange={(e) => organicSetAnswer(e.target.value)}
            className="w-full bg-[#0c1624] border border-lab-border rounded-lg px-2 py-1.5 text-xs text-lab-ink"
          >
            <option value="">functional group…</option>
            {Object.entries(ORGANIC_CLASSES).map(([id, c]) => (
              <option key={id} value={id}>{c.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              data-testid="organic-submit"
              onClick={organicSubmit}
              disabled={!organic.answer}
              className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckVerb practice="Check conclusion" />
            </button>
            <button
              data-testid="organic-reset"
              onClick={organicReset}
              className="px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Fresh sample
            </button>
          </div>
          {organic.result && (
            <CheckResult testid="organic-result" ok={organic.result.ok} score={organic.result.total}>
              <div className="font-medium mb-0.5">{organic.result.total}/{organic.result.max} marks</div>
              {organic.result.ok ? (
                <div>Correct — {ORGANIC_UNKNOWNS[organic.unknown].label} is {organic.result.compound} ({organic.result.className}).</div>
              ) : organic.result.clsOk && !organic.result.evidence ? (
                <div>Right group, but the deciding tests were not performed — run the key tests to earn the deduction mark.</div>
              ) : (
                <div>Not consistent with your observations — compare the test results again.</div>
              )}
            </CheckResult>
          )}
        </div>
      </div>
    </div>
  )
}
