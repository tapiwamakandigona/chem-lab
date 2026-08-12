import { useEffect } from 'react'
import { useLabStore } from '../store.js'
import { GRAV, HEAT_MS, COOL_MS, isConstantMass } from '../lib/grav.js'

export default function GravUI({ onBack }) {
  const {
    grav, gravWeigh, gravAddSample, gravStartHeat, gravFinishHeat,
    gravFinishCool, gravSetAnswer, gravSubmit, gravReset,
  } = useLabStore()

  // phase timers — heating and cooling complete themselves
  useEffect(() => {
    if (grav.phase === 'heating') {
      const t = setTimeout(gravFinishHeat, HEAT_MS)
      return () => clearTimeout(t)
    }
    if (grav.phase === 'cooling') {
      const t = setTimeout(gravFinishCool, COOL_MS)
      return () => clearTimeout(t)
    }
  }, [grav.phase, gravFinishHeat, gravFinishCool])

  const emptyDone = grav.readings.some((r) => r.kind === 'empty')
  const loadedDone = grav.readings.some((r) => r.kind === 'loaded')
  const constant = isConstantMass(grav.readings)
  const canWeigh =
    grav.phase === 'idle' &&
    ((!grav.loaded && !emptyDone) ||
      (grav.loaded && grav.heats === 0 && !loadedDone) ||
      (grav.loaded && grav.heats > 0 && grav.lastWeighedHeats !== grav.heats))
  const canHeat = grav.phase === 'idle' && loadedDone && !constant
  const phaseLabel =
    grav.phase === 'heating' ? 'Heating strongly over the Bunsen…'
    : grav.phase === 'cooling' ? 'Cooling on the pipeclay triangle…'
    : constant ? 'Constant mass reached — calculate x'
    : 'Crucible at room temperature'

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701 P3 · Q2 style</span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <p className="text-[11px] text-lab-muted leading-relaxed">
          FB 1 is hydrated magnesium sulfate, MgSO₄·xH₂O. Heat to constant
          mass (two successive masses within 0.01 g), then determine x.
          Never weigh a hot crucible — let it cool first.
        </p>

        <div className="text-xs text-lab-ink" data-testid="grav-phase" data-phase={grav.phase}>
          {phaseLabel}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-1.5">
          <button
            data-testid="grav-weigh"
            onClick={gravWeigh}
            disabled={!canWeigh}
            className={`text-left px-3 py-2 rounded-lg border text-xs ${canWeigh ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5' : 'border-lab-border text-lab-muted/40 cursor-not-allowed'}`}
          >
            ⚖️ Weigh on the balance (±0.01 g)
          </button>
          <button
            data-testid="grav-add"
            onClick={gravAddSample}
            disabled={grav.loaded || !emptyDone || grav.phase !== 'idle'}
            className={`text-left px-3 py-2 rounded-lg border text-xs ${!grav.loaded && emptyDone && grav.phase === 'idle' ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5' : 'border-lab-border text-lab-muted/40 cursor-not-allowed'}`}
          >
            🥄 Add ~{GRAV.sampleMass.toFixed(2)} g hydrated salt {grav.loaded ? '✓' : ''}
          </button>
          <button
            data-testid="grav-heat"
            onClick={gravStartHeat}
            disabled={!canHeat}
            className={`text-left px-3 py-2 rounded-lg border text-xs ${canHeat ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5' : 'border-lab-border text-lab-muted/40 cursor-not-allowed'}`}
          >
            🔥 Heat strongly, then cool
          </button>
        </div>

        {/* Readings table */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Mass readings</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="grav-readings">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">measurement</th>
                  <th className="text-right px-2 py-1 font-medium">mass / g</th>
                </tr>
              </thead>
              <tbody>
                {grav.readings.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-lab-muted/60">weigh the empty crucible first</td></tr>
                )}
                {grav.readings.map((r, i) => (
                  <tr key={i} data-testid={`grav-reading-${i}`} className="border-t border-lab-border/50">
                    <td className="px-2 py-1 text-lab-muted">{r.label}</td>
                    <td className="px-2 py-1 text-right text-lab-ink tabular-nums">{r.mass.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {constant && (
            <div data-testid="grav-constant" className="mt-1.5 text-[11px] text-emerald-400">
              ✓ Constant mass — last two heatings agree within 0.01 g
            </div>
          )}
        </div>

        {/* Determine x */}
        {constant && (
          <div>
            <label className="text-xs text-lab-muted block mb-1">
              x in MgSO₄·xH₂O — use YOUR readings (Mr: MgSO₄ 120.4, H₂O 18.0)
            </label>
            <div className="flex gap-1.5">
              <input
                data-testid="grav-x-input"
                value={grav.answer}
                onChange={(e) => gravSetAnswer(e.target.value)}
                inputMode="decimal"
                placeholder="x = ?"
                className="flex-1 bg-[#0c1624] border border-lab-border rounded-lg px-3 py-1.5 text-xs text-lab-ink outline-none focus:border-lab-accent"
              />
              <button
                data-testid="grav-x-check"
                onClick={gravSubmit}
                className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent text-xs hover:bg-lab-accent/10"
              >
                Check
              </button>
            </div>
            {grav.result && (
              <div
                data-testid="grav-x-result"
                data-ok={grav.result.ok ? '1' : '0'}
                className={`mt-1.5 text-[11px] ${grav.result.ok ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {grav.result.ok
                  ? `✓ Correct — water lost ${grav.result.water.toFixed(2)} g ÷ 18.0 and residue ${grav.result.anhydrous.toFixed(2)} g ÷ 120.4 give x = ${grav.result.x.toFixed(2)} ≈ ${grav.result.expected}`
                  : grav.result.reason
                    ? `✗ ${grav.result.reason}`
                    : `✗ Not quite — mol H₂O ÷ mol MgSO₄ from your own table. Try again.`}
              </div>
            )}
          </div>
        )}

        <button
          onClick={gravReset}
          className="text-[11px] text-lab-muted hover:text-lab-ink underline underline-offset-2"
        >
          Reset experiment
        </button>
      </div>
    </div>
  )
}
