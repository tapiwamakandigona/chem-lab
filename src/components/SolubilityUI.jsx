import { useLabStore } from '../store.js'
import {
  SOLUBILITY_RUNS,
  concentrationPer100,
  saturationTemperature,
  solubilityStatus,
} from '../lib/solubility.js'
import CheckResult from './CheckResult.jsx'

function SolubilityGraph({ observations }) {
  const width = 290
  const height = 145
  const pad = { l: 36, r: 9, t: 10, b: 27 }
  const x = (temp) => pad.l + (temp / 100) * (width - pad.l - pad.r)
  const y = (sol) => height - pad.b - (sol / 250) * (height - pad.t - pad.b)
  const curve = Array.from({ length: 51 }, (_, i) => {
    const temp = i * 2
    // Keep UI independent from a large lookup array: interpolation is done
    // by the same source-of-truth helper through expected observations below.
    const anchors = [[0, 13.25], [20, 31.66], [40, 63.9], [60, 109.9], [80, 169], [100, 245.2]]
    let sol = anchors.at(-1)[1]
    for (let j = 1; j < anchors.length; j += 1) {
      if (temp <= anchors[j][0]) {
        const [t1, s1] = anchors[j - 1]
        const [t2, s2] = anchors[j]
        sol = s1 + ((temp - t1) / (t2 - t1)) * (s2 - s1)
        break
      }
    }
    return `${x(temp)},${y(sol)}`
  }).join(' ')
  return (
    <svg
      data-testid="solubility-graph"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto rounded-lg border border-lab-border bg-[#0c1e35]"
      aria-label="KNO3 solubility curve"
    >
      {[0, 50, 100, 150, 200, 250].map((v) => (
        <g key={`y-${v}`}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke="#25405a" strokeWidth="0.8" />
          <text x={pad.l - 5} y={y(v) + 3} textAnchor="end" fontSize="7" fill="#8294a6">{v}</text>
        </g>
      ))}
      {[0, 20, 40, 60, 80, 100].map((v) => (
        <g key={`x-${v}`}>
          <line x1={x(v)} x2={x(v)} y1={pad.t} y2={height - pad.b} stroke="#25405a" strokeWidth="0.8" />
          <text x={x(v)} y={height - 15} textAnchor="middle" fontSize="7" fill="#8294a6">{v}</text>
        </g>
      ))}
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={height - pad.b} stroke="#9db0c1" />
      <line x1={pad.l} x2={width - pad.r} y1={height - pad.b} y2={height - pad.b} stroke="#9db0c1" />
      <polyline data-testid="solubility-fit" points={curve} fill="none" stroke="#35c9ff" strokeWidth="1.8" />
      {observations.map((obs) => {
        const run = SOLUBILITY_RUNS.find((item) => item.id === obs.runId)
        if (!run) return null
        const cx = x(obs.temperature)
        const cy = y(concentrationPer100(run))
        return (
          <g key={obs.runId} data-testid="solubility-point">
            <line x1={cx - 3} x2={cx + 3} y1={cy - 3} y2={cy + 3} stroke="#f8d465" strokeWidth="1.4" />
            <line x1={cx - 3} x2={cx + 3} y1={cy + 3} y2={cy - 3} stroke="#f8d465" strokeWidth="1.4" />
          </g>
        )
      })}
      <text x={(pad.l + width - pad.r) / 2} y={height - 4} textAnchor="middle" fontSize="7.5" fill="#9fb0c0">
        crystallisation temperature / °C
      </text>
      <text transform={`translate(9 ${(pad.t + height - pad.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="7.5" fill="#9fb0c0">
        solubility / g per 100 g H₂O
      </text>
    </svg>
  )
}

export default function SolubilityUI({ onBack }) {
  const {
    solubility,
    solubilitySetRun,
    solubilityStartHeating,
    solubilityStopHeating,
    solubilityStartCooling,
    solubilityStopCooling,
    solubilityNucleate,
    solubilityRecord,
    solubilitySetAnswer,
    solubilitySubmit,
    solubilityReset,
  } = useLabStore()
  const status = solubilityStatus(solubility)
  const run = status.run
  const target = saturationTemperature(run)
  const firstCrystals = solubility.heatedClear &&
    ['cooling', 'crystals', 'complete'].includes(solubility.phase) &&
    solubility.temperature <= target + 0.5
  const alreadyRecorded = solubility.observations.some((item) => item.runId === solubility.runId)
  const isHeating = solubility.phase === 'heating'
  const isCooling = ['cooling', 'crystals'].includes(solubility.phase)

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
          temperature investigation
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div>
          <h2 className="text-sm text-lab-ink font-medium">KNO₃ solubility curve</h2>
          <p className="text-[11px] text-lab-muted mt-1 leading-relaxed">
            Dissolve a known mass in 20.0 g water, then cool while stirring.
            Record the temperature when the first crystals appear.
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">1 · Assigned mixture</label>
          <div className="grid grid-cols-5 gap-1">
            {SOLUBILITY_RUNS.map((item) => (
              <button
                key={item.id}
                data-testid={`solubility-run-${item.id}`}
                onClick={() => solubilitySetRun(item.id)}
                disabled={isHeating || isCooling}
                className={`px-1 py-1.5 rounded-lg border text-[10px] ${
                  solubility.runId === item.id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted hover:text-lab-ink'
                } disabled:opacity-50`}
              >
                {item.label}<span className="block opacity-70">{item.soluteMass.toFixed(1)} g</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-lab-muted mt-1">
            {run.soluteMass.toFixed(1)} g KNO₃ + {run.waterMass.toFixed(1)} g H₂O
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">2 · Heat until clear</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">temperature</span>
              <span className="font-mono text-xs text-lab-ink" data-testid="solubility-temp">
                {solubility.temperature.toFixed(1)} °C
              </span>
            </div>
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">appearance</span>
              <span className="text-[11px] text-lab-ink" data-testid="solubility-appearance">
                {status.visibleCrystals
                  ? 'first crystals'
                  : solubility.heatedClear
                    ? 'clear solution'
                    : 'solid + solution'}
              </span>
            </div>
          </div>
          <button
            data-testid="solubility-heat"
            onClick={isHeating ? solubilityStopHeating : solubilityStartHeating}
            disabled={isCooling}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${
              isHeating
                ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                : solubility.heatedClear
                  ? 'border-emerald-700/50 text-emerald-300 bg-emerald-900/10'
                  : 'border-lab-accent/50 text-lab-accent bg-lab-accent/10'
            } disabled:opacity-40`}
          >
            {isHeating ? '■ Stop heating' : solubility.heatedClear ? '✓ All solid dissolved' : '▶ Heat water bath + stir'}
          </button>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">3 · Cool and detect saturation</label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              data-testid="solubility-cool-slow"
              onClick={isCooling ? solubilityStopCooling : () => solubilityStartCooling(false)}
              disabled={!solubility.heatedClear || isHeating}
              className={`px-2 py-2 rounded-lg border text-xs ${
                isCooling && !solubility.rushing
                  ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                  : 'border-lab-border text-lab-muted hover:text-lab-ink'
              } disabled:opacity-40`}
            >
              {isCooling && !solubility.rushing ? '■ Pause cooling' : 'Cool slowly + stir'}
            </button>
            <button
              data-testid="solubility-cool-fast"
              onClick={isCooling ? solubilityStopCooling : () => solubilityStartCooling(true)}
              disabled={!solubility.heatedClear || isHeating}
              className={`px-2 py-2 rounded-lg border text-xs ${
                isCooling && solubility.rushing
                  ? 'border-amber-500 text-amber-300 bg-amber-500/10'
                  : 'border-lab-border text-lab-muted hover:text-lab-ink'
              } disabled:opacity-40`}
            >
              {isCooling && solubility.rushing ? '■ Remove ice bath' : 'Crash-cool in ice'}
            </button>
          </div>
          {solubility.rushing && (
            <p data-testid="solubility-rushing" className="text-[10px] text-amber-300 mt-1">
              Fast cooling gives many small crystals that can trap impurities.
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              data-testid="solubility-nucleate"
              onClick={solubilityNucleate}
              disabled={!isCooling || solubility.nucleated}
              className="flex-1 px-3 py-2 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs disabled:opacity-40"
            >
              {solubility.nucleated ? '✓ Tube scratched / seeded' : 'Scratch tube / add seed'}
            </button>
            <button
              data-testid="solubility-record"
              onClick={solubilityRecord}
              disabled={!firstCrystals || alreadyRecorded}
              className="px-3 py-2 rounded-lg border border-lab-accent/50 text-lab-accent text-xs disabled:opacity-40"
            >
              {alreadyRecorded ? 'Recorded' : 'Record first crystals'}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">Results and curve</label>
          <div className="rounded-lg border border-lab-border overflow-hidden mb-2">
            <table className="w-full text-[10px]" data-testid="solubility-observations">
              <thead>
                <tr className="bg-[#0c1e35] text-lab-muted">
                  <th className="text-left px-2 py-1 font-medium">run</th>
                  <th className="text-left px-2 py-1 font-medium">KNO₃ / g</th>
                  <th className="text-left px-2 py-1 font-medium">H₂O / g</th>
                  <th className="text-left px-2 py-1 font-medium">first crystals / °C</th>
                </tr>
              </thead>
              <tbody>
                {solubility.observations.length === 0 ? (
                  <tr><td colSpan={4} className="px-2 py-2 text-lab-muted/60">no saturation point recorded yet</td></tr>
                ) : solubility.observations.map((obs) => {
                  const item = SOLUBILITY_RUNS.find((r) => r.id === obs.runId)
                  return (
                    <tr key={obs.runId} data-testid="solubility-obs-row" className="border-t border-lab-border/60">
                      <td className="px-2 py-1 text-lab-muted">{item.label}</td>
                      <td className="px-2 py-1 text-lab-ink">{item.soluteMass.toFixed(1)}</td>
                      <td className="px-2 py-1 text-lab-ink">{item.waterMass.toFixed(1)}</td>
                      <td className="px-2 py-1 text-lab-ink">{obs.temperature.toFixed(1)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <SolubilityGraph observations={solubility.observations} />
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">
            Calculate solubility = mass KNO₃ ÷ mass H₂O × 100
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                data-testid="solubility-answer"
                inputMode="decimal"
                value={solubility.answer}
                onChange={(event) => solubilitySetAnswer(event.target.value)}
                placeholder="g per 100 g H₂O"
                className="w-full bg-[#0c1e35] border border-lab-border rounded-lg px-3 py-2 text-xs text-lab-ink outline-none focus:border-lab-accent"
              />
            </div>
            <button
              data-testid="solubility-submit"
              onClick={solubilitySubmit}
              className="px-3 py-2 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 text-xs"
            >
              Check
            </button>
          </div>
          <button
            data-testid="solubility-reset"
            onClick={solubilityReset}
            className="mt-2 px-3 py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
          >
            Reset selected run
          </button>
          {solubility.result && (
            <CheckResult testid="solubility-result" ok={solubility.result.ok} score={solubility.result.total}>
              <div className="font-medium">{solubility.result.total}/3 investigation marks</div>
              {solubility.result.ok ? (
                <p>Correct — dissolved completely, recorded the first crystals near saturation, and calculated {solubility.result.expected.toFixed(1)} g per 100 g H₂O.</p>
              ) : (
                <ul className="list-disc ml-4 mt-1">
                  {!solubility.result.warmedClear && <li>Heat and stir until every crystal dissolves.</li>}
                  {!solubility.result.evidence && <li>Record first crystals within ±2 °C of the saturation point.</li>}
                  {!solubility.result.calculated && <li>Use mass solute ÷ 20.0 × 100; expected {solubility.result.expected.toFixed(1)}.</li>}
                </ul>
              )}
            </CheckResult>
          )}
        </div>

        <p className="text-[10px] text-lab-muted/70 leading-relaxed">
          Wear eye protection and handle the hot water bath with care. KNO₃ is an oxidiser:
          keep it away from combustible material. This reinforces Paper 3 temperature,
          observation, tabulation and graph skills; it is not labelled as a specific past-paper question.
        </p>
      </div>
    </div>
  )
}
