import { useRef, useEffect, useState } from 'react'
import { useLabStore } from '../store.js'
import CalcSheet from './CalcSheet.jsx'

const CONCS = [0.100, 0.080, 0.060, 0.040, 0.020]

export default function ClockUI({ onBack }) {
  const { clock, clockStart, clockStop, clockReset, clockRecordResult, setClockConc } = useLabStore()
  const intervalRef = useRef(null)
  const [displayMs, setDisplayMs] = useState(0)
  const [showCalc, setShowCalc] = useState(false)

  // Local timer that drives the display
  useEffect(() => {
    if (clock.phase === 'running') {
      const start = Date.now() - displayMs
      intervalRef.current = setInterval(() => {
        setDisplayMs(Date.now() - start)
      }, 100)
    } else {
      clearInterval(intervalRef.current)
      if (clock.phase === 'setup') setDisplayMs(0)
    }
    return () => clearInterval(intervalRef.current)
  }, [clock.phase])

  function handleStart() {
    setDisplayMs(0)
    clockStart()
  }

  function handleStop() {
    clearInterval(intervalRef.current)
    // Record result using the local displayMs
    const timeSec = displayMs / 1000
    clockRecordResult(clock.currentConc, displayMs)
    clockStop()
  }

  function handleReset() {
    clearInterval(intervalRef.current)
    setDisplayMs(0)
    clockReset()
  }

  const timeSec = displayMs / 1000

  return (
    <>
      <div className="absolute inset-0 pointer-events-none" />
      <div className="absolute top-0 right-0 bottom-0 w-80 bg-lab-panel border-l border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
          <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
            ← Menu
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701/31/M/J/23</span>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5">
          {/* Timer */}
          <div className="text-center">
            <div className="text-5xl font-mono font-bold text-lab-ink tracking-tight">
              {timeSec.toFixed(1)}<span className="text-xl text-lab-muted ml-1">s</span>
            </div>
            <div className="text-xs text-lab-muted mt-1">
              {clock.phase === 'running' ? 'Running…' : clock.phase === 'complete' ? 'Stopped' : 'Ready'}
            </div>
          </div>

          {/* Concentration selector */}
          <div>
            <p className="text-xs text-lab-muted mb-2">Na₂S₂O₃ concentration (mol dm⁻³)</p>
            <div className="flex flex-wrap gap-1.5">
              {CONCS.map((c) => (
                <button
                  key={c}
                  onClick={() => setClockConc(c)}
                  disabled={clock.phase === 'running'}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${
                    clock.currentConc === c
                      ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                      : 'border-lab-border text-lab-muted hover:border-lab-muted'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {c.toFixed(3)}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {clock.phase !== 'running' ? (
              <button
                onClick={handleStart}
                className="flex-1 py-2 rounded bg-lab-accent text-white text-sm font-medium hover:opacity-90 active:scale-[0.98]"
              >
                ▶ Start
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex-1 py-2 rounded bg-red-500/80 text-white text-sm font-medium hover:opacity-90 active:scale-[0.98]"
              >
                ■ Stop
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded border border-lab-border text-lab-muted text-sm hover:text-lab-ink"
            >
              Reset
            </button>
          </div>

          {/* Results table */}
          {clock.results.length > 0 && (
            <div>
              <p className="text-xs text-lab-muted mb-2">Results</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-lab-muted border-b border-lab-border">
                    <th className="text-left pb-1">[Na₂S₂O₃]</th>
                    <th className="text-right pb-1">Time (s)</th>
                    <th className="text-right pb-1">1000/t</th>
                  </tr>
                </thead>
                <tbody>
                  {clock.results.map((r, i) => (
                    <tr key={i} className="border-b border-lab-border/40">
                      <td className="py-1 text-lab-ink font-mono">{r.conc.toFixed(3)}</td>
                      <td className="py-1 text-right text-lab-ink font-mono">{r.time.toFixed(1)}</td>
                      <td className="py-1 text-right text-lab-success font-mono">
                        {r.time > 0 ? (1000 / r.time).toFixed(2) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Show calc button */}
          {clock.results.length > 0 && (
            <button
              onClick={() => setShowCalc(true)}
              className="w-full py-2 rounded border border-lab-accent/40 text-lab-accent text-xs hover:bg-lab-accent/10"
            >
              Show Calculations
            </button>
          )}
        </div>
      </div>

      {showCalc && <CalcSheet experiment="clock" onClose={() => setShowCalc(false)} />}
    </>
  )
}
