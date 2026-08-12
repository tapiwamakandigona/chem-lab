// Learner's Guide course — a "learn by doing" path through the whole
// platform. Each unit is a checkable milestone derived from live store
// state; completion persists to localStorage so progress survives resets,
// experiment switches and page reloads (offline-first — no accounts).

const STORAGE_KEY = 'chemlab-course-v1'

export function loadCourseProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveCourseProgress(done) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(done))
  } catch {
    // storage full / private mode — progress just won't persist
  }
}

// check(s) receives the full store state. Units are ordered as a course:
// technique → experiment → analysis → exam practice, per experiment.
export const COURSE_UNITS = [
  {
    id: 'titration-endpoint',
    experiment: 'titration',
    title: 'Reach a titration endpoint',
    desc: 'Run the burette until the indicator shows the first permanent colour change.',
    check: (s) => s.titration.endpointReached || s.titration.titreValues.length > 0,
  },
  {
    id: 'titration-read',
    experiment: 'titration',
    title: 'Read the burette yourself',
    desc: 'At the endpoint, read the zoomed scale and type the reading to the nearest 0.05 cm³.',
    check: (s) => s.titration.titreValues.length > 0,
  },
  {
    id: 'titration-concordant',
    experiment: 'titration',
    title: 'Get concordant titres',
    desc: 'Repeat until two titres agree within 0.10 cm³ — that is what the examiner accepts.',
    check: (s) => {
      const v = s.titration.titreValues
      for (let i = 0; i < v.length - 1; i++)
        for (let j = i + 1; j < v.length; j++)
          if (Math.abs(v[i] - v[j]) <= 0.1) return true
      return false
    },
  },
  {
    id: 'titration-paper',
    experiment: 'titration',
    title: 'Pass the titration mock paper',
    desc: 'Score at least 5/6 on the S22-style question using your own results.',
    check: (s) => {
      const r = s.mockResults['titration-s22']
      return !!r && r.score >= 5
    },
  },
  {
    id: 'clock-runs',
    experiment: 'clock',
    title: 'Complete all five clock runs',
    desc: 'Time the iodine clock at every thiosulfate concentration, 0.100 → 0.020 M.',
    check: (s) => s.clock.results.length >= 5,
  },
  {
    id: 'clock-paper',
    experiment: 'clock',
    title: 'Pass the rates mock paper',
    desc: 'Score at least 5/6 on the S23-style rate question — gradient, order, prediction.',
    check: (s) => {
      const r = s.mockResults['clock-s23']
      return !!r && r.score >= 5
    },
  },
  {
    id: 'enthalpy-run',
    experiment: 'enthalpy',
    title: 'Measure an enthalpy change',
    desc: 'Dissolve the Na₂CO₃, watch the temperature rise, and let the run complete.',
    check: (s) => s.enthalpy.phase === 'complete',
  },
  {
    id: 'enthalpy-paper',
    experiment: 'enthalpy',
    title: 'Pass the enthalpy mock paper',
    desc: 'Score at least 4/5 on the S20-style question — cooling correction, q=mcΔT, sign of ΔH.',
    check: (s) => {
      const r = s.mockResults['enthalpy-s20']
      return !!r && r.score >= 4
    },
  },
  {
    id: 'qual-identify',
    experiment: 'qual',
    title: 'Identify an unknown salt',
    desc: 'Pick an unknown, run the reagent tests, and name both ions with supporting evidence (2/2).',
    check: (s) => !!s.qual.result && s.qual.result.total === 2,
  },
  {
    id: 'grav-constant-mass',
    experiment: 'grav',
    title: 'Heat to constant mass',
    desc: 'Heat, cool and re-weigh the crucible until two masses agree within 0.01 g, then find x from your own readings.',
    check: (s) => s.grav.result?.ok === true,
  },
  {
    id: 'gas-purity',
    experiment: 'gas',
    title: 'Collect a gas and find purity',
    desc: 'Collect CO₂ in the gas syringe until the volume is constant, then calculate the % purity from your final volume.',
    check: (s) => s.gas.result?.ok === true,
  },
  {
    id: 'organic-deduce',
    experiment: 'organic',
    title: 'Deduce a functional group',
    desc: 'Run the deduction tests on an unknown organic liquid and conclude its functional group with evidence (2/2).',
    check: (s) => s.organic.result?.ok === true,
  },
  {
    id: 'electro-identify',
    experiment: 'electro',
    title: 'Identify a metal from E cell',
    desc: 'Measure the unknown half-cell against both references and identify the metal from the Data Booklet (2/2).',
    check: (s) => s.electro.result?.ok === true,
  },
]

export function courseProgressCount(done) {
  return COURSE_UNITS.filter((u) => done[u.id]).length
}
