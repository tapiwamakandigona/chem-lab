import { useMemo } from 'react'
import { useLabStore } from '../store.js'
import { hasConcordantPair, IODINE_TARGET_SEC } from '../lib/iodineRate.js'
import CheckResult, { CheckVerb } from './CheckResult.jsx'

const APPEARANCE = {
  brown: 'brown iodine',
  amber: 'amber',
  'pale-yellow': 'pale yellow — add starch now',
  'blue-black': 'blue-black starch complex',
  colourless: 'colourless endpoint',
}

const CRITERION_LABELS = {
  quench: '80 s quench',
  prepare: 'sample preparation + rough titre',
  starch: 'delayed starch technique',
  concordant: 'concordant accurate titres',
  mean: 'selected mean',
  moles: 'thiosulfate and iodine amounts',
  concentration: 'remaining iodine concentration',
  rate: 'initial concentration, rate and units',
  'starch-reason': 'starch explanation',
  'quench-reason': 'quench explanation',
}

function Field({ label, field, value, onChange, placeholder, testid }) {
  return (
    <label className="block text-[10px] text-lab-muted">
      <span className="block mb-1">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder={placeholder}
        data-testid={testid ?? `iodine-answer-${field}`}
        className="w-full min-h-11 rounded-lg border border-lab-border bg-[#0c1e35] px-2.5 py-2 font-mono text-xs text-lab-ink outline-none focus:border-lab-accent"
      />
    </label>
  )
}

