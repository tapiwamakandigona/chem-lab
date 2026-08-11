// Qualitative analysis knowledge base — Cambridge 9701 Paper 3 Q3 style.
// Observations follow the official "Qualitative Analysis Notes" appended to
// every Paper 3: reactions of cations with NaOH(aq)/NH3(aq) dropwise then in
// excess, and anion tests (HCl, BaCl2/Ba(NO3)2, AgNO3 then NH3).
//
// Pure data + pure functions. No store imports (keeps lib dependency-free).

// --- cation behaviour: [dropwise obs, excess obs] for NaOH and NH3 ---
export const CATIONS = {
  'Al3+': {
    name: 'aluminium, Al³⁺',
    naoh: { drop: 'white ppt.', excess: 'ppt. dissolves — colourless solution' },
    nh3: { drop: 'white ppt.', excess: 'ppt. insoluble' },
  },
  'NH4+': {
    name: 'ammonium, NH₄⁺',
    naoh: { drop: 'no ppt.', excess: 'ammonia gas on warming (turns damp red litmus blue)' },
    nh3: { drop: 'no ppt.', excess: 'no change' },
    gasOnWarmNaOH: 'nh3',
  },
  'Ba2+': {
    name: 'barium, Ba²⁺',
    naoh: { drop: 'faint white ppt. (if concentrated)', excess: 'no change' },
    nh3: { drop: 'no ppt.', excess: 'no change' },
  },
  'Ca2+': {
    name: 'calcium, Ca²⁺',
    naoh: { drop: 'white ppt. (if concentrated)', excess: 'ppt. insoluble' },
    nh3: { drop: 'no ppt.', excess: 'no change' },
  },
  'Cu2+': {
    name: 'copper(II), Cu²⁺',
    naoh: { drop: 'pale blue ppt.', excess: 'ppt. insoluble' },
    nh3: { drop: 'pale blue ppt.', excess: 'ppt. dissolves — deep blue solution' },
    solutionColor: '#4aa3df',
  },
  'Fe2+': {
    name: 'iron(II), Fe²⁺',
    naoh: { drop: 'green ppt., darkens on standing', excess: 'ppt. insoluble' },
    nh3: { drop: 'green ppt., darkens on standing', excess: 'ppt. insoluble' },
    solutionColor: '#a8d5b0',
  },
  'Fe3+': {
    name: 'iron(III), Fe³⁺',
    naoh: { drop: 'red-brown ppt.', excess: 'ppt. insoluble' },
    nh3: { drop: 'red-brown ppt.', excess: 'ppt. insoluble' },
    solutionColor: '#d9a441',
  },
  'Mg2+': {
    name: 'magnesium, Mg²⁺',
    naoh: { drop: 'white ppt.', excess: 'ppt. insoluble' },
    nh3: { drop: 'white ppt.', excess: 'ppt. insoluble' },
  },
  'Mn2+': {
    name: 'manganese(II), Mn²⁺',
    naoh: { drop: 'off-white ppt., rapidly darkens on standing', excess: 'ppt. insoluble' },
    nh3: { drop: 'off-white ppt., rapidly darkens on standing', excess: 'ppt. insoluble' },
  },
  'Zn2+': {
    name: 'zinc, Zn²⁺',
    naoh: { drop: 'white ppt.', excess: 'ppt. dissolves — colourless solution' },
    nh3: { drop: 'white ppt.', excess: 'ppt. dissolves — colourless solution' },
  },
}

// --- anion tests ---
export const ANIONS = {
  'CO32-': {
    name: 'carbonate, CO₃²⁻',
    hcl: 'effervescence — CO₂ (turns limewater milky)',
    bacl2: 'white ppt. (dissolves in dilute acid)',
    agno3: '—',
  },
  'Cl-': {
    name: 'chloride, Cl⁻',
    hcl: 'no change',
    bacl2: 'no ppt.',
    agno3: 'white ppt., soluble in dilute NH₃(aq)',
  },
  'Br-': {
    name: 'bromide, Br⁻',
    hcl: 'no change',
    bacl2: 'no ppt.',
    agno3: 'cream ppt., partially soluble in concentrated NH₃(aq)',
  },
  'I-': {
    name: 'iodide, I⁻',
    hcl: 'no change',
    bacl2: 'no ppt.',
    agno3: 'yellow ppt., insoluble in NH₃(aq)',
  },
  'SO42-': {
    name: 'sulfate, SO₄²⁻',
    hcl: 'no change',
    bacl2: 'white ppt., insoluble in dilute acid',
    agno3: '—',
  },
  'SO32-': {
    name: 'sulfite, SO₃²⁻',
    hcl: 'effervescence on warming — SO₂ (turns acidified dichromate green)',
    bacl2: 'white ppt., dissolves in dilute acid',
    agno3: '—',
  },
  'NO3-': {
    name: 'nitrate, NO₃⁻',
    hcl: 'no change',
    bacl2: 'no ppt.',
    agno3: 'no ppt.',
    alNaoh: 'ammonia gas on warming with Al foil + NaOH(aq)',
  },
}

