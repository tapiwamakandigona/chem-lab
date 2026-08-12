import { useLabStore } from '../store.js'
import {
  PEROXIDE_RUNS,
  PEROXIDE_MAX_SEC,
  PEROXIDE_VOLUME_CM3,
  initialRate,
  peroxideRun,
  syringeReading,
} from '../lib/peroxide.js'

const COLORS = {
  control: '#35c9ff',
  'high-conc': '#f5c84c',
  'no-catalyst': '#8f9dac',
  granules: '#bf86ff',
  warm: '#ff775f',
}

function KineticsGraph({ readings }) {
  const W = 300
  const H = 155
  const p = { l: 38, r: 10, t: 10, b: 27 }
  const x = (t) => p.l + (t / PEROXIDE_MAX_SEC) * (W - p.l - p.r)
  const y = (v) => H - p.b - (v / 65) * (H - p.t - p.b)
  const complete = Object.entries(readings).filter(([, data]) => data.length > 1)
  return (
    <svg data-testid="peroxide-graph" viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded-lg border border-lab-border bg-[#0c1e35]">
      {[0, 20, 40, 60].map((v) => (
        <g key={`y${v}`}>
          <line x1={p.l} x2={W - p.r} y1={y(v)} y2={y(v)} stroke="#25405a" strokeWidth="0.8" />
          <text x={p.l - 5} y={y(v) + 3} textAnchor="end" fontSize="7" fill="#8294a6">{v}</text>
        </g>
      ))}
      {[0, 30, 60, 90, 120, 150, 180].map((t) => (
        <g key={`x${t}`}>
          <line x1={x(t)} x2={x(t)} y1={p.t} y2={H - p.b} stroke="#25405a" strokeWidth="0.8" />
          <text x={x(t)} y={H - 15} textAnchor="middle" fontSize="7" fill="#8294a6">{t}</text>
        </g>
      ))}
      <line x1={p.l} x2={p.l} y1={p.t} y2={H - p.b} stroke="#a4b3c0" />
      <line x1={p.l} x2={W - p.r} y1={H - p.b} y2={H - p.b} stroke="#a4b3c0" />
      {complete.map(([id, data]) => (
        <g key={id} data-testid={`peroxide-curve-${id}`}>
          <polyline
            points={data.map((d) => `${x(d.t)},${y(d.v)}`).join(' ')}
            fill="none"
            stroke={COLORS[id]}
            strokeWidth="1.8"
          />
          {data.map((d) => (
            <circle key={d.t} cx={x(d.t)} cy={y(d.v)} r="1.6" fill={COLORS[id]} />
          ))}
        </g>
      ))}
      <text x={(p.l + W - p.r) / 2} y={H - 4} textAnchor="middle" fontSize="7.5" fill="#9fb0c0">time / s</text>
      <text transform={`translate(10 ${(p.t + H - p.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="7.5" fill="#9fb0c0">volume O₂ / cm³</text>
    </svg>
  )
}

export default function PeroxideUI({ onBack }) {
  const {
    peroxide,
    peroxideSetRun,
    peroxideStart,
    peroxideSelectComparison,
    peroxideSetReason,
    peroxideSubmit,
    peroxideResetRun,
  } = useLabStore()
  const run = peroxideRun(peroxide.runId)
  const readings = peroxide.readings[peroxide.runId] ?? []
  const live = peroxide.phase === 'setup' ? 0 : syringeReading(peroxide.runId, peroxide.timeSec)
  const completeCount = Object.values(peroxide.readings).filter((data) => data.at(-1)?.t >= PEROXIDE_MAX_SEC).length

  return (
    <div className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">← Menu</button>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
          9701 kinetics investigation
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div>
          <h2 className="text-sm text-lab-ink font-medium">Catalytic decomposition of H₂O₂</h2>
          <p className="text-[11px] text-lab-muted mt-1 leading-relaxed">
            2H₂O₂(aq) → 2H₂O(l) + O₂(g). Collect oxygen continuously and compare
            initial gradients while changing one variable at a time.
          </p>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">1 · Choose a fair-test run</label>
          <div className="grid grid-cols-3 gap-1">
            {PEROXIDE_RUNS.map((item) => {
              const done = peroxide.readings[item.id]?.at(-1)?.t >= PEROXIDE_MAX_SEC
              return (
                <button
                  key={item.id}
                  data-testid={`peroxide-run-${item.id}`}
                  onClick={() => peroxideSetRun(item.id)}
                  disabled={peroxide.phase === 'running'}
                  className={`px-1.5 py-1.5 rounded-lg border text-[10px] ${
                    peroxide.runId === item.id
                      ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                      : 'border-lab-border text-lab-muted'
                  } disabled:opacity-40`}
                >
                  {done ? '✓ ' : ''}{item.label}
                </button>
              )
            })}
          </div>
          <p data-testid="peroxide-conditions" className="text-[10px] text-lab-muted mt-1 leading-relaxed">
            {PEROXIDE_VOLUME_CM3.toFixed(1)} cm³ · {run.concentration.toFixed(2)} mol dm⁻³ H₂O₂ · {run.temperature} °C ·{' '}
            {run.catalyst === 'none' ? 'no catalyst' : `${run.catalystMass.toFixed(2)} g MnO₂ ${run.catalystForm}`}
          </p>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">time</span>
              <span data-testid="peroxide-time" className="font-mono text-xs text-lab-ink">{Math.round(peroxide.timeSec)} s</span>
            </div>
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">oxygen</span>
              <span data-testid="peroxide-volume" className="font-mono text-xs text-lab-ink">{live.toFixed(1)} cm³</span>
            </div>
            <div className="rounded-lg border border-lab-border px-2 py-1.5">
              <span className="block text-[9px] text-lab-muted uppercase">initial rate</span>
              <span className="font-mono text-xs text-lab-ink">{initialRate(run.id).toFixed(2)} cm³ s⁻¹</span>
            </div>
          </div>
          <button
            data-testid="peroxide-start"
            onClick={peroxideStart}
            disabled={peroxide.phase !== 'setup'}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${
              peroxide.phase === 'setup'
                ? 'border-lab-accent/50 text-lab-accent bg-lab-accent/10'
                : peroxide.phase === 'running'
                  ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                  : 'border-emerald-700/50 text-emerald-300 bg-emerald-900/10'
            }`}
          >
            {peroxide.phase === 'setup'
              ? run.catalyst === 'none'
                ? '▶ Bung immediately + start clock'
                : '▶ Drop catalyst, bung immediately + start clock'
              : peroxide.phase === 'running'
                ? '● Collecting readings every 20 s…'
                : '✓ 180 s run complete'}
          </button>
          {peroxide.phase === 'complete' && (
            <button data-testid="peroxide-reset-run" onClick={peroxideResetRun} className="mt-1 text-[10px] text-lab-muted underline">
              Repeat this run
            </button>
          )}
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-lab-muted mb-1">
            <span>Continuous readings</span>
            <span data-testid="peroxide-reading-count">{readings.length}/10</span>
          </div>
          <KineticsGraph readings={peroxide.readings} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {Object.entries(peroxide.readings).filter(([, data]) => data.length > 1).map(([id]) => (
              <span key={id} className="text-[9px] text-lab-muted flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[id] }} />
                {peroxideRun(id).label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-lab-muted block mb-1">2 · Compare with the control</label>
          <p className="text-[10px] text-lab-muted mb-1">
            Complete the control plus another run, then choose the faster initial gradient and why.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {['high-conc', 'warm'].map((id) => (
              <button
                key={id}
                data-testid={`peroxide-compare-${id}`}
                onClick={() => peroxideSelectComparison(id)}
                className={`px-2 py-2 rounded-lg border text-xs ${
                  peroxide.selectedComparison === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted'
                }`}
              >
                {peroxideRun(id).label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-1 mt-2">
            {[
              ['collisions', 'Higher concentration → more frequent successful collisions'],
              ['energy', 'Higher temperature → more particles exceed activation energy'],
              ['surface', 'Powder gives more catalyst surface area than granules'],
            ].map(([id, label]) => (
              <button
                key={id}
                data-testid={`peroxide-reason-${id}`}
                onClick={() => peroxideSetReason(id)}
                className={`px-2 py-1.5 rounded-lg border text-[10px] text-left ${
                  peroxide.reason === id
                    ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                    : 'border-lab-border text-lab-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            data-testid="peroxide-submit"
            onClick={peroxideSubmit}
            disabled={completeCount < 2 || !peroxide.reason}
            className="mt-2 px-3 py-2 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 text-xs disabled:opacity-40"
          >
            Check conclusion
          </button>
          {peroxide.result && (
            <div
              data-testid="peroxide-result"
              data-score={peroxide.result.total}
              data-ok={peroxide.result.ok ? '1' : '0'}
              className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                peroxide.result.ok
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              }`}
            >
              <div className="font-medium">{peroxide.result.total}/3 investigation marks</div>
              {peroxide.result.ok
                ? `${peroxide.result.chosen} has the steeper initial gradient (${peroxide.result.chosenRate.toFixed(2)} vs ${peroxide.result.controlRate.toFixed(2)} cm³ s⁻¹); your collision explanation matches the changed variable.`
                : 'Use complete curves, compare the initial gradients, and link the reason to the one variable changed.'}
            </div>
          )}
        </div>

        <p className="text-[10px] text-lab-muted/70 leading-relaxed">
          Safety: eye protection; dilute H₂O₂ is an irritant and oxygen supports combustion.
          Avoid inhaling MnO₂ powder and keep flames away. Never seal stored peroxide without a vent.
        </p>
      </div>
    </div>
  )
}