export default function IodineRateUI({ onBack }) {
  const {
    iodineRate: x,
    iodineStart,
    iodineQuench,
    iodineRemoveSample,
    iodinePrepare,
    iodineBeginTitration,
    iodineDispense,
    iodineSetTapOpen,
    iodineAddStarch,
    iodineRecordTitre,
    iodineAbortTitration,
    iodineSetAnswer,
    iodineSubmit,
    iodineReset,
  } = useLabStore()
  const pair = useMemo(() => hasConcordantPair(x.titres), [x.titres])
  const inTitration = ['titrating', 'endpoint'].includes(x.phase)
  const canMark = !!pair && x.titres.some((run) => run.kind === 'rough')
  const timeClass =
    x.phase === 'timing' && Math.abs(x.timeSec - IODINE_TARGET_SEC) <= 2
      ? 'text-amber-300'
      : 'text-lab-ink'

  const press = (amount) => {
    iodineSetTapOpen(true)
    iodineDispense(amount)
    iodineSetTapOpen(false)
  }

  return (
    <div
      data-testid="iodine-rate-ui"
      className="absolute left-0 right-0 bottom-0 max-h-[52%] border-t md:left-auto md:top-0 md:right-0 md:bottom-0 md:w-96 md:max-h-none md:border-t-0 md:border-l bg-lab-panel border-lab-border flex flex-col overflow-y-auto pointer-events-auto z-10"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-lab-border shrink-0">
        <button
          onClick={onBack}
          className="min-h-11 text-xs text-lab-muted hover:text-lab-ink px-3 rounded-lg border border-lab-border"
        >
          ← Menu
        </button>
        <span className="text-[10px] px-2 py-1 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
          9701/34/O/N/24 technique
        </span>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        <div>
          <h2 className="text-sm text-lab-ink font-medium">Iodine–propanone rate titration</h2>
          <p className="text-[11px] text-lab-muted mt-1 leading-relaxed">
            Quench a timed aliquot, titrate its residual I₂ with 0.0100 mol dm⁻³
            thiosulfate, then calculate the average rate from your own concordant titres.
          </p>
          <p className="text-[10px] text-lab-muted/80 mt-1 font-mono">
            I₂ + 2S₂O₃²⁻ → 2I⁻ + S₄O₆²⁻
          </p>
        </div>

        <section className="rounded-xl border border-lab-border bg-[#101b29] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[9px] text-lab-muted uppercase tracking-wider">
                1 · Timed reaction
              </span>
              <strong
                data-testid="iodine-time"
                className={`font-mono text-xl ${timeClass}`}
              >
                {x.timeSec.toFixed(1)} s
              </strong>
            </div>
            {x.phase === 'setup' && (
              <button
                data-testid="iodine-start"
                onClick={iodineStart}
                className="min-h-11 px-3 rounded-lg border border-lab-accent/50 bg-lab-accent/10 text-xs text-lab-accent"
              >
                Withdraw sample + start
              </button>
            )}
            {x.phase === 'timing' && (
              <button
                data-testid="iodine-quench"
                onClick={iodineQuench}
                className="min-h-11 px-3 rounded-lg border border-amber-500/50 bg-amber-500/10 text-xs text-amber-300"
              >
                Add NaHCO₃ now
              </button>
            )}
          </div>
          <p data-testid="iodine-quench-status" className="text-[10px] text-lab-muted mt-2">
            {x.quenchTime == null
              ? 'Removing the 25.0 cm³ sample does not stop the acid-catalysed reaction.'
              : `Quenched at ${x.quenchTime.toFixed(1)} s · bicarbonate neutralised the acid catalyst.`}
          </p>
          {x.phase === 'timing' && (
            <p className="mt-1 text-[9px] text-lab-muted/75">
              Clock runs at 16×, then slows to 2× near 80 s for a fair quench.
            </p>
          )}
          {x.phase === 'timing' && x.removedAt === 0 && (
            <button
              data-testid="iodine-remove-only"
              onClick={iodineRemoveSample}
              className="mt-2 min-h-11 px-3 rounded-lg border border-lab-border text-[10px] text-lab-muted"
            >
              Remove sample again (does not quench)
            </button>
          )}
          {x.phase === 'timing' && x.removedAt > 0 && (
            <p data-testid="iodine-removal-warning" className="mt-2 text-[10px] text-amber-300">
              Sample removed at {x.removedAt.toFixed(1)} s—but the timer and reaction continue
              until NaHCO₃ consumes the acid catalyst.
            </p>
          )}
          {x.phase === 'quenched' && (
            <button
              data-testid="iodine-prepare"
              onClick={iodinePrepare}
              className="w-full min-h-11 mt-2 rounded-lg border border-lab-accent/50 bg-lab-accent/10 text-xs text-lab-accent"
            >
              Dilute to 150.0 cm³ + prepare 25.0 cm³ aliquot
            </button>
          )}
        </section>

        {['prepared', 'titrating', 'endpoint'].includes(x.phase) && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[9px] text-lab-muted uppercase tracking-wider">
                  2 · Titration runs
                </span>
                <strong className="text-xs text-lab-ink">
                  {x.titres.length === 0 ? 'Run the rough first' : `${x.titres.length} recorded`}
                </strong>
              </div>
              {!inTitration && (
                <div className="flex gap-1.5">
                  {!x.titres.some((run) => run.kind === 'rough') && (
                    <button
                      data-testid="iodine-begin-rough"
                      onClick={() => iodineBeginTitration('rough')}
                      className="min-h-11 px-3 rounded-lg border border-lab-border text-xs text-lab-ink"
                    >
                      Rough
                    </button>
                  )}
                  <button
                    data-testid="iodine-begin-accurate"
                    onClick={() => iodineBeginTitration('accurate')}
                    className="min-h-11 px-3 rounded-lg border border-lab-accent/50 bg-lab-accent/10 text-xs text-lab-accent"
                  >
                    Accurate
                  </button>
                </div>
              )}
            </div>

            {inTitration && (
              <div className="rounded-xl border border-lab-border bg-[#101b29] p-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[9px] text-lab-muted uppercase">run</span>
                    <b className="text-xs text-lab-ink capitalize">{x.runKind}</b>
                  </div>
                  <div>
                    <span className="block text-[9px] text-lab-muted uppercase">burette</span>
                    <b data-testid="iodine-reading" className="font-mono text-xs text-lab-ink">
                      {x.buretteReading.toFixed(2)} cm³
                    </b>
                  </div>
                  <div>
                    <span className="block text-[9px] text-lab-muted uppercase">starch</span>
                    <b data-testid="iodine-starch-count" className="font-mono text-xs text-lab-ink">
                      {x.starchDrops}/10
                    </b>
                  </div>
                </div>
                <p
                  data-testid="iodine-appearance"
                  className={`rounded-lg border px-2.5 py-2 text-[11px] ${
                    x.appearance === 'blue-black'
                      ? 'border-indigo-400/50 bg-indigo-500/10 text-indigo-200'
                      : x.appearance === 'colourless'
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                        : 'border-amber-400/40 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  Flask: {APPEARANCE[x.appearance]}
                </p>
                {x.starchTiming === 'early' && (
                  <p data-testid="iodine-early-starch-warning" className="text-[10px] text-red-300">
                    Starch was added while iodine was concentrated. The persistent
                    complex now delays the visible endpoint by 0.60 cm³.
                  </p>
                )}

                {x.phase === 'titrating' ? (
                  <>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[['+ 5.00', 5], ['+ 1.00', 1], ['+ 0.05', 0.05]].map(
                        ([label, amount]) => (
                          <button
                            key={label}
                            data-testid={`iodine-dispense-${String(amount).replace('.', '-')}`}
                            onClick={() => press(amount)}
                            className="min-h-11 rounded-lg border border-lab-border bg-[#0c1e35] text-xs text-lab-ink active:bg-lab-accent/20"
                          >
                            {label} cm³
                          </button>
                        ),
                      )}
                    </div>
                    <button
                      data-testid="iodine-add-starch"
                      onClick={() => iodineAddStarch(10)}
                      disabled={x.starchDrops > 0}
                      className="w-full min-h-11 rounded-lg border border-indigo-400/50 bg-indigo-500/10 text-xs text-indigo-200 disabled:opacity-40"
                    >
                      Add 10 drops starch
                    </button>
                    <button
                      data-testid="iodine-abort-run"
                      onClick={iodineAbortTitration}
                      className="text-[10px] text-lab-muted underline"
                    >
                      Discard aliquot and repeat
                    </button>
                  </>
                ) : (
                  <button
                    data-testid="iodine-record-titre"
                    onClick={iodineRecordTitre}
                    className="w-full min-h-11 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-xs text-emerald-200"
                  >
                    Record {x.buretteReading.toFixed(2)} cm³
                  </button>
                )}
              </div>
            )}

            {x.titres.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-lab-border">
                <table className="w-full text-[10px]" data-testid="iodine-titres">
                  <thead className="bg-[#0c1e35] text-lab-muted">
                    <tr>
                      <th className="text-left p-2">Run</th>
                      <th className="text-right p-2">Titre / cm³</th>
                      <th className="text-right p-2">Technique</th>
                    </tr>
                  </thead>
                  <tbody>
                    {x.titres.map((run, index) => (
                      <tr key={`${run.kind}-${index}`} className="border-t border-lab-border">
                        <td className="p-2 text-lab-ink capitalize">{run.kind}</td>
                        <td className="p-2 text-right font-mono text-lab-ink">
                          {run.titre.toFixed(2)}
                        </td>
                        <td className={run.valid ? 'p-2 text-right text-emerald-300' : 'p-2 text-right text-amber-300'}>
                          {run.valid ? 'valid' : run.starchTiming}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p
                  data-testid="iodine-concordance"
                  className={`px-2 py-1.5 border-t border-lab-border ${
                    pair ? 'text-emerald-300' : 'text-lab-muted'
                  }`}
                >
                  {pair
                    ? `Concordant: ${pair[0].titre.toFixed(2)} and ${pair[1].titre.toFixed(2)} cm³`
                    : 'Need two valid accurate titres within 0.10 cm³.'}
                </p>
              </div>
            )}
          </section>
        )}

        {canMark && (
          <section className="space-y-3" data-testid="iodine-calculations">
            <div>
              <span className="block text-[9px] text-lab-muted uppercase tracking-wider">
                3 · Calculate from your titres
              </span>
              <p className="text-[10px] text-lab-muted mt-1">
                Show values to sensible significant figures. Later marks use your
                entered mean, so a carried-forward slip does not erase the chemistry.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Mean / cm³" field="mean" value={x.answers.mean} onChange={iodineSetAnswer} placeholder="26.25" />
              <Field label="n(S₂O₃²⁻) / mol" field="nThio" value={x.answers.nThio} onChange={iodineSetAnswer} placeholder="0.0002625" />
              <Field label="n(I₂) in 150 cm³ / mol" field="nIodine" value={x.answers.nIodine} onChange={iodineSetAnswer} placeholder="0.0007875" />
              <Field label="[I₂] in timed sample / mol dm⁻³" field="concentration" value={x.answers.concentration} onChange={iodineSetAnswer} placeholder="0.0315" />
              <Field label="Initial [I₂] / mol dm⁻³" field="initial" value={x.answers.initial} onChange={iodineSetAnswer} placeholder="0.0500" />
              <Field label="Average rate" field="rate" value={x.answers.rate} onChange={iodineSetAnswer} placeholder="0.000231" />
            </div>
            <Field label="Rate units" field="units" value={x.answers.units} onChange={iodineSetAnswer} placeholder="mol dm⁻³ s⁻¹" />
            <label className="block text-[10px] text-lab-muted">
              <span className="block mb-1">Why add starch only at pale yellow?</span>
              <textarea
                data-testid="iodine-answer-starchReason"
                value={x.answers.starchReason}
                onChange={(event) => iodineSetAnswer('starchReason', event.target.value)}
                className="w-full min-h-20 rounded-lg border border-lab-border bg-[#0c1e35] p-2.5 text-xs text-lab-ink outline-none focus:border-lab-accent"
              />
            </label>
            <label className="block text-[10px] text-lab-muted">
              <span className="block mb-1">Why does NaHCO₃—not sample removal—stop the reaction?</span>
              <textarea
                data-testid="iodine-answer-quenchReason"
                value={x.answers.quenchReason}
                onChange={(event) => iodineSetAnswer('quenchReason', event.target.value)}
                className="w-full min-h-20 rounded-lg border border-lab-border bg-[#0c1e35] p-2.5 text-xs text-lab-ink outline-none focus:border-lab-accent"
              />
            </label>
            <button
              data-testid="iodine-submit"
              onClick={iodineSubmit}
              className="w-full min-h-11 rounded-lg border border-lab-accent/50 bg-lab-accent/10 text-xs font-medium text-lab-accent"
            >
              <CheckVerb practice="Mark practical evidence" />
            </button>

            {x.result && (
              <CheckResult testid="iodine-result" ok={x.result.ok} score={x.result.total}>
                <strong className={x.result.ok ? 'text-emerald-200' : 'text-amber-200'}>
                  {x.result.total}/{x.result.max} practical marks
                </strong>
                <ul className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2">
                  {x.result.criteria.map((item) => (
                    <li key={item.id} className={`text-[9px] ${item.ok ? 'text-emerald-300' : 'text-lab-muted'}`}>
                      {item.ok ? '✓' : '○'} {CRITERION_LABELS[item.id]}
                    </li>
                  ))}
                </ul>
              </CheckResult>
            )}
          </section>
        )}

        <div className="flex items-center justify-between border-t border-lab-border pt-3">
          <p className="max-w-[230px] text-[9px] leading-relaxed text-lab-muted/75">
            Eye protection. Iodine is harmful and stains; sulfuric acid is corrosive.
            Bicarbonate effervescence can foam—add it in a vessel with headroom.
          </p>
          <button
            data-testid="iodine-reset"
            onClick={iodineReset}
            className="min-h-11 px-3 rounded-lg border border-lab-border text-[10px] text-lab-muted"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
