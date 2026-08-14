// Test mode — the learner works with no live coaching, mistakes included,
// and gets an examiner-style marked report at hand-in. Marking reuses the
// same pure guide-step predicates that drive guided mode, so practice and
// test judge exactly the same technique. Corrections are written like a
// teacher's margin note: what went wrong and what the correct move is.

import { getGuideSteps } from './guides.js'

const RESULTS_KEY = 'chemlab-test-results-v1'

// One correction line per guide step, same order as the step arrays in
// guides.js. Shown only for steps the learner missed.
export const TEST_CORRECTIONS = {
  titration: [
    'Always note the initial reading before dispensing — a titre is a difference of two readings, not one.',
    'Run in quickly only for the rough range; you cannot claim accuracy without knowing roughly where the endpoint is.',
    'Near the endpoint, big additions overshoot: slow to 0.10 cm³ steps as soon as the colour starts to linger.',
    'The endpoint is the FIRST permanent colour change — approach it dropwise (0.05 cm³) or you will overshoot.',
    'Record the titre from the burette scale yourself, to the nearest 0.05 cm³, reading the bottom of the meniscus.',
    'One titre is never enough: repeat until two agree within 0.10 cm³ — only concordant titres are averaged.',
  ],
  clock: [
    'Start with a definite concentration choice — the experiment is a series, not a single run.',
    'The clock stops when the cross disappears; looking away is how anomalous times happen.',
    'Record the time immediately, with the concentration it belongs to.',
    'Five concentrations are needed for a trend — two points cannot show proportionality.',
    'Convert times to rates (1000/t) and plot rate against concentration to read the order.',
  ],
  enthalpy: [
    'T₁ must be a steady starting temperature — record it before anything is added.',
    'Add the weighed solid in one go and stir, or the temperature rise is smeared out.',
    'T₂ is the maximum reached — stop watching too early and you under-record ΔT.',
    'Finish the calculation: q = VcΔT and ΔH = −q/n, with the cooling correction applied.',
  ],
  qual: [
    'NaOH(aq) dropwise on a fresh portion comes first — precipitate colour is the main cation clue.',
    'Adding NaOH to excess separates amphoteric hydroxides (dissolve) from the rest (do not).',
    'NH₃(aq) dropwise then to excess distinguishes cations that NaOH alone cannot.',
    'The anion needs its own test: dilute HCl for carbonate, BaCl₂ for sulfate, AgNO₃ for halides.',
    'Every observation counts, including "no change" — examiners award marks for recorded negatives.',
    'Name both ions and check the identification — a table of observations without a conclusion scores nothing.',
  ],
  organic: [
    '2,4-DNPH is the screening test: an orange precipitate means a carbonyl compound.',
    'DNPH cannot separate aldehyde from ketone — only Tollens’ or Fehling’s does that.',
    'Acidified dichromate(VI) turning green shows oxidation — aldehydes and primary/secondary alcohols.',
    'Bromine water and Na₂CO₃(aq) must go on FRESH portions — reused portions contaminate the result.',
    'Conclude a functional group that at least two of your own tests support.',
  ],
  electro: [
    'Measure against the Cu²⁺/Cu reference first and record E cell, not just "a voltage".',
    'Polarity matters: which terminal the unknown is decides the SIGN of its E°.',
    'One reference can fit two metals — the Zn²⁺/Zn measurement removes the ambiguity.',
    'Match magnitude AND sign to the Data Booklet — magnitude alone misidentifies metals.',
    'The identification must be supported by both measurements (2/2), not one.',
  ],
  chroma: [
    'The spot must start ABOVE the solvent pool or it dissolves into the solvent instead of running.',
    'Keep the lid on and stop the run before the front reaches the top, or Rf cannot be measured.',
    'Measure front and spots from the BASELINE, not from the bottom edge of the paper.',
    'Rf = spot distance ÷ front distance, one value per spot.',
    'Identify the dyes by matching your Rf values to the references — both must match (2/2).',
  ],
  flame: [
    'Dip the loop in dilute HCl first — contamination, especially sodium, hides the true colour.',
    'Heat the loop until NO persistent colour remains; a yellow blank means it is still dirty.',
    'Load the sample only onto a clean loop — a dirty loop wastes the observation.',
    'The colour is read in the hottest part of the flame, and recorded immediately.',
    'If an intense yellow masks the result, view through cobalt-blue glass before concluding.',
  ],
  distill: [
    'Cooling water enters at the LOWER nozzle so the jacket fills upward — upper-inlet cooling leaves the jacket half empty.',
    'Anti-bumping granules go in BEFORE heating — adding them to a hot liquid causes violent boiling.',
    'Heat electrically and watch the vapour temperature — the thermometer reads the vapour, not the liquid.',
    'Collect at the ~100 °C plateau: ≥5 cm³ of colourless distillate is the evidence water is coming over.',
    'The technique check needs all three: cooling direction, granules and a valid observation.',
  ],
  solubility: [
    'Use the assigned KNO₃ mass with exactly 20.0 g of water — solubility is per mass of solvent.',
    'Heat and stir until EVERY crystal dissolves; premature cooling gives a false crystallisation point.',
    'Cool slowly with stirring — fast cooling supercools and the first crystals appear late.',
    'Record the temperature at the FIRST crystals, to the nearest 0.5 °C.',
    'Scale your result to g per 100 g water before comparing with the solubility curve.',
  ],
  peroxide: [
    'Run the control first — without it a comparison has nothing to be compared against.',
    'Change only ONE variable; changing two at once makes the comparison worthless.',
    'Readings every 20 s to 180 s are needed to see the shape of the curve, not just its end.',
    'Compare INITIAL gradients — final volumes converge because the same amount of H₂O₂ decomposes.',
    'Explain the faster rate with collision frequency, activation energy or surface area — name the mechanism.',
  ],
  'iodine-rate': [
    'Quench at exactly 80 s — the NaHCO₃ stops the reaction, and the time defines the rate point.',
    'Dilute to 150.0 cm³ and take a 25.0 cm³ aliquot — titrating the raw sample overshoots the burette.',
    'Starch goes in only when the iodine is pale yellow; added early it locks onto iodine and lags the endpoint.',
    'Two valid accurate titres within 0.10 cm³ — a rough titre is a rangefinder, never a result.',
    'Finish the calculation: mean titre → [I₂] → average rate, and justify quenching and late starch.',
  ],
  grav: [
    'Weigh the empty crucible + lid first — every later mass is a difference from this one.',
    'Weigh the crucible with the hydrated salt before heating, or the water lost cannot be found.',
    'Cool completely before weighing — a hot crucible convects and under-reads.',
    'Heat to CONSTANT mass: repeat heat-cool-weigh until two masses agree within 0.01 g.',
    'Calculate x from YOUR readings — the mole ratio of water lost to anhydrous salt remaining.',
  ],
  gas: [
    'Stopper quickly after adding the acid — gas escaping before the stopper is in is lost forever.',
    'Record the syringe at regular intervals; a single end reading hides leaks and timing errors.',
    'Keep recording as the readings level off — the plateau is the result.',
    'Stop only when two readings ≥20 s apart agree within 0.5 cm³ — that is what "reaction complete" means.',
    'Use YOUR final volume for the purity calculation, not the theoretical maximum.',
  ],
}

