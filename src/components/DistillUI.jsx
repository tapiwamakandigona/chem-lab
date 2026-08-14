import { useLabStore } from '../store.js'
import { distillStatus } from '../lib/distill.js'
import CheckResult from './CheckResult.jsx'

export default function DistillUI({ onBack }) {
  const {
    distill,
    distillSetCooling,
    distillAddGranules,
    distillStart,
    distillStop,
    distillRecord,
    distillSubmit,
    distillReset,
  } = useLabStore()
  const status = distillStatus(distill)
  const canRecord = status.volume >= 0.5

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
          separation enrichment
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div>
          <h2 className="text-sm text-lab-ink font-medium">Distil water from CuSO₄(aq)</h2>
          <p className="text-[11px] text-lab-muted mt-1 leading-relaxed">
            Separate the volatile solvent from a blue non-volatile solute. Configure
            the condenser, prevent bumping, heat gently and record the colourless distillate.
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">1 · Condenser cooling water</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              data-testid="distill-cooling-lower"
              onClick={() => distillSetCooling('lower')}
              disabled={distill.heating}
              className={`px-2 py-2 rounded-lg border text-xs ${
                distill.cooling === 'lower'
                  ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                  : 'border-lab-border text-lab-muted hover:text-lab-ink'
              } disabled:opacity-50`}
            >
              lower inlet → upper outlet
            </button>
            <button
              data-testid="distill-cooling-upper"
              onClick={() => distillSetCooling('upper')}
              disabled={distill.heating}
              className={`px-2 py-2 rounded-lg border text-xs ${
                distill.cooling === 'upper'
                  ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                  : 'border-lab-border text-lab-muted hover:text-lab-ink'
              } disabled:opacity-50`}
            >
              upper inlet → lower outlet
            </button>
          </div>
          <p className="text-[10px] text-lab-muted mt-1">
            Water entering at the lower nozzle pushes air upward and keeps the jacket full.
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">2 · Boiling control</label>
          <button
            data-testid="distill-granules"
            onClick={distillAddGranules}
            disabled={distill.heating || distill.granules}
            className={`w-full px-3 py-2 rounded-lg border text-xs text-left ${
              distill.granules
                ? 'border-emerald-700/50 text-emerald-300 bg-emerald-900/10'
                : 'border-lab-accent/40 text-lab-ink hover:border-lab-accent'
            } disabled:cursor-default`}
          >
            {distill.granules ? '✓ Anti-bumping granules added' : '+ Add anti-bumping granules before heating'}
          </button>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">3 · Heat and collect</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">vapour</span>
              <span className="font-mono text-xs text-lab-ink" data-testid="distill-temp">
                {status.temperature.toFixed(1)} °C
              </span>
            </div>
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">time</span>
              <span className="font-mono text-xs text-lab-ink">{Math.round(distill.timeSec)} s</span>
            </div>
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">distillate</span>
              <span className="font-mono text-xs text-lab-ink" data-testid="distill-volume">
                {status.volume.toFixed(1)} cm³
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="distill-heat"
              onClick={distill.heating ? distillStop : distillStart}
              className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium ${
                distill.heating
                  ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                  : 'border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20'
              }`}
            >
              {distill.heating ? '■ Stop heating' : '▶ Start electric heater'}
            </button>
            <button
              data-testid="distill-record"
              onClick={distillRecord}
              disabled={!canRecord}
              className="px-3 py-2 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs disabled:opacity-40"
            >
              Record
            </button>
          </div>

          {status.bumping && (
            <div data-testid="distill-bumping" className="mt-2 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              ⚠ Violent bumping — stop heating. Never add anti-bumping granules to hot liquid.
            </div>
          )}
          {distill.heating && distill.cooling === 'off' && status.temperature >= 98 && (
            <div className="mt-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
              Hot vapour is escaping — turn on condenser water before heating.
            </div>
          )}
          {distill.cooling === 'upper' && (
            <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
              Reversed flow leaves air pockets in the jacket, so condensation is inefficient.
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">Observation table</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="distill-observations">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">time / s</th>
                  <th className="text-left px-2 py-1 font-medium">vapour / °C</th>
                  <th className="text-left px-2 py-1 font-medium">volume / cm³</th>
                  <th className="text-left px-2 py-1 font-medium">appearance</th>
                </tr>
              </thead>
              <tbody>
                {distill.observations.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-2 text-lab-muted/60">no distillate recorded yet</td></tr>
                ) : distill.observations.map((o, i) => (
                  <tr key={`${o.time}-${i}`} data-testid="distill-obs-row" className="border-t border-lab-border/60">
                    <td className="px-2 py-1 text-lab-muted">{o.time}</td>
                    <td className="px-2 py-1 text-lab-ink">{o.temperature.toFixed(1)}</td>
                    <td className="px-2 py-1 text-lab-ink">{o.volume.toFixed(1)}</td>
                    <td className="px-2 py-1 text-lab-ink">colourless</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2">
          <button
            data-testid="distill-submit"
            onClick={distillSubmit}
            className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-medium"
          >
            Check technique
          </button>
          <button
            data-testid="distill-reset"
            onClick={distillReset}
            className="ml-2 px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
          >
            Reset apparatus
          </button>
          {distill.result && (
            <CheckResult testid="distill-result" ok={distill.result.ok} score={distill.result.total}>
              <div className="font-medium mb-0.5">{distill.result.total}/{distill.result.max} technique marks</div>
              {distill.result.ok ? (
                <div>Correct — lower-inlet cooling, controlled boiling and colourless water collected at ≈100 °C.</div>
              ) : (
                <ul className="list-disc ml-4 space-y-0.5">
                  {!distill.result.lowerInlet && <li>Run cooling water into the lower condenser nozzle.</li>}
                  {!distill.result.granulesOk && <li>Add anti-bumping granules before heating.</li>}
                  {!distill.result.evidence && <li>Record ≥5 cm³ colourless distillate while vapour is 98–102 °C.</li>}
                </ul>
              )}
            </CheckResult>
          )}
        </div>

        <p className="text-[10px] text-lab-muted/70 leading-relaxed">
          Safety: eye protection; keep the receiver open to air; never heat a sealed system.
          Electric heating avoids a naked flame. This is a separation-technique enrichment practical,
          not presented as a standard current Paper 3 quantitative question.
        </p>
      </div>
    </div>
  )
}
