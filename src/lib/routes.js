export const PRACTICAL_META = [
  ['titration', 'Acid-Base & Redox Titration', 'Operate a burette, read the meniscus, obtain concordant titres and complete marked Cambridge 9701-style calculations.'],
  ['clock', 'Iodine Clock Reaction', 'Run five concentrations, measure reaction time, graph rate and interpret a Cambridge 9701-style gradient.'],
  ['enthalpy', 'Enthalpy of Solution', 'Measure an exothermic temperature change, correct for heat loss and calculate enthalpy of solution.'],
  ['qual', 'Qualitative Analysis', 'Test unknown salts and identify their ions from your own observations and chemical evidence.'],
  ['grav', 'Water of Crystallisation', 'Heat a hydrated salt to constant mass and determine its water of crystallisation from measured masses.'],
  ['gas', 'Molar Gas Volume', 'Collect carbon dioxide in a gas syringe and calculate percentage purity from your final volume.'],
  ['organic', 'Organic Analysis', 'Use deciding tests to identify the functional groups in five unknown organic liquids.'],
  ['electro', 'Electrochemical Cells', 'Build half-cells, measure cell potentials and identify an unknown metal from polarity and E° data.'],
  ['chroma', 'Paper Chromatography', 'Develop a chromatogram, measure Rf values and identify the dyes in an unknown mixture.'],
  ['flame', 'Flame Tests', 'Control sodium contamination and identify metal ions from their characteristic flame colours.'],
  ['distill', 'Simple Distillation', 'Set condenser flow, control boiling and separate water safely by simple distillation.'],
  ['solubility', 'Solubility & Crystallisation', 'Measure first-crystal temperatures and construct a potassium nitrate solubility curve.'],
  ['peroxide', 'Catalytic Decomposition Kinetics', 'Collect oxygen-time curves and compare initial rates while controlling experimental variables.'],
  ['iodine-rate', 'Iodine–Propanone Rate Titration', 'Quench a timed sample, titrate residual iodine and calculate a reaction rate from concordant results.'],
].map(([id, title, description]) => ({ id, title, description }))

export const EXPERIMENT_IDS = PRACTICAL_META.map(({ id }) => id)

export const STATIC_ROUTE_META = [
  {
    path: '/guide',
    title: 'Learner’s Guide — ChemLab',
    description: 'Follow a 19-milestone learn-by-doing route through Cambridge 9701 practical chemistry skills.',
  },
  {
    path: '/teach',
    title: 'Teacher Dashboard — ChemLab',
    description: 'Create a class, set practicals and marked mocks as an assignment, and see what your learners actually completed.',
  },
  {
    path: '/join',
    title: 'Join a Class — ChemLab',
    description: 'Enter the six-character code from your teacher to load this week’s practicals. No account, no email needed.',
  },
  {
    path: '/mocks',
    title: 'Marked Mock Papers — ChemLab',
    description: 'Open three marked chemistry mock-paper workflows based on results you collect in ChemLab practicals.',
  },
]

export const MOCK_PAPERS = [
  {
    id: 'titration-s22',
    title: 'Titration calculations',
    subtitle: 'S22-style · 6 marks',
    experiment: 'titration',
    requirement: 'Complete two concordant titres to unlock marking from your own results.',
  },
  {
    id: 'clock-s23',
    title: 'Rates and gradients',
    subtitle: 'S23-style · 6 marks',
    experiment: 'clock',
    requirement: 'Record all five rate runs to unlock marking from your graph.',
  },
  {
    id: 'enthalpy-s20',
    title: 'Enthalpy and cooling correction',
    subtitle: 'S20-style · 5 marks',
    experiment: 'enthalpy',
    requirement: 'Complete a calorimetry run and extrapolation before answering.',
  },
]

export function routeForExperiment(experiment) {
  return `/practical/${experiment}`
}

export function parseRoute(pathname = window.location.pathname) {
  const normalized = pathname === '/index.html' ? '/' : pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/') return { kind: 'landing' }
  if (normalized === '/guide') return { kind: 'guide' }
  if (normalized === '/mocks') return { kind: 'mocks' }
  if (normalized === '/teach') return { kind: 'teach' }
  if (normalized === '/join') return { kind: 'join' }
  const match = normalized.match(/^\/practical\/([a-z0-9-]+)$/)
  if (match && EXPERIMENT_IDS.includes(match[1])) {
    return { kind: 'practical', experiment: match[1] }
  }
  return { kind: 'not-found' }
}

export function navigate(path, { replace = false } = {}) {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (current !== path) {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}