/** Mark the current state of a practical: guide-step predicates as criteria,
 *  corrections attached to every miss. Pure — no store writes. */
export function markTestAttempt(experiment, state) {
  const steps = getGuideSteps(experiment, state)
  const corrections = TEST_CORRECTIONS[experiment] ?? []
  const items = steps.map((s, i) => ({
    text: s.text,
    done: s.done,
    correction: s.done ? null : (corrections[i] ?? 'Revisit this step in guided mode.'),
  }))
  const score = items.filter((i) => i.done).length
  // Margin notes beyond the step checklist — technique errors the steps
  // cannot see. Test mode records mistakes silently; this is where they
  // surface.
  const notes = []
  if (experiment === 'titration' && (state.titration?.readErrors ?? 0) > 0) {
    const n = state.titration.readErrors
    notes.push(
      `${n} burette reading${n === 1 ? '' : 's'} did not match the scale — read the bottom of the meniscus, to the nearest 0.05 cm³. A misread carries straight into the titre.`,
    )
  }
  return { experiment, items, score, total: items.length, notes, at: Date.now() }
}

export function loadTestResults() {
  try {
    const raw = localStorage.getItem(RESULTS_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** Keep the best score per practical plus the latest attempt. */
export function saveTestResult(report) {
  try {
    const all = loadTestResults()
    const prev = all[report.experiment]
    all[report.experiment] = {
      best: Math.max(prev?.best ?? 0, report.score),
      total: report.total,
      lastScore: report.score,
      at: report.at,
    }
    localStorage.setItem(RESULTS_KEY, JSON.stringify(all))
  } catch {
    /* private mode */
  }
}
