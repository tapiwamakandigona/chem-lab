// Guided-mode step models — pure functions from live store state to an
// ordered checklist. PhET-style scaffolding: the app never blocks free
// exploration, it just shows learners what a good practical sequence is
// and ticks steps off as the real state satisfies them.

import { TITRATION_PRESETS, clockEndpointSec } from '../store.js'

// Each step: { text, done } — the first not-done step is "active".
export function titrationSteps(t) {
  const preset = TITRATION_PRESETS[t.preset]
  const ep = preset?.endpointTitre ?? 25
  const dispensed = t.buretteReading - t.initialReading
  const roughDone =
    dispensed >= ep - 4 || t.endpointReached || t.titreValues.length > 0
  const slowDone =
    dispensed >= ep - 0.5 || t.endpointReached || t.titreValues.length > 0
  const concordant = (() => {
    const v = t.titreValues
    for (let i = 0; i < v.length - 1; i++)
      for (let j = i + 1; j < v.length; j++)
        if (Math.abs(v[i] - v[j]) <= 0.1) return true
    return false
  })()
  return [
    {
      text: 'Note the initial burette reading (bottom of the meniscus)',
      done: dispensed > 0 || t.titreValues.length > 0 || t.endpointReached,
    },
    {
      text: `Run in titrant quickly to ~${Math.max(ep - 4, 0).toFixed(0)} cm³ (rough range)`,
      done: roughDone,
    },
    {
      text: 'Slow to 0.10 cm³ steps as the colour starts to linger',
      done: slowDone,
    },
    {
      text: 'Add dropwise (0.05 cm³) until the first permanent colour change',
      done: t.endpointReached || t.titreValues.length > 0,
    },
    {
      text: 'Read the burette yourself and record the titre',
      done: t.titreValues.length > 0,
    },
    {
      text: 'Repeat until two titres agree within 0.10 cm³ (concordant)',
      done: concordant,
    },
  ]
}

export function clockSteps(c) {
  const done = (conc) => c.results.some((r) => Math.abs(r.conc - conc) < 1e-9)
  const anyRun = c.phase !== 'setup' || c.results.length > 0
  return [
    {
      text: 'Choose a thiosulfate concentration and start the reaction',
      done: anyRun,
    },
    {
      text: 'Watch the cross — stop the clock the moment it disappears',
      done: c.results.length > 0,
    },
    {
      text: `Record the time (0.100 M should take ≈${clockEndpointSec(0.1).toFixed(0)} s)`,
      done: done(0.1),
    },
    {
      text: 'Repeat for all five concentrations (0.100 → 0.020 M)',
      done: c.results.length >= 5,
    },
    {
      text: 'Open Calculations: rate = 1000/t, plot rate vs concentration',
      done: c.results.length >= 5,
    },
  ]
}

export function electroSteps(e) {
  const did = (r) => e.measurements.some((m) => m.ref === r)
  return [
    {
      text: 'Connect the unknown half-cell to the Cu²⁺/Cu reference and read E cell',
      done: did('Cu'),
    },
    {
      text: 'Note the polarity — which terminal is the unknown?',
      done: e.measurements.length >= 1,
    },
    {
      text: 'Repeat against the Zn²⁺/Zn reference — one reading can fit two metals',
      done: did('Zn'),
    },
    {
      text: 'Match magnitude AND sign to the Data Booklet E° values',
      done: did('Cu') && did('Zn'),
    },
    {
      text: 'Identify the metal — both measurements must support it (2/2)',
      done: e.result?.ok === true,
    },
  ]
}

export function chromaSteps(c) {
  const complete = c.phase === 'complete'
  const rfCount = Object.values(c.rfEntries || {}).filter((v) => v !== '').length
  return [
    {
      text: 'Choose an unknown and lower the paper into the solvent — spot must sit ABOVE the pool',
      done: c.phase !== 'setup',
    },
    {
      text: 'Keep the lid on and let the solvent rise — stop before it reaches the top',
      done: complete,
    },
    {
      text: 'Measure the solvent front and each spot from the baseline',
      done: complete,
    },
    {
      text: 'Compute Rf = spot distance ÷ front distance for every spot',
      done: complete && rfCount >= 2,
    },
    {
      text: 'Match your Rf values to the reference dyes and identify the mixture (2/2)',
      done: c.result?.ok === true,
    },
  ]
}

export function flameSteps(f) {
  const hasCleanSample = f.observations.some((o) => o.kind === 'sample' && o.clean)
  return [
    {
      text: 'Dip the nichrome loop in dilute HCl to remove the previous sample',
      done: ['acid', 'clean'].includes(f.loop) || (f.loop === 'loaded' && f.sampleClean),
    },
    {
      text: 'Heat the loop in a non-luminous flame until no persistent colour remains',
      done: f.blankClean || f.sampleClean,
    },
    {
      text: 'Load the unknown chloride onto the clean loop',
      done: f.loop === 'loaded' && f.sampleClean,
    },
    {
      text: 'Place the loop in the hottest flame and record the colour',
      done: hasCleanSample,
    },
    {
      text: 'Identify the ion — use cobalt-blue glass if sodium yellow masks a weaker colour',
      done: f.result?.ok === true,
    },
  ]
}

