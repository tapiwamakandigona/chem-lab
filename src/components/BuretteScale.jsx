// Zoomed burette-scale window with meniscus at `value` cm³.
// Shared by MeniscusPractice (random targets) and the endpoint
// read-the-burette check in TitrationUI (live reading).
// Pure presentational SVG — no state.

export const SCALE_W = 150
export const SCALE_H = 190
const PX_PER_CM3 = 140 // zoom: 1 cm³ of scale = 140 px
const TUBE_L = 46
const TUBE_R = 104

export default function BuretteScale({ value, testid = 'burette-scale', showTarget = false }) {
  const vTop = value - SCALE_H / 2 / PX_PER_CM3
  const vToY = (v) => (v - vTop) * PX_PER_CM3
  const menY = vToY(value)

  // Tick marks every 0.1, half-height every 0.5, labelled every 1
  const ticks = []
  const first = Math.ceil(vTop * 10) / 10
  for (let v = first; vToY(v) < SCALE_H; v = Math.round((v + 0.1) * 10) / 10) {
    if (v < 0 || v > 50) continue
    const y = vToY(v)
    const whole = Math.abs(v - Math.round(v)) < 0.001
    const half = Math.abs(v * 2 - Math.round(v * 2)) < 0.001
    ticks.push({ y, v, len: whole ? 26 : half ? 18 : 11, whole })
  }

  return (
    <svg
      viewBox={`0 0 ${SCALE_W} ${SCALE_H}`}
      className="w-full rounded-lg bg-[#eef3f8]"
      data-testid={testid}
      {...(showTarget ? { 'data-target': value.toFixed(2) } : {})}
    >
      {/* liquid below the meniscus (scale increases downwards) */}
      <path
        d={`M ${TUBE_L} ${menY - 7} Q ${(TUBE_L + TUBE_R) / 2} ${menY + 7} ${TUBE_R} ${menY - 7} L ${TUBE_R} ${SCALE_H} L ${TUBE_L} ${SCALE_H} Z`}
        fill="#b7d9f2"
        opacity="0.9"
      />
      {/* meniscus curve */}
      <path
        d={`M ${TUBE_L} ${menY - 7} Q ${(TUBE_L + TUBE_R) / 2} ${menY + 7} ${TUBE_R} ${menY - 7}`}
        fill="none"
        stroke="#5b93bd"
        strokeWidth="1.6"
      />
      {/* tube walls */}
      <line x1={TUBE_L} y1="0" x2={TUBE_L} y2={SCALE_H} stroke="#8fa3b5" strokeWidth="2" />
      <line x1={TUBE_R} y1="0" x2={TUBE_R} y2={SCALE_H} stroke="#8fa3b5" strokeWidth="2" />
      {/* graduations (on the left wall, like a real burette) */}
      {ticks.map(({ y, v, len, whole }) => (
        <g key={v}>
          <line x1={TUBE_L} y1={y} x2={TUBE_L + len} y2={y} stroke="#3d5468" strokeWidth={whole ? 1.6 : 1} />
          {whole && (
            <text
              x={TUBE_L + len + 4}
              y={y + 4}
              fontSize="12"
              fontFamily="JetBrains Mono, monospace"
              fill="#26394a"
            >
              {Math.round(v)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}
