import { useLabStore, getEnthalpyCalc, getCoolingAnalysis, COOLING, TITRATION_PRESETS } from '../store.js'
import RateGraph from './RateGraph.jsx'
import CoolingCurve from './CoolingCurve.jsx'

export default function CalcSheet({ experiment, onClose }) {
  const { titration, clock, enthalpy } = useLabStore()

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-lab-panel border border-lab-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lab-ink font-semibold text-base">
            {experiment === 'titration' && 'Titration — Worked Calculations'}
            {experiment === 'clock' && 'Clock Reaction — Results & Analysis'}
            {experiment === 'enthalpy' && 'Enthalpy — Worked Calculations'}
          </h2>
          <button
            onClick={onClose}
            className="text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border text-sm"
          >
            ✕
          </button>
        </div>

        {experiment === 'titration' && <TitrationCalc titration={titration} />}
        {experiment === 'clock' && <ClockCalc clock={clock} />}
        {experiment === 'enthalpy' && <EnthalpyCalc enthalpy={enthalpy} />}
      </div>
    </div>
  )
}

// Reusable row component for future calculation displays
// function Row({ label, value, highlight }) {
//   return (
//     <div className={`flex justify-between items-baseline py-1.5 border-b border-lab-border/40 ${highlight ? 'text-lab-success' : ''}`}>
//       <span className="text-lab-muted text-xs">{label}</span>
//       <span className="font-mono text-sm text-lab-ink">{value}</span>
//     </div>
//   )
// }

function Step({ n, text, calc }) {
  return (
    <div className="mb-4">
      <div className="text-xs text-lab-accent mb-1">Step {n}</div>
      <div className="text-xs text-lab-muted mb-1">{text}</div>
      <div className="font-mono text-sm text-lab-ink bg-lab-bg rounded px-3 py-2 border border-lab-border/40">{calc}</div>
    </div>
  )
}

function TitrationCalc({ titration }) {
  const preset = TITRATION_PRESETS[titration.preset]
  const vals = titration.titreValues
  if (vals.length === 0) {
    return <p className="text-lab-muted text-sm">No titres recorded yet. Complete at least one titration first.</p>
  }
  // Use all values if ≤2, else concordant (within 0.10)
  let concordant = vals
  if (vals.length > 2) {
    const sorted = [...vals].sort((a, b) => a - b)
    const mean0 = sorted.reduce((s, v) => s + v, 0) / sorted.length
    concordant = sorted.filter(v => Math.abs(v - mean0) <= 0.10)
    if (concordant.length < 2) concordant = sorted.slice(0, 2)
  }
  const mean = concordant.reduce((s, v) => s + v, 0) / concordant.length

  const isS22 = titration.preset === 's22'
  let molesAlkali, concAcid, label

  if (isS22) {
    molesAlkali = (mean / 1000) * preset.concentration.alkali
    // 1:1 ratio
    concAcid = molesAlkali / (titration.flaskVolume / 1000)
    label = 'NaOH (1:1 with acid)'
  } else {
    // s21: KMnO4 + 5Fe2+
    molesAlkali = (mean / 1000) * preset.concentration.KMnO4
    const molesFe = molesAlkali * 5
    concAcid = molesFe / (titration.flaskVolume / 1000)
    label = 'KMnO₄, ×5 → Fe²⁺'
  }

  return (
    <div className="space-y-1">
      <div className="mb-3">
        <p className="text-xs text-lab-muted mb-2">All titres (cm³):</p>
        <div className="flex flex-wrap gap-2">
          {vals.map((v, i) => (
            <span key={i} className={`font-mono text-sm px-2 py-0.5 rounded border ${
              concordant.includes(v) ? 'border-lab-success text-lab-success' : 'border-lab-border text-lab-muted'
            }`}>{v.toFixed(2)}</span>
          ))}
        </div>
      </div>
      <Step n={1} text="Mean concordant titre" calc={`(${concordant.map(v => v.toFixed(2)).join(' + ')}) / ${concordant.length} = ${mean.toFixed(2)} cm³`} />
      <Step n={2} text={`Moles of titrant (${label})`} calc={`n = (${mean.toFixed(2)} / 1000) × ${isS22 ? preset.concentration.alkali : preset.concentration.KMnO4} = ${molesAlkali.toFixed(5)} mol`} />
      {!isS22 && (
        <Step n="2b" text="Moles of Fe²⁺ (×5 ratio: MnO₄⁻ + 5Fe²⁺ → …)" calc={`n(Fe²⁺) = ${molesAlkali.toFixed(5)} × 5 = ${(molesAlkali * 5).toFixed(5)} mol`} />
      )}
      <Step n={isS22 ? 3 : 4} text={`Concentration of ${isS22 ? 'acid' : 'Fe²⁺'} solution`} calc={`c = ${(molesAlkali * (isS22 ? 1 : 5)).toFixed(5)} / (${titration.flaskVolume} / 1000) = ${concAcid.toFixed(3)} mol dm⁻³`} />
    </div>
  )
}