// --- reagents the student can apply, in rack order ---
export const REAGENTS = [
  { id: 'naoh_drop', label: 'NaOH(aq) — a few drops' },
  { id: 'naoh_excess', label: 'NaOH(aq) — to excess' },
  { id: 'naoh_warm', label: 'NaOH(aq) — warm gently, test gas' },
  { id: 'nh3_drop', label: 'NH₃(aq) — a few drops' },
  { id: 'nh3_excess', label: 'NH₃(aq) — to excess' },
  { id: 'hcl', label: 'dilute HCl' },
  { id: 'bacl2', label: 'BaCl₂(aq) [acidified]' },
  { id: 'agno3', label: 'AgNO₃(aq), then NH₃(aq)' },
]

// Unknowns offered — each a plausible P3 salt (one cation + one anion).
export const QUAL_UNKNOWNS = {
  fa5: { label: 'FA 5', cation: 'Fe3+', anion: 'SO42-', formula: 'Fe₂(SO₄)₃' },
  fa6: { label: 'FA 6', cation: 'Zn2+', anion: 'Cl-', formula: 'ZnCl₂' },
  fa7: { label: 'FA 7', cation: 'NH4+', anion: 'CO32-', formula: '(NH₄)₂CO₃' },
  fa8: { label: 'FA 8', cation: 'Cu2+', anion: 'SO42-', formula: 'CuSO₄' },
  fa9: { label: 'FA 9', cation: 'Al3+', anion: 'I-', formula: 'AlI₃' },
}

// What the student SEES when reagent r is added to unknown u.
// Ordering matters: dropwise before excess is enforced by the store.
export function observe(unknownId, reagentId) {
  const u = QUAL_UNKNOWNS[unknownId]
  if (!u) return 'no change'
  const cat = CATIONS[u.cation]
  const an = ANIONS[u.anion]
  switch (reagentId) {
    case 'naoh_drop':
      return cat.naoh.drop
    case 'naoh_excess':
      return cat.naoh.excess
    case 'naoh_warm':
      return cat.gasOnWarmNaOH === 'nh3'
        ? 'pungent gas — turns damp red litmus blue (NH₃)'
        : 'no gas detected'
    case 'nh3_drop':
      return cat.nh3.drop
    case 'nh3_excess':
      return cat.nh3.excess
    case 'hcl':
      return an.hcl
    case 'bacl2':
      return an.bacl2
    case 'agno3':
      return an.agno3 === '—' ? 'no ppt.' : an.agno3
    default:
      return 'no change'
  }
}

// Precipitate visual for the 3D tube: color + whether it redissolves.
export function precipitateVisual(unknownId, reagentId) {
  const obs = observe(unknownId, reagentId)
  if (/effervescence/.test(obs)) return { bubbles: true, ppt: null, dissolved: false }
  if (/dissolves — deep blue/.test(obs)) return { bubbles: false, ppt: null, dissolved: true, solution: '#1a3fd4' }
  if (/dissolves/.test(obs)) return { bubbles: false, ppt: null, dissolved: true }
  if (/red-brown ppt/.test(obs)) return { bubbles: false, ppt: '#8b4513', dissolved: false }
  if (/green ppt/.test(obs)) return { bubbles: false, ppt: '#5a8a5f', dissolved: false }
  if (/pale blue ppt/.test(obs)) return { bubbles: false, ppt: '#a7c7e7', dissolved: false }
  if (/off-white ppt/.test(obs)) return { bubbles: false, ppt: '#d8d2c4', dissolved: false }
  if (/cream ppt/.test(obs)) return { bubbles: false, ppt: '#f2e8c9', dissolved: false }
  if (/yellow ppt/.test(obs)) return { bubbles: false, ppt: '#e8d44d', dissolved: false }
  if (/white ppt/.test(obs)) return { bubbles: false, ppt: '#f0f0f0', dissolved: false }
  return { bubbles: false, ppt: null, dissolved: false }
}

// Marking: identify the ions from recorded observations.
// Full marks need BOTH ions right AND the deciding tests actually performed.
export function markIdentification(unknownId, cationAnswer, anionAnswer, testsDone) {
  const u = QUAL_UNKNOWNS[unknownId]
  const done = (id) => testsDone.includes(id)
  const cationEvidence =
    done('naoh_drop') || done('naoh_excess') || done('nh3_drop') ||
    done('nh3_excess') || done('naoh_warm')
  const anionEvidence = done('hcl') || done('bacl2') || done('agno3')
  const cationOk = cationAnswer === u.cation
  const anionOk = anionAnswer === u.anion
  return {
    cation: { ok: cationOk, evidence: cationEvidence, mark: cationOk && cationEvidence ? 1 : 0 },
    anion: { ok: anionOk, evidence: anionEvidence, mark: anionOk && anionEvidence ? 1 : 0 },
    total: (cationOk && cationEvidence ? 1 : 0) + (anionOk && anionEvidence ? 1 : 0),
    max: 2,
    formula: u.formula,
  }
}
