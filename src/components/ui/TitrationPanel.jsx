import { useLabStore } from '../../store/labStore'
import { meanTitre, calcEndpointVolume } from '../../lib/chemistry/titration'

export function TitrationPanel() {
  const {
    titration, preset, presets,
    setPreset, fillPipette, fillFlask,
    addIndicator, setDripping, recordReading,
    resetTitration, clearReadings, setToast, getPreset,
  } = useLabStore()

  const p = getPreset()
  const mean = meanTitre(titration.readings)
  const theoretical = calcEndpointVolume({ preset, analyte_vol_cm3: 25.00 })

  return (
    <div className="flex flex-col gap-3 text-sm">

      {/* Preset selector */}
      <div>
        <label className="text-xs text-lab-muted uppercase tracking-wider block mb-1">Past Paper Preset</label>
        <select
          value={preset}
          onChange={e => { setPreset(e.target.value); resetTitration() }}
          className="w-full bg-lab-panel border border-lab-border rounded-md px-3 py-2 text-lab-text text-sm"
        >
          {Object.entries(presets).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <p className="text-xs text-lab-muted mt-1">{p?.note}</p>
      </div>

      {/* Titrant info */}
      <div className="bg-lab-bg rounded-md p-3 border border-lab-border">
        <div className="text-xs text-lab-muted mb-1">Burette — {p?.titrant.label}</div>
        <div className="font-mono text-lg text-lab-accent">{titration.buretteVolume.toFixed(2)} cm³ remaining</div>
        <div className="text-xs text-lab-muted">Dispensed: {titration.dispensed.toFixed(2)} cm³</div>
      </div>

      {/* Step-by-step procedure */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-lab-muted uppercase tracking-wider">Procedure</p>

        <button
          className={`btn-action ${titration.pipetteFilled ? 'primary' : ''}`}
          onClick={() => { fillPipette(); setToast('Pipette filled — 25.00 cm³') }}
          disabled={titration.pipetteFilled}
        >
          {titration.pipetteFilled ? '✓' : '1.'} Fill pipette (25.00 cm³)
        </button>

        <button
          className={`btn-action ${titration.flaskFilled ? 'primary' : ''}`}
          onClick={() => { fillFlask(); setToast('Transferred to conical flask') }}
          disabled={!titration.pipetteFilled || titration.flaskFilled}
        >
          {titration.flaskFilled ? '✓' : '2.'} Transfer to conical flask
        </button>

        <button
          className={`btn-action ${titration.indicatorAdded ? 'primary' : ''}`}
          onClick={() => { addIndicator(); setToast(`${p?.indicator} added`) }}
          disabled={!titration.flaskFilled || titration.indicatorAdded}
        >
          {titration.indicatorAdded ? '✓' : '3.'} Add indicator ({p?.indicator})
        </button>

        <button
          className={`btn-action ${titration.dripping ? 'warn' : 'primary'}`}
          onClick={() => setDripping(!titration.dripping)}
          disabled={!titration.indicatorAdded || titration.endpointReached}
        >
          {titration.dripping ? '⏸ Stop dripping' : '4. Open stopcock — titrate'}
        </button>

        {titration.endpointReached && (
          <div className="btn-action primary pointer-events-none">
            ✓ Endpoint reached!
          </div>
        )}

        <button
          className="btn-action"
          onClick={() => { recordReading(); setToast('Reading recorded') }}
          disabled={titration.dispensed === 0}
        >
          5. Record burette reading
        </button>

        <button
          className="btn-action warn"
          onClick={() => { resetTitration(); setToast('New titration started') }}
        >
          New titration (keep readings)
        </button>
      </div>

      {/* Readings table */}
      {titration.readings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-lab-muted uppercase tracking-wider">Burette readings</p>
            <button
              className="text-xs text-lab-error hover:text-red-400 underline"
              onClick={clearReadings}
            >clear</button>
          </div>
          <table className="readings-table">
            <thead>
              <tr>
                <th>Trial</th>
                <th>Initial (cm³)</th>
                <th>Final (cm³)</th>
                <th>Titre (cm³)</th>
              </tr>
            </thead>
            <tbody>
              {titration.readings.map(r => (
                <tr key={r.trial}>
                  <td>{r.trial}</td>
                  <td>{r.initial.toFixed(2)}</td>
                  <td>{r.final.toFixed(2)}</td>
                  <td className="text-lab-accent font-mono">{r.titre.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {mean !== null && (
            <div className="mt-2 p-2 bg-lab-bg rounded border border-lab-border text-xs font-mono">
              <div className="text-lab-muted">Mean concordant titre</div>
              <div className="text-lab-accent text-base">{mean.toFixed(2)} cm³</div>
              {theoretical && (
                <div className="text-lab-muted mt-1">
                  Theoretical (paper values): {theoretical.toFixed(2)} cm³
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
