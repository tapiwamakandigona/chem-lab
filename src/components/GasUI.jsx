import { useLabStore } from '../store.js'
import { GAS, readSyringe, isConstantVolume } from '../lib/gas.js'

export default function GasUI({ onBack }) {
  const { gas, gasStart, gasRecord, gasSetAnswer, gasSubmit, gasReset } = useLabStore()

  const constant = isConstantVolume(gas.readings)
  const liveRead = gas.phase === 'setup' ? 0 : readSyringe(gas.timeSec)
  const lastT = gas.readings.length ? gas.readings[gas.readings.length - 1].t : -999
  const canRecord = gas.phase === 'running' && Math.round(gas.timeSec) - lastT >= 5
  const phaseLabel =
    gas.phase === 'setup' ? 'Ready — add the acid to start'
    : gas.phase === 'running' ? 'Reacting… record the syringe at intervals'
    : 'Volume constant — calculate the purity'

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
          FB 2 is an impure sample of calcium carbonate. {GAS.sampleMass.toFixed(3)} g
          reacts with excess dilute HCl; the CO₂ is collected in a 100 cm³ gas
          syringe. Record the volume until it is constant, then find the %
          purity (Vm = 24.0 dm³ mol⁻¹ at r.t.p., Mr CaCO₃ = {GAS.mrCarbonate}).
        </p>

        {/* Live syringe + clock */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-lab-ink tracking-tight" data-testid="gas-volume">
            {liveRead.toFixed(1)}<span className="text-lg text-lab-muted ml-1">cm³</span>
          </div>
          <div className="text-xs text-lab-muted mt-0.5 font-mono" data-testid="gas-time">
            t = {gas.phase === 'setup' ? '0' : Math.round(gas.timeSec)} s
          </div>
        </div>

        <div className="text-xs text-lab-ink" data-testid="gas-phase" data-phase={gas.phase}>
          {phaseLabel}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-1.5">
          <button
            data-testid="gas-start"
            onClick={gasStart}
            disabled={gas.phase !== 'setup'}
            className={`text-left px-3 py-2 rounded-lg border text-xs ${gas.phase === 'setup' ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5' : 'border-lab-border text-lab-muted/40 cursor-not-allowed'}`}
          >
            🧪 Add 50 cm³ excess HCl and stopper quickly
          </button>
          <button
            data-testid="gas-record"
            onClick={gasRecord}
            disabled={!canRecord}
            className={`text-left px-3 py-2 rounded-lg border text-xs ${canRecord ? 'border-lab-accent/40 text-lab-ink hover:border-lab-accent hover:bg-lab-accent/5' : 'border-lab-border text-lab-muted/40 cursor-not-allowed'}`}
          >
            📋 Record syringe reading (nearest 0.5 cm³)
          </button>
        </div>

        {/* Readings table */}
        <div>
          <label className="text-xs text-lab-muted block mb-1">Volume readings</label>
          <div className="rounded-lg border border-lab-border overflow-hidden">
            <table className="w-full text-[11px]" data-testid="gas-readings">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">time / s</th>
                  <th className="text-right px-2 py-1 font-medium">volume / cm³</th>
                </tr>
              </thead>
              <tbody>
                {gas.readings.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-lab-muted/60">start the reaction, then record readings</td></tr>
                )}
                {gas.readings.map((r, i) => (
                  <tr key={i} data-testid={`gas-reading-${i}`} className="border-t border-lab-border/50">
                    <td className="px-2 py-1 text-lab-muted tabular-nums">{r.t}</td>
                    <td className="px-2 py-1 text-right text-lab-ink tabular-nums">{r.v.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {constant && (
            <div data-testid="gas-constant" className="mt-1.5 text-[11px] text-emerald-400">
              ✓ Constant volume — last two readings agree within 0.5 cm³
            </div>
          )}
        </div>

        {/* Determine purity */}
        {constant && (
          <div>
            <label className="text-xs text-lab-muted block mb-1">
              % purity of the carbonate — use YOUR final volume
            </label>
            <div className="flex gap-1.5">
              <input
                data-testid="gas-purity-input"
                value={gas.answer}
                onChange={(e) => gasSetAnswer(e.target.value)}
                inputMode="decimal"
                placeholder="% purity = ?"
                className="flex-1 bg-[#0c1624] border border-lab-border rounded-lg px-3 py-1.5 text-xs text-lab-ink outline-none focus:border-lab-accent"
              />
              <button
                data-testid="gas-purity-check"
                onClick={gasSubmit}
                className="px-3 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent text-xs hover:bg-lab-accent/10"
              >
                Check
              </button>
            </div>
            {gas.result && (
              <div
                data-testid="gas-purity-result"
                data-ok={gas.result.ok ? '1' : '0'}
                className={`mt-1.5 text-[11px] ${gas.result.ok ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {gas.result.ok
                  ? `✓ Correct — ${gas.result.vFinal.toFixed(1)} cm³ ÷ 24000 = ${gas.result.mol.toExponential(2)} mol, × ${GAS.mrCarbonate} ÷ ${GAS.sampleMass.toFixed(3)} g gives ${gas.result.purity.toFixed(1)}%`
                  : gas.result.reason
                    ? `✗ ${gas.result.reason}`
                    : `✗ Not quite — mol = V/24000, mass CaCO₃ = mol × ${GAS.mrCarbonate}, purity = mass ÷ ${GAS.sampleMass.toFixed(3)} × 100.`}
              </div>
            )}
          </div>
        )}

        <button
          onClick={gasReset}
          className="text-[11px] text-lab-muted hover:text-lab-ink underline underline-offset-2"
        >
          Reset experiment
        </button>
      </div>
    </div>
  )
}
