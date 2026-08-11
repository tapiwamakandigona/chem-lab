import { useState, useCallback } from 'react'

// Meniscus-reading practice — core Paper 3 skill: read a burette to the
// nearest 0.05 cm³ at the BOTTOM of the meniscus, eye level with the scale.
// Self-contained; never touches the live titration state.

const randTarget = () => Math.floor(Math.random() * 961 + 20) * 0.05 // 1.00–49.00

// SVG geometry
const W = 150
const H = 190
const PX_PER_CM3 = 140 // zoom factor: 1 cm³ of scale = 140 px
const TUBE_L = 46
const TUBE_R = 104

export default function MeniscusPractice() {
  const [target, setTarget] = useState(randTarget)
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null) // {ok, msg}
  const [score, setScore] = useState({ right: 0, tries: 0 })

  const newReading = useCallback(() => {
    setTarget(randTarget())
    setInput('')
    setResult(null)
  }, [])

  const check = () => {
    const v = parseFloat(input)
    if (Number.isNaN(v)) {
      setResult({ ok: false, msg: 'Enter a number, e.g. 23.85' })
      return
    }
    const diff = Math.abs(v - target)
    let ok = false
    let msg
    if (diff < 0.001) {
      ok = true
      msg = `Correct — ${target.toFixed(2)} cm³`
    } else if (diff <= 0.051) {
      msg = 'Close — read the bottom of the meniscus, to the nearest 0.05'
    } else if (v < target) {
      msg = 'Too low — remember the scale increases downwards'
    } else {
      msg = 'Too high — remember the scale increases downwards'
    }
    setResult({ ok, msg })
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), tries: s.tries + 1 }))
  }

  // Window of scale shown: target near centre, ±~0.65 cm³
  const vTop = target - (H / 2) / PX_PER_CM3
  const vToY = (v) => (v - vTop) * PX_PER_CM3
  const menY = vToY(target)

  // Tick marks every 0.1, half-height every 0.5, labelled every 1
  const ticks = []
  const first = Math.ceil(vTop * 10) / 10
  for (let v = first; vToY(v) < H; v = Math.round((v + 0.1) * 10) / 10) {
    if (v < 0 || v > 50) continue
    const y = vToY(v)
    const whole = Math.abs(v - Math.round(v)) < 0.001
    const half = Math.abs(v * 2 - Math.round(v * 2)) < 0.001
    ticks.push({ y, v, len: whole ? 26 : half ? 18 : 11, whole })
  }

  return (
    <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-lab-muted uppercase tracking-wider">Meniscus practice</p>
        <p className="text-[10px] text-lab-muted font-mono" data-testid="meniscus-score">
          {score.right}/{score.tries}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg bg-[#eef3f8]"
        data-target={target.toFixed(2)}
        data-testid="meniscus-svg"
      >
        {/* liquid below the meniscus (scale increases downwards) */}
        <path
          d={`M ${TUBE_L} ${menY - 7} Q ${(TUBE_L + TUBE_R) / 2} ${menY + 7} ${TUBE_R} ${menY - 7} L ${TUBE_R} ${H} L ${TUBE_L} ${H} Z`}
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
        <line x1={TUBE_L} y1="0" x2={TUBE_L} y2={H} stroke="#8fa3b5" strokeWidth="2" />
        <line x1={TUBE_R} y1="0" x2={TUBE_R} y2={H} stroke="#8fa3b5" strokeWidth="2" />
        {/* graduations (on the left wall, like a real burette) */}
        {ticks.map(({ y, v, len, whole }) => (
          <g key={v}>
            <line x1={TUBE_L} y1={y} x2={TUBE_L + len} y2={y} stroke="#3d5468" strokeWidth={whole ? 1.6 : 1} />
            {whole && (
              <text x={TUBE_L + len + 4} y={y + 4} fontSize="12" fontFamily="JetBrains Mono, monospace" fill="#26394a">
                {Math.round(v)}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder="0.00"
          data-testid="meniscus-input"
          className="w-full min-w-0 bg-lab-bg border border-lab-border rounded-lg px-2 py-1.5 font-mono text-sm text-lab-ink placeholder:text-lab-muted/50 focus:border-lab-accent focus:outline-none"
        />
        <button
          onClick={check}
          data-testid="meniscus-check"
          className="px-2.5 py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs font-mono shrink-0"
        >
          Check
        </button>
      </div>

      {result && (
        <p
          data-testid="meniscus-result"
          className={`text-[11px] leading-snug ${result.ok ? 'text-emerald-400' : 'text-lab-warning'}`}
        >
          {result.msg}
        </p>
      )}
      {result?.ok && (
        <button
          onClick={newReading}
          data-testid="meniscus-new"
          className="w-full py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
        >
          New reading
        </button>
      )}
    </div>
  )
}