export function organicSteps(o) {
  const did = (id) => o.tests.some((t) => t.test === id)
  return [
    {
      text: 'Add 2,4-DNPH to a fresh portion — an orange precipitate means a carbonyl group',
      done: did('dnph'),
    },
    {
      text: 'Distinguish aldehyde from ketone: warm with Tollens’ or Fehling’s',
      done: did('tollens') || did('fehling'),
    },
    {
      text: 'Warm with acidified dichromate(VI) — green means something was oxidised',
      done: did('dichromate'),
    },
    {
      text: 'Shake with bromine water and add Na₂CO₃(aq) to fresh portions',
      done: did('bromine') && did('na2co3'),
    },
    {
      text: 'Conclude the functional group — your tests must support it (2/2)',
      done: o.result?.ok === true,
    },
  ]
}

export function qualSteps(q) {
  const did = (id) => q.tests.some((t) => t.reagent === id)
  const cationTests = ['naoh_drop', 'naoh_excess', 'nh3_drop', 'nh3_excess', 'naoh_warm']
  const anionTests = ['hcl', 'bacl2', 'agno3']
  return [
    {
      text: 'Add NaOH(aq) dropwise to a fresh portion — note any precipitate and its colour',
      done: did('naoh_drop'),
    },
    {
      text: 'Add NaOH(aq) to excess — does the precipitate dissolve?',
      done: did('naoh_excess'),
    },
    {
      text: 'Repeat with NH₃(aq): dropwise, then to excess',
      done: did('nh3_drop') && did('nh3_excess'),
    },
    {
      text: 'Test for the anion (dilute HCl, BaCl₂, or AgNO₃)',
      done: anionTests.some(did),
    },
    {
      text: 'Record every observation — "no change" is also an observation',
      done: q.tests.length >= 4 && cationTests.some(did) && anionTests.some(did),
    },
    {
      text: 'Identify both ions and check your identification',
      done: (q.result?.total ?? 0) === 2,
    },
  ]
}

export function enthalpySteps(e) {
  return [
    {
      text: 'Record T₁ — steady initial temperature of the water',
      done: e.phase !== 'setup',
    },
    {
      text: 'Tip in the weighed Na₂CO₃ and stir; watch the thermometer',
      done: e.phase === 'running' || e.phase === 'complete',
    },
    {
      text: 'Record T₂ — the maximum temperature reached',
      done: e.phase === 'complete',
    },
    {
      text: 'Open Calculations: q = VcΔT, then ΔH = −q/n (with cooling correction)',
      done: e.phase === 'complete',
    },
  ]
}

export function gravSteps(g) {
  const emptyDone = g.readings.some((r) => r.kind === 'empty')
  const loadedDone = g.readings.some((r) => r.kind === 'loaded')
  const heated = g.readings.filter((r) => r.kind === 'heated')
  const constant =
    heated.length >= 2 &&
    Math.abs(heated[heated.length - 1].mass - heated[heated.length - 2].mass) <= 0.010001
  return [
    { text: 'Weigh the empty crucible + lid and record the mass', done: emptyDone },
    { text: 'Add the hydrated salt and weigh again', done: loadedDone },
    { text: 'Heat strongly, let it cool completely, then re-weigh', done: heated.length >= 1 },
    {
      text: 'Repeat heat-cool-weigh until two masses agree within 0.01 g',
      done: constant,
    },
    { text: 'Use YOUR readings to calculate x in MgSO\u2084\u00b7xH\u2082O', done: g.result?.ok === true },
  ]
}

export function gasSteps(g) {
  const constant = (() => {
    if (g.readings.length < 2) return false
    const a = g.readings[g.readings.length - 1]
    const b = g.readings[g.readings.length - 2]
    return Math.abs(a.v - b.v) <= 0.500001 && a.t - b.t >= 20
  })()
  return [
    { text: 'Add the excess acid and stopper the flask quickly', done: g.phase !== 'setup' },
    { text: 'Record the syringe reading at regular intervals', done: g.readings.length >= 1 },
    { text: 'Keep recording — the readings level off as CO\u2082 stops', done: g.readings.length >= 3 },
    { text: 'Stop when two readings \u226520 s apart agree within 0.5 cm\u00b3', done: constant },
    { text: 'Use YOUR final volume to calculate the % purity', done: g.result?.ok === true },
  ]
}

export function getGuideSteps(experiment, state) {
  if (experiment === 'titration') return titrationSteps(state.titration)
  if (experiment === 'clock') return clockSteps(state.clock)
  if (experiment === 'enthalpy') return enthalpySteps(state.enthalpy)
  if (experiment === 'qual') return qualSteps(state.qual)
  if (experiment === 'organic') return organicSteps(state.organic)
  if (experiment === 'electro') return electroSteps(state.electro)
  if (experiment === 'chroma') return chromaSteps(state.chroma)
  if (experiment === 'flame') return flameSteps(state.flame)
  if (experiment === 'grav') return gravSteps(state.grav)
  if (experiment === 'gas') return gasSteps(state.gas)
  return []
}
