import { useState, useCallback } from 'react'
import BuretteScale from './BuretteScale.jsx'

// Meniscus-reading practice — core Paper 3 skill: read a burette to the
// nearest 0.05 cm³ at the BOTTOM of the meniscus, eye level with the scale.
// Self-contained; never touches the live titration state.

const randTarget = () => Math.floor(Math.random() * 961 + 20) * 0.05 // 1.00–49.00


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

  return (
    <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-lab-muted uppercase tracking-wider">Meniscus practice</p>
        <p className="text-[10px] text-lab-muted font-mono" data-testid="meniscus-score">
          {score.right}/{score.tries}
        </p>
      </div>

      <BuretteScale value={target} testid="meniscus-svg" showTarget />

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
