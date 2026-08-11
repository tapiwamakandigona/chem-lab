// Exam-style rate graph for the iodine clock: 1000/t (y) vs [Na2S2O3] (x).
// Paper 3 skill: plot points, draw best-fit line through the origin,
// read the gradient. Pure SVG — no chart library (offline-first, tiny).

const W = 320
const H = 240
const M = { l: 44, r: 12, t: 12, b: 40 } // margins
const PW = W - M.l - M.r
const PH = H - M.t - M.b

function niceMax(v, step) {
  return Math.max(step, Math.ceil(v / step) * step)
}

export default function RateGraph({ results }) {
  const pts = results
    .filter((r) => r.time > 0)
    .map((r) => ({ x: r.conc, y: 1000 / r.time }))

  if (pts.length === 0) return null

  const xMax = niceMax(Math.max(...pts.map((p) => p.x)) * 1.15, 0.02)
  const yMax = niceMax(Math.max(...pts.map((p) => p.y)) * 1.15, 5)

  const sx = (x) => M.l + (x / xMax) * PW
  const sy = (y) => M.t + PH - (y / yMax) * PH

  // Least-squares best fit constrained through the origin: m = Σxy / Σx²
  const m = pts.length >= 2
    ? pts.reduce((s, p) => s + p.x * p.y, 0) / pts.reduce((s, p) => s + p.x * p.x, 0)
    : null

  // Fit line from origin to plot edge (clip to whichever axis it exits)
  let fitEnd = null
  if (m !== null && m > 0) {
    const xEdge = xMax
    const yAtEdge = m * xEdge
    fitEnd = yAtEdge <= yMax
      ? { x: xEdge, y: yAtEdge }
      : { x: yMax / m, y: yMax }
  }

  const xTicks = []
  for (let x = 0; x <= xMax + 1e-9; x += 0.02) xTicks.push(Math.round(x * 100) / 100)
  const yTicks = []
  for (let y = 0; y <= yMax + 1e-9; y += 5) yTicks.push(y)

  return (
    <div className="mb-4">
      <svg
        data-testid="rate-graph"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full bg-lab-bg border border-lab-border rounded"
      >
        {/* gridlines */}
        {xTicks.map((x) => (
          <line key={`gx${x}`} x1={sx(x)} y1={M.t} x2={sx(x)} y2={M.t + PH}
            stroke="currentColor" className="text-lab-border/60" strokeWidth="0.5" />
        ))}
        {yTicks.map((y) => (
          <line key={`gy${y}`} x1={M.l} y1={sy(y)} x2={M.l + PW} y2={sy(y)}
            stroke="currentColor" className="text-lab-border/60" strokeWidth="0.5" />
        ))}

        {/* axes */}
        <line x1={M.l} y1={M.t + PH} x2={M.l + PW} y2={M.t + PH}
          stroke="currentColor" className="text-lab-muted" strokeWidth="1" />
        <line x1={M.l} y1={M.t} x2={M.l} y2={M.t + PH}
          stroke="currentColor" className="text-lab-muted" strokeWidth="1" />

        {/* tick labels */}
        {xTicks.map((x) => (
          <text key={`tx${x}`} x={sx(x)} y={M.t + PH + 12} textAnchor="middle"
            className="fill-current text-lab-muted" fontSize="7" fontFamily="monospace">
            {x.toFixed(2)}
          </text>
        ))}
        {yTicks.map((y) => (
          <text key={`ty${y}`} x={M.l - 5} y={sy(y) + 2.5} textAnchor="end"
            className="fill-current text-lab-muted" fontSize="7" fontFamily="monospace">
            {y}
          </text>
        ))}

        {/* axis titles */}
        <text x={M.l + PW / 2} y={H - 6} textAnchor="middle"
          className="fill-current text-lab-muted" fontSize="8">
          [Na₂S₂O₃] / mol dm⁻³
        </text>
        <text x={12} y={M.t + PH / 2} textAnchor="middle"
          transform={`rotate(-90 12 ${M.t + PH / 2})`}
          className="fill-current text-lab-muted" fontSize="8">
          1000/t / s⁻¹
        </text>

        {/* best-fit line through origin */}
        {fitEnd && (
          <line
            data-testid="rate-fit"
            x1={sx(0)} y1={sy(0)} x2={sx(fitEnd.x)} y2={sy(fitEnd.y)}
            stroke="#63a9e8" strokeWidth="1.2" strokeDasharray="4 3"
          />
        )}

        {/* points — exam-style × marks */}
        {pts.map((p, i) => (
          <g key={i} data-testid="rate-point">
            <line x1={sx(p.x) - 3.5} y1={sy(p.y) - 3.5} x2={sx(p.x) + 3.5} y2={sy(p.y) + 3.5}
              stroke="#f26bb0" strokeWidth="1.4" />
            <line x1={sx(p.x) - 3.5} y1={sy(p.y) + 3.5} x2={sx(p.x) + 3.5} y2={sy(p.y) - 3.5}
              stroke="#f26bb0" strokeWidth="1.4" />
          </g>
        ))}
      </svg>

      {m !== null && (
        <p data-testid="rate-gradient" className="mt-2 text-xs font-mono text-lab-accent">
          gradient = {m.toFixed(1)} (s⁻¹ per mol dm⁻³) — linear through origin ⇒ first order in S₂O₃²⁻
        </p>
      )}
      {m === null && (
        <p className="mt-2 text-xs text-lab-muted">
          Record at least two concentrations to draw the best-fit line and find the gradient.
        </p>
      )}
    </div>
  )
}
