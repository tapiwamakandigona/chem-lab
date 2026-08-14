import { useEffect, useRef, useState } from 'react'
import { useLabStore, TITRATION_PRESETS } from '../store.js'
import MeniscusPractice from './MeniscusPractice.jsx'
import BuretteScale from './BuretteScale.jsx'
import MockPaper from './MockPaper.jsx'
import { TITRATION_PAPER_S22, titrationPaperCtx } from '../lib/marking.js'
import SetupDragControl from './SetupDragControl.jsx'

function ReadingDisplay({ label, value, unit = 'cm³', masked = false }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-lab-muted uppercase tracking-wider">{label}</span>
      <span className="font-mono text-lab-ink text-base">
        {masked ? '?.??' : value.toFixed(2)} <span className="text-lab-muted text-xs">{unit}</span>
      </span>
    </div>
  )
}

export default function TitrationUI({ onBack }) {
  const {
    titration, titrationDispense, titrationReset,
    setTitrationPreset,
    titrationReadInput, titrationReadCheckSubmit, titrationReadReveal,
    titrationSetupMode, titrationSetup,
    setTitrationSetupMode, placeTitrationSetupPart, resetTitrationSetup,
    titrationTapOpen, setTitrationTapOpen,
    titrationCoachSeen, titrationCoachStep, advanceTitrationCoach, dismissTitrationCoach,
  } = useLabStore()
  const dripping = useLabStore((s) => s.dripping)

  // At the endpoint the numeric reading is hidden — the student must read
  // the burette scale themselves before the titre can be recorded.
  const mustRead = titration.endpointReached

  const [showPractice, setShowPractice] = useState(false)
  const [showPaper, setShowPaper] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const resetTimer = useRef(null)
  const preset = TITRATION_PRESETS[titration.preset]
  const titre = Math.round((titration.buretteReading - titration.initialReading) * 20) / 20
  const setupOrder = ['stand', 'clamp', 'burette', 'tile', 'flask']
  const setupReady = !titrationSetupMode || setupOrder.every((part) => titrationSetup[part])
  const nextSetupPart = setupOrder.find((part) => !titrationSetup[part])

  const dispense = (amount) => {
    if (titration.endpointReached || !setupReady) return
    titrationDispense(amount)
  }

  const canDispense = setupReady && !titration.endpointReached && titration.buretteReading < 50
  const stopHold = () => setTitrationTapOpen(false)
  const startHold = (event) => {
    if (!canDispense) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setTitrationTapOpen(true)
  }
  const requestReset = () => {
    if (!resetArmed) {
      setResetArmed(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setResetArmed(false), 4000)
      return
    }
    window.clearTimeout(resetTimer.current)
    setResetArmed(false)
    titrationReset()
  }
  useEffect(() => () => {
    window.clearTimeout(resetTimer.current)
    setTitrationTapOpen(false)
  }, [setTitrationTapOpen])

  // The first run is an actual practice loop, not a passive tooltip:
  // operate the tap, inspect a scale reading, then record it.
  useEffect(() => {
    if (!titrationCoachSeen && titrationCoachStep === 0 && titration.buretteReading >= 0.05) {
      advanceTitrationCoach(1)
    }
  }, [
    advanceTitrationCoach,
    titration.buretteReading,
    titrationCoachSeen,
    titrationCoachStep,
  ])

  const recordCoachReading = () => {
    const entered = Number.parseFloat(titration.readCheck.entered)
    const valid = Number.isFinite(entered)
      && Math.abs(entered * 20 - Math.round(entered * 20)) < 1e-6
      && Math.abs(entered - titration.buretteReading) < 0.001
    if (valid) {
      advanceTitrationCoach(2)
      dismissTitrationCoach()
      return
    }
    titrationReadCheckSubmit()
  }

  // Concordant titres (within 0.10 cm3 of each other)
  const concordant = (() => {
    const vals = titration.titreValues
    if (vals.length < 2) return null
    for (let i = 0; i < vals.length - 1; i++) {
      for (let j = i + 1; j < vals.length; j++) {
        if (Math.abs(vals[i] - vals[j]) <= 0.10) return [vals[i], vals[j]]
      }
    }
    return null
  })()

  const meanTitre = concordant
    ? ((concordant[0] + concordant[1]) / 2).toFixed(2)
    : null

  return (
    <div className="absolute inset-0 pointer-events-none">
      <span data-testid="tip-drip" data-active={dripping ? '1' : '0'} className="hidden" />
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-2 md:px-3 py-2 bg-lab-bg/90 backdrop-blur-sm border-b border-lab-border pointer-events-auto">
        <button
          onClick={onBack}
          className="min-h-11 whitespace-nowrap text-lab-muted hover:text-lab-ink text-xs md:text-sm px-2 rounded-lg border border-transparent hover:border-lab-border"
        >
          ← Menu
        </button>
        <span className="min-w-0 truncate text-center text-lab-ink text-xs font-medium" title={preset.label}>
          {preset.label}
        </span>
        <label className="grid gap-0.5 text-[8px] font-mono tracking-wider text-lab-muted">
          VARIANT
          <select
            aria-label="Titration variant"
            value={titration.preset}
            onChange={(e) => setTitrationPreset(e.target.value)}
            className="min-h-8 max-w-32 text-xs bg-lab-panel border border-lab-border text-lab-ink rounded-md px-2"
          >
            {Object.entries(TITRATION_PRESETS).map(([key, value]) => (
              <option key={key} value={key}>{key.toUpperCase()} · {value.indicator}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          type="button"
          data-testid="setup-mode-toggle"
          aria-pressed={titrationSetupMode}
          onClick={() => setTitrationSetupMode(!titrationSetupMode)}
          className={`min-h-11 px-3 rounded-b-xl border border-t-0 text-[11px] font-medium shadow-lg ${
            titrationSetupMode
              ? 'border-lab-accent/60 bg-[#0c1e35] text-lab-accent'
              : 'border-lab-border bg-lab-panel/95 text-lab-muted hover:text-lab-ink'
          }`}
        >
          {titrationSetupMode ? 'Hands-on setup: ON' : 'Try hands-on setup'}
        </button>
      </div>

      {titrationSetupMode && !setupReady && (
        <>
          <div
            data-testid="setup-drop-zone"
            className="absolute z-10 pointer-events-none left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 grid h-28 w-40 place-items-center rounded-2xl border-2 border-dashed border-lab-accent/70 bg-lab-accent/10 text-center text-[9px] font-mono tracking-wider text-lab-accent shadow-[0_0_40px_rgba(56,189,248,0.18)]"
          >
            ALIGN ON BENCH
          </div>
          <div
            data-testid="setup-panel"
            className="absolute z-20 pointer-events-auto top-[6.1rem] left-1/2 -translate-x-1/2 w-[min(350px,calc(100%-1rem))] rounded-xl border border-lab-accent/35 bg-lab-panel/95 backdrop-blur-sm p-3 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono tracking-wider text-lab-accent">BUILD THE BENCH</p>
                <p className="mt-1 text-[11px] leading-relaxed text-lab-ink">
                  Place each part in a safe order. Drag it into the cyan bench zone,
                  or use Place for keyboard access.
                </p>
              </div>
              <button
                type="button"
                data-testid="setup-reset"
                onClick={resetTitrationSetup}
                className="min-h-11 shrink-0 rounded-lg border border-lab-border px-2 text-[10px] text-lab-muted"
              >
                Reset
              </button>
            </div>
            <ol className="mt-2 grid grid-cols-5 gap-1" aria-label="Titration setup progress">
              {setupOrder.map((part, index) => (
                <li
                  key={part}
                  data-testid={`setup-step-${part}`}
                  data-done={titrationSetup[part] ? '1' : '0'}
                  className={`rounded-md border px-1 py-1.5 text-center text-[8px] uppercase ${
                    titrationSetup[part]
                      ? 'border-lab-success/40 bg-lab-success/10 text-lab-success'
                      : part === nextSetupPart
                        ? 'border-lab-accent/50 bg-lab-accent/10 text-lab-accent'
                        : 'border-lab-border text-lab-muted'
                  }`}
                >
                  {titrationSetup[part] ? '✓ ' : `${index + 1} `}
                  {part}
                </li>
              ))}
            </ol>
            <SetupDragControl
              key={nextSetupPart}
              part={nextSetupPart}
              onPlace={() => placeTitrationSetupPart(nextSetupPart)}
            />
            <button
              type="button"
              data-testid="setup-place-next"
              onClick={() => nextSetupPart && placeTitrationSetupPart(nextSetupPart)}
              className="mt-2 min-h-11 w-full rounded-lg border border-lab-border px-3 text-xs text-lab-muted hover:border-lab-accent/50 hover:text-lab-accent"
            >
              Place {nextSetupPart} without dragging
            </button>
          </div>
        </>
      )}

      {titrationSetupMode && setupReady && (
        <div
          data-testid="setup-ready"
          className="absolute z-20 pointer-events-auto top-[6.1rem] left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg border border-lab-success/40 bg-lab-panel/95 px-3 py-2 text-[11px] text-lab-success"
        >
          <span>✓ Setup valid — burette vertical, flask centred on the white tile.</span>
          <button
            type="button"
            data-testid="setup-ready-reset"
            onClick={resetTitrationSetup}
            className="min-h-11 rounded-md border border-lab-border px-2 text-[10px] text-lab-muted"
          >
            Rebuild
          </button>
        </div>
      )}

      {/* Mobile strip — readings inline, scene stays visible */}
      <div className="md:hidden absolute top-12 left-2 right-2 pointer-events-auto">
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <ReadingDisplay label="Initial" value={titration.initialReading} />
          <ReadingDisplay label="Current" value={titration.buretteReading} masked={mustRead} />
          <ReadingDisplay label="Titre" value={titre} masked={mustRead} />
        </div>
        {concordant && (
          <div className="mt-1 flex items-center justify-end gap-2 pr-1">
            <p className="text-[11px] text-lab-accent font-mono">mean {meanTitre} cm³</p>
            {titration.preset === 's22' && (
              <button
                onClick={() => setShowPaper(true)}
                data-testid="mock-open-mobile"
                className="px-2 py-1 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 text-[11px]"
              >
                📝 Mock paper
              </button>
            )}
          </div>
        )}
        <div className="mt-1 flex justify-end">
          <button
            onClick={() => setShowPractice((s) => !s)}
            data-testid="meniscus-toggle-mobile"
            className="px-2.5 py-1 rounded-lg border border-lab-border bg-lab-panel/90 backdrop-blur-sm text-[11px] text-lab-muted active:text-lab-ink"
          >
            {showPractice ? 'Hide practice' : 'Meniscus practice'}
          </button>
        </div>
      </div>

      {/* Left panel — readings + instructions (desktop) */}
      <div className="hidden md:flex absolute top-12 left-2 bottom-28 w-44 flex-col gap-2 pointer-events-auto overflow-y-auto">
        {/* Burette readings */}
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-3">
          <ReadingDisplay label="Initial reading" value={titration.initialReading} />
          <ReadingDisplay label="Current reading" value={titration.buretteReading} masked={mustRead} />
          <div className="border-t border-lab-border pt-2">
            <ReadingDisplay label="Titre" value={titre} masked={mustRead} />
          </div>
        </div>


        {/* Past titres */}
        {titration.titreValues.length > 0 && (
          <div className="bg-lab-panel/90 border border-lab-border rounded-xl p-3">
            <p className="text-[10px] text-lab-muted uppercase tracking-wider mb-2">Titres (cm³)</p>
            {titration.titreValues.map((v, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-lab-muted">Run {i + 1}</span>
                <span className={`font-mono ${concordant?.includes(v) ? 'text-lab-success' : 'text-lab-ink'}`}>
                  {v.toFixed(2)}
                </span>
              </div>
            ))}
            {concordant && (
              <div className="mt-2 pt-2 border-t border-lab-border">
                <p className="text-[10px] text-lab-muted">Concordant mean</p>
                <p className="font-mono text-lab-accent text-sm">{meanTitre} cm³</p>
                {titration.preset === 's22' && (
                <button
                  onClick={() => setShowPaper(true)}
                  data-testid="mock-open"
                  className="mt-2 w-full py-1.5 rounded-lg border border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20 text-xs"
                >
                  📝 Mock paper
                </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-lab-panel/90 border border-lab-border rounded-xl p-3">
          <p className="text-[10px] text-lab-muted uppercase tracking-wider mb-2">Procedure</p>
          <ol className="space-y-1.5">
            {preset.instructions.map((step, i) => (
              <li key={i} className="text-[10px] text-lab-muted leading-relaxed">
                <span className="text-lab-accent">{i + 1}.</span> {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Right panel — reagent info (desktop) */}
      <div className="hidden md:flex absolute top-12 right-2 bottom-28 w-40 flex-col gap-2 pointer-events-auto overflow-y-auto">
        <div className="bg-lab-panel/90 backdrop-blur-sm border border-lab-border rounded-xl p-3 space-y-2">
          <p className="text-[10px] text-lab-muted uppercase tracking-wider">Reagents</p>
          <div>
            <p className="text-[10px] text-lab-muted">Flask (25.00 cm³)</p>
            <p className="text-[10px] text-lab-ink leading-snug">{preset.acidLabel}</p>
          </div>
          <div>
            <p className="text-[10px] text-lab-muted">Burette</p>
            <p className="text-[10px] text-lab-ink leading-snug">{preset.alkaliLabel}</p>
          </div>
          <div>
            <p className="text-[10px] text-lab-muted">Indicator</p>
            <p className="text-[10px] text-lab-ink">{preset.indicator}</p>
            <p className="text-[10px] text-lab-muted mt-0.5">{preset.endpointColor}</p>
          </div>
        </div>

        <button
          onClick={() => setShowPractice((s) => !s)}
          data-testid="meniscus-toggle"
          className="w-full py-1.5 rounded-xl border border-lab-border bg-lab-panel/90 backdrop-blur-sm text-[11px] text-lab-muted hover:text-lab-ink shrink-0"
        >
          {showPractice ? 'Hide meniscus practice' : 'Practise reading the meniscus'}
        </button>
      </div>

      {/* Endpoint — read the burette yourself (ONE shared instance).
          Numeric reading is masked; the student reads this zoomed scale and
          types the final reading to the nearest 0.05 before recording. */}
      {mustRead && (
        <div
          data-testid="endpoint-read-card"
          className="absolute pointer-events-auto left-1/2 -translate-x-1/2 top-[7.5rem] md:top-16 w-[220px] bg-lab-panel/95 backdrop-blur-sm border border-lab-success/40 rounded-xl p-3 space-y-2 max-h-[70%] overflow-y-auto"
        >
          <p className="text-lab-success text-xs font-medium">✓ Endpoint reached</p>
          <p className="text-[10px] text-lab-muted leading-snug">
            Read the burette: bottom of the meniscus, to the nearest 0.05 cm³.
          </p>
          <BuretteScale value={titration.buretteReading} testid="endpoint-scale" />
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={titration.readCheck.entered}
              onChange={(e) => titrationReadInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && titrationReadCheckSubmit()}
              placeholder="0.00"
              data-testid="burette-read-input"
              className="w-full min-w-0 bg-lab-bg border border-lab-border rounded-lg px-2 py-1.5 font-mono text-sm text-lab-ink placeholder:text-lab-muted/50 focus:border-lab-accent focus:outline-none"
            />
            <button
              onClick={titrationReadCheckSubmit}
              data-testid="burette-read-check"
              className="px-2.5 py-1.5 rounded-lg border border-lab-success/50 text-lab-success bg-lab-success/10 hover:bg-lab-success/20 text-xs font-mono shrink-0"
            >
              Record
            </button>
          </div>
          {titration.readCheck.status === 'wrong' && (
            <p data-testid="burette-read-feedback" className="text-[11px] leading-snug text-lab-warning">
              ✗ Not quite — read the bottom of the meniscus, to the nearest 0.05 cm³. The scale increases downwards.
            </p>
          )}
          {titration.readCheck.attempts >= 3 && (
            <button
              onClick={titrationReadReveal}
              data-testid="burette-read-reveal"
              className="w-full py-1.5 rounded-lg border border-lab-border text-lab-muted hover:text-lab-ink text-xs"
            >
              Show me the reading
            </button>
          )}
        </div>
      )}

      {/* Mock paper overlay — uses the student's OWN concordant results */}
      {showPaper && concordant && titration.preset === 's22' && (
        <MockPaper
          paper={TITRATION_PAPER_S22}
          ctx={titrationPaperCtx(titration.titreValues)}
          onClose={() => setShowPaper(false)}
        />
      )}

      {/* Meniscus practice — one shared instance (mobile + desktop toggles) */}
      {showPractice && (
        <div className="absolute pointer-events-auto right-2 top-[7.5rem] w-[240px] md:top-auto md:bottom-28 md:w-40 max-h-[70%] overflow-y-auto">
          <MeniscusPractice />
        </div>
      )}

      {/* Bottom — one obvious physical control plus precise step controls. */}
      {/* pointer-events-none on the full-width container so side panels (e.g. the
          meniscus trainer) stay clickable; each interactive child re-enables. */}
      <div className="absolute bottom-2 md:bottom-3 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none px-2">
        {/* First-run coach card — in flow above the hold control so it can
            never overlap it at any viewport width. */}
{!titrationCoachSeen && setupReady && !mustRead && (
        <section
          data-testid="titration-first-run"
          aria-label="First titration control"
          className="pointer-events-auto w-[min(330px,calc(100%-1rem))] rounded-xl border border-lab-accent/60 bg-lab-panel/95 p-3 text-center shadow-[0_0_44px_rgba(56,189,248,0.22)]"
        >
          {titrationCoachStep === 0 ? (
            <>
              <p className="text-[9px] font-mono tracking-wider text-lab-accent">FIRST RUN · 1 OF 3</p>
              <h2 className="mt-1 text-sm font-semibold text-lab-ink">Open the burette tap</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-lab-muted">
                Press and hold the cyan control below. Watch the burette reading rise,
                then release to close the stopcock. The blue 3D tap works too.
              </p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-mono tracking-wider text-lab-accent">FIRST RUN · 2 OF 3</p>
              <h2 className="mt-1 text-sm font-semibold text-lab-ink">Read, then record</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-lab-muted">
                Read the bottom of the meniscus. The burette scale increases downwards;
                estimate to the nearest 0.05 cm³.
              </p>
              <BuretteScale value={titration.buretteReading} testid="coach-reading-scale" />
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  aria-label="First-run burette reading"
                  value={titration.readCheck.entered}
                  onChange={(event) => titrationReadInput(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && recordCoachReading()}
                  placeholder="0.00"
                  data-testid="coach-reading-input"
                  className="min-h-11 w-full min-w-0 rounded-lg border border-lab-border bg-lab-bg px-2 font-mono text-sm text-lab-ink focus:border-lab-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={recordCoachReading}
                  data-testid="coach-reading-record"
                  className="min-h-11 shrink-0 rounded-lg border border-lab-success/50 bg-lab-success/10 px-3 text-xs font-mono text-lab-success"
                >
                  Record
                </button>
              </div>
              {titration.readCheck.status === 'wrong' && (
                <p data-testid="coach-reading-feedback" className="mt-1 text-[10px] text-lab-warning">
                  Not quite—read the bottom of the meniscus and enter a 0.05 cm³ value.
                </p>
              )}
            </>
          )}
        </section>
      )}
        <button
          type="button"
          data-testid="titration-hold-control"
          aria-label="Hold to open the burette tap"
          aria-pressed={titrationTapOpen}
          disabled={!canDispense}
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerCancel={stopHold}
          onPointerLeave={(event) => {
            if (event.buttons === 1) stopHold()
          }}
          onKeyDown={(event) => {
            if ((event.key === ' ' || event.key === 'Enter') && !event.repeat && canDispense) {
              event.preventDefault()
              setTitrationTapOpen(true)
            }
          }}
          onKeyUp={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault()
              stopHold()
            }
          }}
          onBlur={stopHold}
          className={`pointer-events-auto relative min-h-12 w-[min(300px,calc(100%-1rem))] overflow-hidden rounded-xl border px-4 text-sm font-semibold tracking-wide transition-colors ${
            titrationTapOpen
              ? 'border-lab-success bg-lab-success text-lab-bg'
              : canDispense
                ? 'border-lab-accent bg-[#0c2740] text-lab-accent shadow-[0_0_24px_rgba(56,189,248,0.18)]'
                : 'border-lab-border bg-lab-panel text-lab-muted opacity-45'
          }`}
        >
          <span className="relative z-10">
            {titrationTapOpen ? 'TAP OPEN · RELEASE TO CLOSE' : 'PRESS & HOLD · OPEN BURETTE TAP'}
          </span>
        </button>
        <div className="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-xl bg-lab-bg/70 p-1">
          {[
            { label: '5 cm³', val: 5 },
            { label: '1 cm³', val: 1 },
            { label: '0.10', val: 0.10 },
            { label: '0.05', val: 0.05 },
          ].map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => dispense(val)}
              data-testid={`titration-step-${String(val).replace('.', '-')}`}
              disabled={!canDispense}
              className={`min-h-11 shrink-0 px-2.5 md:px-3 rounded-lg border text-xs md:text-sm font-mono transition-all active:scale-95
                ${!canDispense
                  ? 'border-lab-border text-lab-muted cursor-not-allowed opacity-40'
                  : 'border-lab-accent/50 text-lab-accent bg-lab-accent/10 hover:bg-lab-accent/20'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={requestReset}
          disabled={!setupReady}
          data-testid="titration-reset"
          className={`pointer-events-auto min-h-11 rounded-lg border px-3 text-xs ${
            resetArmed
              ? 'border-lab-warning bg-lab-warning/10 text-lab-warning'
              : 'border-transparent text-lab-muted hover:border-lab-border hover:text-lab-warning'
          }`}
        >
          {resetArmed ? 'Confirm reset' : 'Reset burette'}
        </button>
      </div>
    </div>
  )
}
