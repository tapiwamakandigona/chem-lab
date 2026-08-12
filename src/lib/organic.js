// Organic functional-group analysis — Cambridge 9701 Paper 3 Q4 style.
// Standard deduction tests from the syllabus practical notes: 2,4-DNPH,
// Tollens' reagent, Fehling's solution, acidified dichromate(VI), bromine
// water, Na2CO3(aq), and alkaline aqueous iodine (iodoform).
//
// Pure data + pure functions. No store imports (keeps lib dependency-free).

// --- functional-group classes the student can conclude ---
export const ORGANIC_CLASSES = {
  aldehyde: { name: 'aldehyde' },
  ketone: { name: 'ketone' },
  alcohol: { name: 'alcohol (oxidisable)' },
  acid: { name: 'carboxylic acid' },
  alkene: { name: 'alkene' },
}

// --- unknown liquids offered, each a plausible P3 organic sample ---
export const ORGANIC_UNKNOWNS = {
  fa10: { label: 'FA 10', compound: 'propan-1-ol', cls: 'alcohol' },
  fa11: { label: 'FA 11', compound: 'propanal', cls: 'aldehyde' },
  fa12: { label: 'FA 12', compound: 'propanone', cls: 'ketone' },
  fa13: { label: 'FA 13', compound: 'ethanoic acid', cls: 'acid' },
  fa14: { label: 'FA 14', compound: 'cyclohexene', cls: 'alkene' },
}

// --- tests the student can run, in rack order ---
export const ORGANIC_TESTS = [
  { id: 'dnph', label: '2,4-DNPH (Brady’s reagent)' },
  { id: 'tollens', label: 'Tollens’ reagent — warm gently' },
  { id: 'fehling', label: 'Fehling’s solution — warm' },
  { id: 'dichromate', label: 'acidified K₂Cr₂O₇(aq) — warm' },
  { id: 'bromine', label: 'bromine water — shake' },
  { id: 'na2co3', label: 'Na₂CO₃(aq)' },
  { id: 'iodoform', label: 'alkaline aqueous I₂ — warm' },
]

// Observation matrix: what each class shows with each test.
const OBS = {
  aldehyde: {
    dnph: 'deep orange precipitate',
    tollens: 'silver mirror forms on the tube',
    fehling: 'brick-red precipitate on warming',
    dichromate: 'orange solution turns green',
    bromine: 'orange colour remains (very slow fading only)',
    na2co3: 'no effervescence',
    iodoform: 'no yellow precipitate', // propanal is not CH3CO-
  },
  ketone: {
    dnph: 'deep orange precipitate',
    tollens: 'no silver mirror — solution stays clear',
    fehling: 'solution stays blue — no red precipitate',
    dichromate: 'solution stays orange',
    bromine: 'orange colour remains',
    na2co3: 'no effervescence',
    iodoform: 'pale yellow precipitate with antiseptic smell (CHI₃)',
  },
  alcohol: {
    dnph: 'no precipitate',
    tollens: 'no silver mirror',
    fehling: 'solution stays blue',
    dichromate: 'orange solution turns green',
    bromine: 'orange colour remains',
    na2co3: 'no effervescence',
    iodoform: 'no yellow precipitate', // propan-1-ol lacks CH3CH(OH)-
  },
  acid: {
    dnph: 'no precipitate',
    tollens: 'no silver mirror',
    fehling: 'solution stays blue',
    dichromate: 'solution stays orange',
    bromine: 'orange colour remains',
    na2co3: 'effervescence — CO₂ turns limewater milky',
    iodoform: 'no yellow precipitate',
  },
  alkene: {
    dnph: 'no precipitate',
    tollens: 'no silver mirror',
    fehling: 'solution stays blue',
    dichromate: 'solution stays orange',
    bromine: 'orange bromine water decolourises immediately',
    na2co3: 'no effervescence',
    iodoform: 'no yellow precipitate',
  },
}

// What the student SEES when test t is run on unknown u.
export function observeOrganic(unknownId, testId) {
  const u = ORGANIC_UNKNOWNS[unknownId]
  if (!u) return 'no change'
  return OBS[u.cls]?.[testId] ?? 'no change'
}

// Visual for the 3D live tube: solution colour / ppt / mirror / bubbles.
export function organicVisual(unknownId, testId) {
  const obs = observeOrganic(unknownId, testId)
  if (/silver mirror forms/.test(obs)) return { mirror: true, ppt: null, solution: '#e8edf2', bubbles: false }
  if (/brick-red/.test(obs)) return { mirror: false, ppt: '#b3402a', solution: '#7fb2d9', bubbles: false }
  if (/deep orange precipitate/.test(obs)) return { mirror: false, ppt: '#e07b20', solution: '#f2d8a8', bubbles: false }
  if (/turns green/.test(obs)) return { mirror: false, ppt: null, solution: '#3f8f4f', bubbles: false }
  if (/decolourises/.test(obs)) return { mirror: false, ppt: null, solution: '#e9f2f7', bubbles: false }
  if (/pale yellow precipitate/.test(obs)) return { mirror: false, ppt: '#efe27a', solution: '#f4f0d6', bubbles: false }
  if (/effervescence/.test(obs)) return { mirror: false, ppt: null, solution: '#e9f2f7', bubbles: true }
  if (/stays orange/.test(obs) || /orange colour remains/.test(obs)) {
    // reagent-tinted but unreacted
    const tint = testId === 'dichromate' || testId === 'bromine' ? '#e69a3c' : '#dcecf7'
    return { mirror: false, ppt: null, solution: tint, bubbles: false }
  }
  if (/stays blue/.test(obs)) return { mirror: false, ppt: null, solution: '#4f7fd9', bubbles: false }
  return { mirror: false, ppt: null, solution: '#dcecf7', bubbles: false }
}

// The deciding tests a student must have RUN before a class conclusion earns
// evidence credit (mirrors how P3 mark schemes award deduction marks).
const KEY_TESTS = {
  aldehyde: (done) => done('dnph') && (done('tollens') || done('fehling')),
  ketone: (done) => done('dnph') && (done('tollens') || done('fehling')),
  alcohol: (done) => done('dichromate') && done('dnph'),
  acid: (done) => done('na2co3'),
  alkene: (done) => done('bromine'),
}

// Marking: class right (1) + supporting tests actually performed (1).
export function markOrganic(unknownId, classAnswer, testsDone) {
  const u = ORGANIC_UNKNOWNS[unknownId]
  const done = (id) => testsDone.includes(id)
  const clsOk = classAnswer === u.cls
  const evidence = KEY_TESTS[u.cls] ? KEY_TESTS[u.cls](done) : false
  const total = (clsOk ? 1 : 0) + (clsOk && evidence ? 1 : 0)
  return {
    ok: clsOk && evidence,
    clsOk,
    evidence,
    total,
    max: 2,
    compound: u.compound,
    className: ORGANIC_CLASSES[u.cls].name,
  }
}
