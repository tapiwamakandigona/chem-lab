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

export function getGuideSteps(experiment, state) {
  if (experiment === 'titration') return titrationSteps(state.titration)
  if (experiment === 'clock') return clockSteps(state.clock)
  if (experiment === 'enthalpy') return enthalpySteps(state.enthalpy)
  if (experiment === 'qual') return qualSteps(state.qual)
  return []
}
