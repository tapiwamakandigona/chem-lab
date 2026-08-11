import { COOLING } from '../store.js'

// Exam-style temperature/time cooling curve with extrapolation back to the
// time of mixing (9701 P3 heat-loss correction). Pure SVG — offline-first.
const W = 320
const H = 240
const ML = 44
const MR = 12
const MT = 12
const MB = 40
const PW = W - ML - MR
const PH = H - MT - MB

export default function CoolingCurve({ analysis, T1 }) {
  if (!analysis) return null
  const { readings, slope, intercept, Textrap } = analysis

  const tMax = COOLING.endT
  const yMin = Math.floor(T1 - 1)
  const yMax = Math.ceil(Textrap + 1)
  const sx = (t) => ML + (t / tMax) * PW
  const sy = (T) => MT + PH - ((T - yMin) / (yMax - yMin)) * PH

  const xTicks = []
  for (let t = 0; t <= tMax; t += 60) xTicks.push(t)
  const yTicks = []
  for (let T = yMin; T <= yMax; T += 2) yTicks.push(T)

  // Extrapolation line: from the last post-mix reading back to t = mixT
  const fitT = (t) => slope * t + intercept
  const lastT = readings[readings.length - 1].t

  return (
    <div className="mb-4">
      <p className="text-xs text-lab-muted mb-2">
        Temperature/time graph — extrapolate the cooling line back to the time
        of mixing (t = {COOLING.mixT} s) to correct for heat loss:
      </p>
      <svg
        data-testid="cooling-curve"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full bg-lab-bg border border-lab-border rounded"
      >
        {/* gridlines */}
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={sx(t)} y1={MT} x2={sx(t)} y2={MT + PH} stroke="#2a3038" strokeWidth="0.5" />
        ))}
        {yTicks.map((T) => (
          <line key={`gy${T}`} x1={ML} y1={sy(T)} x2={ML + PW} y2={sy(T)} stroke="#2a3038" strokeWidth="0.5" />
        ))}
        {/* axes */}
        <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#9aa4b0" strokeWidth="1" />
        <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#9aa4b0" strokeWidth="1" />
        {/* tick labels */}
        {xTicks.map((t) => (
          <text key={`tx${t}`} x={sx(t)} y={MT + PH + 14} fontSize="8" fill="#9aa4b0" textAnchor="middle">{t}</text>
        ))}
        {yTicks.map((T) => (
          <text key={`ty${T}`} x={ML - 5} y={sy(T) + 3} fontSize="8" fill="#9aa4b0" textAnchor="end">{T.toFixed(0)}</text>
        ))}
        <text x={ML + PW / 2} y={H - 6} fontSize="9" fill="#c8d0da" textAnchor="middle">time / s</text>
        <text x={12} y={MT + PH / 2} fontSize="9" fill="#c8d0da" textAnchor="middle" transform={`rotate(-90 12 ${MT + PH / 2})`}>T / °C</text>

        {/* vertical dashed line at time of mixing */}
        <line
          x1={sx(COOLING.mixT)} y1={MT} x2={sx(COOLING.mixT)} y2={MT + PH}
          stroke="#9aa4b0" strokeWidth="0.8" strokeDasharray="3 3"
        />

        {/* extrapolated cooling line back to mixT (dashed segment) */}
        <line
          data-testid="cooling-extrap"
          x1={sx(COOLING.mixT)} y1={sy(fitT(COOLING.mixT))}
          x2={sx(COOLING.mixT + COOLING.interval)} y2={sy(fitT(COOLING.mixT + COOLING.interval))}
          stroke="#f26bb0" strokeWidth="1.2" strokeDasharray="4 3"
        />
        {/* solid cooling fit line over the measured region */}
        <line
          data-testid="cooling-fit"
          x1={sx(COOLING.mixT + COOLING.interval)} y1={sy(fitT(COOLING.mixT + COOLING.interval))}
          x2={sx(lastT)} y2={sy(fitT(lastT))}
          stroke="#63a9e8" strokeWidth="1.2"
        />

        {/* readings as x marks */}
        {readings.filter((r) => r.T != null).map((r) => (
          <g key={r.t} data-testid="cooling-point">
            <line x1={sx(r.t) - 3} y1={sy(r.T) - 3} x2={sx(r.t) + 3} y2={sy(r.T) + 3} stroke="#e8eef5" strokeWidth="1.2" />
            <line x1={sx(r.t) - 3} y1={sy(r.T) + 3} x2={sx(r.t) + 3} y2={sy(r.T) - 3} stroke="#e8eef5" strokeWidth="1.2" />
          </g>
        ))}

        {/* extrapolated temperature marker */}
        <circle cx={sx(COOLING.mixT)} cy={sy(Textrap)} r="3" fill="none" stroke="#f26bb0" strokeWidth="1.2" />
        <text
          data-testid="cooling-textrap"
          x={sx(COOLING.mixT) + 6} y={sy(Textrap) - 5}
          fontSize="9" fill="#f26bb0" fontWeight="bold"
        >
          T = {Textrap.toFixed(1)} °C
        </text>
      </svg>
    </div>
  )
}
