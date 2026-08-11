import { useState, useEffect, useRef } from 'react'
import { useLabStore, getEnthalpyCalc } from '../store.js'
import CalcSheet from './CalcSheet.jsx'

export default function EnthalpyUI({ onBack }) {
  const {
    enthalpy, setEnthalpyMass, setEnthalpyVolume, setEnthalpyT1,
    enthalpyStart, enthalpyReset, enthalpyTickT2, enthalpyComplete
  } = useLabStore()

  const [localT2, setLocalT2] = useState(enthalpy.T1)
  const [showCalc, setShowCalc] = useState(false)
  const animRef = useRef(null)

  // Animate T2 when running
  useEffect(() => {
    if (enthalpy.phase === 'running') {
      const startT = enthalpy.T1
      const endT = enthalpy.targetT2
      const duration = 5000
      const startTime = Date.now()
      animRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime
        const t = Math.min(elapsed / duration, 1)
        const cur = startT + (endT - startT) * t
        setLocalT2(cur)
        enthalpyTickT2(cur)
        if (t >= 1) {
          clearInterval(animRef.current)
          enthalpyComplete()
        }
      }, 100)
    } else {
      clearInterval(animRef.current)
    }
    return () => clearInterval(animRef.current)
    // T1/targetT2 are read once at run start by design; only phase restarts the anim
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enthalpy.phase])

  function handleReset() {
    clearInterval(animRef.current)
    enthalpyReset()
    setLocalT2(enthalpy.T1)
  }

  const calc = getEnthalpyCalc({ ...enthalpy, T2: localT2 })

  return (
    <>
      <div className="absolute top-0 right-0 bottom-0 w-80 bg-lab-panel border-l border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
          <button onClick={onBack} className="text-xs text-lab-muted hover:text-lab-ink px-2 py-1 rounded border border-lab-border">
            ← Menu
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">9701/31/M/J/20</span>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4">
          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-lab-muted block mb-1">Mass of Na₂CO₃ (g)</label>
              <input
                type="number"
                value={enthalpy.mass}
                step="0.01"
                onChange={(e) => setEnthalpyMass(parseFloat(e.target.value) || 0)}
                disabled={enthalpy.phase === 'running'}
                className="w-full bg-lab-bg border border-lab-border rounded px-3 py-1.5 text-lab-ink text-sm font-mono focus:outline-none focus:border-lab-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-lab-muted block mb-1">Volume of water (cm³)</label>
              <input
                type="number"
                value={enthalpy.volume}
                step="0.5"
                onChange={(e) => setEnthalpyVolume(parseFloat(e.target.value) || 0)}
                disabled={enthalpy.phase === 'running'}
                className="w-full bg-lab-bg border border-lab-border rounded px-3 py-1.5 text-lab-ink text-sm font-mono focus:outline-none focus:border-lab-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-lab-muted block mb-1">T₁ — Initial temperature (°C)</label>
              <input
                type="number"
                value={enthalpy.T1}
                step="0.1"
                onChange={(e) => { const v = parseFloat(e.target.value) || 0; setEnthalpyT1(v); if (enthalpy.phase === 'setup') setLocalT2(v) }}
                disabled={enthalpy.phase === 'running'}
                className="w-full bg-lab-bg border border-lab-border rounded px-3 py-1.5 text-lab-ink text-sm font-mono focus:outline-none focus:border-lab-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs text-lab-muted block mb-1">T₂ — Final temperature (°C)</label>
              <div className={`w-full bg-lab-bg border rounded px-3 py-1.5 text-sm font-mono font-bold ${
                localT2 > enthalpy.T1 ? 'text-red-400 border-red-400/40' : 'text-lab-ink border-lab-border'
              }`}>
                {localT2.toFixed(1)}
                {enthalpy.phase === 'running' && <span className="text-xs text-lab-muted ml-2 font-normal animate-pulse">rising…</span>}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {enthalpy.phase !== 'running' ? (
              <button
                onClick={enthalpyStart}
                disabled={enthalpy.phase === 'running'}
                className="flex-1 py-2 rounded bg-lab-accent text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                ▶ Add Na₂CO₃
              </button>
            ) : (
              <button disabled className="flex-1 py-2 rounded bg-lab-accent/40 text-white text-sm font-medium opacity-50 cursor-not-allowed">
                Running…
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-2 rounded border border-lab-border text-lab-muted text-sm hover:text-lab-ink"
            >
              Reset
            </button>
          </div>

          {/* Live calculation panel */}
          <div className="bg-lab-bg border border-lab-border rounded-lg p-3 space-y-2 font-mono text-xs">
            <p className="text-lab-muted text-[10px] uppercase tracking-wide mb-2">Live Calculations</p>
            <div className="space-y-1.5 text-lab-ink">
              <div>
                <span className="text-lab-muted">ΔT = T₂ − T₁</span>
                <span className="ml-2 text-lab-success">= {calc.deltaT.toFixed(1)} °C</span>
              </div>
              <div>
                <span className="text-lab-muted">q = V × c × ΔT</span>
                <div className="ml-2 text-lab-ink">
                  = {enthalpy.volume.toFixed(1)} × 4.2 × {calc.deltaT.toFixed(1)}
                </div>
                <div className="ml-2 text-lab-success">= {calc.q.toFixed(1)} J</div>
              </div>
              <div>
                <span className="text-lab-muted">n(Na₂CO₃) = mass / 106</span>
                <div className="ml-2 text-lab-ink">= {enthalpy.mass.toFixed(2)} / 106</div>
                <div className="ml-2 text-lab-success">= {calc.moles.toFixed(4)} mol</div>
              </div>
              <div>
                <span className="text-lab-muted">ΔH = −q / n</span>
                <div className="ml-2 text-lab-ink">= −{calc.q.toFixed(1)} / {calc.moles.toFixed(4)}</div>
                <div className="ml-2 text-lab-success font-bold">
                  = {(calc.deltaHkJ * 1000).toFixed(0)} J mol⁻¹
                </div>
                <div className="ml-2 text-lab-accent font-bold">
                  = {calc.deltaHkJ.toFixed(1)} kJ mol⁻¹
                </div>
              </div>
            </div>
          </div>

          {/* Show calc button */}
          {(enthalpy.phase === 'complete' || calc.deltaT !== 0) && (
            <button
              onClick={() => setShowCalc(true)}
              className="w-full py-2 rounded border border-lab-accent/40 text-lab-accent text-xs hover:bg-lab-accent/10"
            >
              Show Calculations
            </button>
          )}
        </div>
      </div>

      {showCalc && <CalcSheet experiment="enthalpy" onClose={() => setShowCalc(false)} />}
    </>
  )
}