function ClockCalc({ clock }) {
  if (clock.results.length === 0) {
    return <p className="text-lab-muted text-sm">No results yet. Record some clock reaction times first.</p>
  }
  return (
    <div>
      <p className="text-xs text-lab-muted mb-3">Rate is proportional to 1/time. Plot 1000/t (y-axis) vs [Na₂S₂O₃] (x-axis) — a straight line through the origin indicates first-order dependence on thiosulfate.</p>
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="text-lab-muted border-b border-lab-border">
            <th className="text-left pb-2">[Na₂S₂O₃] / mol dm⁻³</th>
            <th className="text-right pb-2">t / s</th>
            <th className="text-right pb-2">1000/t</th>
          </tr>
        </thead>
        <tbody>
          {clock.results.map((r, i) => (
            <tr key={i} className="border-b border-lab-border/40">
              <td className="py-1.5 font-mono text-lab-ink">{r.conc.toFixed(3)}</td>
              <td className="py-1.5 text-right font-mono text-lab-ink">{r.time.toFixed(1)}</td>
              <td className="py-1.5 text-right font-mono text-lab-success font-bold">{r.time > 0 ? (1000 / r.time).toFixed(2) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <RateGraph results={clock.results} />
      <div className="bg-lab-bg border border-lab-border rounded p-3 text-xs font-mono text-lab-ink space-y-1">
        <div className="text-lab-muted mb-1">Rate equation analysis:</div>
        <div>rate ∝ 1/t</div>
        <div>rate = k[Na₂S₂O₃]ⁿ</div>
        <div>If graph is linear through origin → n = 1</div>
        <div className="text-lab-accent mt-1">gradient = k (rate constant)</div>
      </div>
    </div>
  )
}

function EnthalpyCalc({ enthalpy }) {
  const calc = getEnthalpyCalc(enthalpy)
  const { mass, volume, T1, T2 } = enthalpy
  const deltaT = T2 - T1
  const cooling = getCoolingAnalysis(enthalpy)
  const corr = cooling
    ? (() => {
        const dT = cooling.Textrap - T1
        const q = volume * 4.2 * dT
        const dH = calc.moles > 0 ? (-q / calc.moles) / 1000 : 0
        return { dT, q, dH }
      })()
    : null

  return (
    <div className="space-y-4">
      <div className="bg-lab-bg border border-lab-border rounded p-3 text-xs font-mono text-lab-muted space-y-1">
        <div>Substance: Na₂CO₃  |  M = 106 g mol⁻¹</div>
        <div>Specific heat capacity c = 4.2 J cm⁻³ °C⁻¹  (CAIE S20 convention)</div>
      </div>

      {cooling && (
        <div>
          <p className="text-xs text-lab-muted mb-2">
            Thermometer readings every {COOLING.interval} s (solid added at t = {COOLING.mixT} s — no reading taken):
          </p>
          <div className="overflow-x-auto mb-3">
            <table data-testid="cooling-table" className="text-xs whitespace-nowrap">
              <thead>
                <tr className="text-lab-muted border-b border-lab-border">
                  <th className="text-left pb-1 pr-2">t / s</th>
                  {cooling.readings.map((r) => (
                    <th key={r.t} className="text-right pb-1 px-1.5 font-mono">{r.t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1 pr-2 text-lab-muted">T / °C</td>
                  {cooling.readings.map((r) => (
                    <td key={r.t} className="py-1 px-1.5 text-right font-mono text-lab-ink">
                      {r.T == null ? '×' : r.T.toFixed(1)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <CoolingCurve analysis={cooling} T1={T1} />
          <div className="bg-lab-bg border border-lab-border rounded p-3 text-xs font-mono text-lab-ink space-y-1 mb-1">
            <div className="text-lab-muted mb-1">Heat-loss correction:</div>
            <div>Extrapolate cooling line back to t = {COOLING.mixT} s</div>
            <div>
              T<sub>extrapolated</sub> = <span data-testid="cooling-textrap-value" className="text-lab-accent font-bold">{cooling.Textrap.toFixed(1)} °C</span>
              <span className="text-lab-muted"> (max recorded: {enthalpy.targetT2.toFixed(1)} °C)</span>
            </div>
          </div>
        </div>
      )}

      <Step n={1} text="Temperature change" calc={`ΔT = T₂ − T₁ = ${T2.toFixed(1)} − ${T1.toFixed(1)} = ${deltaT.toFixed(1)} °C`} />
      <Step n={2} text="Heat transferred q = V × c × ΔT" calc={`q = ${volume.toFixed(1)} × 4.2 × ${deltaT.toFixed(1)} = ${calc.q.toFixed(1)} J`} />
      <Step n={3} text="Moles of Na₂CO₃ dissolved" calc={`n = ${mass.toFixed(2)} / 106 = ${calc.moles.toFixed(4)} mol`} />
      <Step n={4} text="Enthalpy of solution ΔH = −q / n" calc={`ΔH = −(${calc.q.toFixed(1)}) / ${calc.moles.toFixed(4)}\n    = ${(-calc.q / calc.moles).toFixed(0)} J mol⁻¹\n    = ${calc.deltaHkJ.toFixed(1)} kJ mol⁻¹`} />

      <div className={`rounded p-3 border text-sm font-mono font-bold text-center ${
        calc.deltaHkJ < 0 ? 'border-red-400/40 text-red-400 bg-red-400/5' : 'border-blue-400/40 text-blue-400 bg-blue-400/5'
      }`}>
        ΔH = {calc.deltaHkJ.toFixed(1)} kJ mol⁻¹
        <div className="text-xs font-normal text-lab-muted mt-1">
          {calc.deltaHkJ < 0 ? 'Exothermic — heat released to surroundings' : 'Endothermic — heat absorbed from surroundings'}
        </div>
      </div>

      {corr && (
        <div data-testid="cooling-corrected" className="rounded p-3 border border-lab-accent/40 bg-lab-accent/5 text-xs font-mono text-lab-ink space-y-1">
          <div className="text-lab-muted">With heat-loss correction (extrapolated T):</div>
          <div>ΔT<sub>corr</sub> = {cooling.Textrap.toFixed(1)} − {T1.toFixed(1)} = {corr.dT.toFixed(1)} °C</div>
          <div>q<sub>corr</sub> = {volume.toFixed(1)} × 4.2 × {corr.dT.toFixed(1)} = {corr.q.toFixed(1)} J</div>
          <div className="text-lab-accent font-bold">ΔH<sub>corr</sub> = {corr.dH.toFixed(1)} kJ mol⁻¹</div>
          <div className="text-lab-muted mt-1">
            Closer to the data-book value (−23.0 kJ mol⁻¹) — extrapolation
            recovers heat lost to the cup and surroundings before T₂ was read.
          </div>
        </div>
      )}
    </div>
  )
}
