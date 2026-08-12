import { create } from 'zustand'
import { observe, precipitateVisual, markIdentification } from './lib/qual.js'
import { loadCourseProgress, saveCourseProgress } from './lib/course.js'
import { crucibleMass, round2, markX } from './lib/grav.js'

// Quality tiers for low-end device support (Zimbabwe context).
// ULTRA is opt-in only (never auto-detected): soft shadows, higher DPR,
// richer environment — for laptops/desktops with a real GPU.
export const QUALITY = { LOW: 'low', MED: 'med', HIGH: 'high', ULTRA: 'ultra' }
const QUALITY_KEY = 'chemlab-quality'

// Detect device capability on first load
function detectQuality() {
  try {
    const saved = localStorage.getItem(QUALITY_KEY)
    if (Object.values(QUALITY).includes(saved)) return saved
  } catch { /* private mode */ }
  const gpu = navigator.hardwareConcurrency ?? 2
  const memory = navigator.deviceMemory ?? 2
  if (gpu <= 2 || memory <= 1) return QUALITY.LOW
  if (gpu <= 4 || memory <= 4) return QUALITY.MED
  return QUALITY.HIGH
}

export const useLabStore = create((set) => ({
  // --- experiment selection ---
  experiment: null, // null = menu, 'titration' | 'clock' | 'enthalpy'
  setExperiment: (e) => set({ experiment: e }),

  // --- quality / rendering ---
  quality: detectQuality(),
  setQuality: (q) => {
    try { localStorage.setItem(QUALITY_KEY, q) } catch { /* private mode */ }
    set({ quality: q })
  },

  // --- guided mode (PhET-style step coach) ---
  guideOpen: true,
  setGuideOpen: (guideOpen) => set({ guideOpen }),

  // --- titration state ---
  titration: {
    preset: 's22', // 's22' = carboxylic acid/NaOH | 's21' = FeSO4/KMnO4
    buretteVolume: 50.00,   // cm3 total capacity
    buretteReading: 0.00,   // cm3 dispensed (reads to 0.05)
    initialReading: 0.00,
    flaskVolume: 25.00,     // pipette volume (fixed)
    indicatorColor: [0.95, 0.95, 0.95, 0.85], // RGBA — changes at endpoint
    endpointReached: false,
    titreValues: [],        // array of completed titre cm3 values
    phase: 'setup',         // 'setup' | 'running' | 'endpoint' | 'complete'
    // "Read the burette yourself" (P3 skill): at the endpoint the numeric
    // reading is masked; the student reads the zoomed scale and types the
    // final reading (nearest 0.05) before the titre records.
    readCheck: { entered: '', status: 'idle', attempts: 0 }, // status: idle|wrong|correct
  },
  titrationDispense: (delta) => set((s) => {
    const t = s.titration
    const newReading = Math.min(50.00, Math.round((t.buretteReading + delta) * 20) / 20)
    const dispensed = newReading - t.initialReading

    // Presets define endpoint titre
    const endpointTitre = TITRATION_PRESETS[t.preset]?.endpointTitre ?? 25.0
    const nearEnd = dispensed >= endpointTitre - 0.5
    const atEnd = dispensed >= endpointTitre

    // Indicator color: clear → pink (s22 phenolphthalein) or clear → purple (s21 KMnO4)
    const isRedox = t.preset === 's21'
    let color = t.indicatorColor
    if (atEnd) {
      color = isRedox ? [0.58, 0.0, 0.83, 0.9] : [1.0, 0.41, 0.71, 0.85]
    } else if (nearEnd) {
      const f = (dispensed - (endpointTitre - 0.5)) / 0.5
      color = isRedox
        ? [0.58*f, 0.0, 0.83*f, 0.5*f + 0.2]
        : [1.0, 0.41+0.54*(1-f), 0.71+0.29*(1-f), f*0.65 + 0.2]
    }

    return {
      titration: {
        ...t,
        buretteReading: newReading,
        indicatorColor: color,
        endpointReached: atEnd,
        phase: atEnd ? 'endpoint' : t.phase === 'setup' ? 'running' : t.phase,
      }
    }
  }),
  titrationReset: () => set((s) => ({
    titration: {
      ...s.titration,
      buretteReading: 0.00,
      initialReading: 0.00,
      indicatorColor: [0.95, 0.95, 0.95, 0.85],
      endpointReached: false,
      phase: 'setup',
      readCheck: { entered: '', status: 'idle', attempts: 0 },
    }
  })),
  titrationRecordTitre: () => set((s) => {
    const t = s.titration
    const titre = Math.round((t.buretteReading - t.initialReading) * 20) / 20
    return {
      titration: {
        ...t,
        titreValues: [...t.titreValues, titre],
        initialReading: t.buretteReading,
        indicatorColor: [0.95, 0.95, 0.95, 0.85],
        endpointReached: false,
        phase: 'setup',
        readCheck: { entered: '', status: 'idle', attempts: 0 },
      }
    }
  }),
  // --- endpoint "read the burette" check ---
  titrationReadInput: (txt) => set((s) => ({
    titration: { ...s.titration, readCheck: { ...s.titration.readCheck, entered: txt } }
  })),
  titrationReadReveal: () => set((s) => ({
    titration: {
      ...s.titration,
      readCheck: { ...s.titration.readCheck, entered: s.titration.buretteReading.toFixed(2) },
    }
  })),
  // Validates the typed final reading. Correct = exactly the true reading
  // (burette dispenses in 0.05 quanta, so the scale IS readable exactly).
  // On success the titre is recorded (same transition as titrationRecordTitre).
  titrationReadCheckSubmit: () => set((s) => {
    const t = s.titration
    const v = parseFloat(t.readCheck.entered)
    const quantized = !Number.isNaN(v) && Math.abs(v * 20 - Math.round(v * 20)) < 1e-6
    const correct = quantized && Math.abs(v - t.buretteReading) < 0.001
    if (!correct) {
      return {
        titration: {
          ...t,
          readCheck: {
            ...t.readCheck,
            status: 'wrong',
            attempts: t.readCheck.attempts + 1,
          },
        }
      }
    }
    const titre = Math.round((t.buretteReading - t.initialReading) * 20) / 20
    return {
      titration: {
        ...t,
        titreValues: [...t.titreValues, titre],
        initialReading: t.buretteReading,
        indicatorColor: [0.95, 0.95, 0.95, 0.85],
        endpointReached: false,
        phase: 'setup',
        readCheck: { entered: '', status: 'idle', attempts: 0 },
      }
    }
  }),
  setTitrationPreset: (preset) => set((s) => ({
    titration: {
      ...s.titration,
      preset,
      buretteReading: 0.00,
      initialReading: 0.00,
      indicatorColor: [0.95, 0.95, 0.95, 0.85],
      endpointReached: false,
      titreValues: [],
      phase: 'setup',
      readCheck: { entered: '', status: 'idle', attempts: 0 },
    }
  })),

  // --- clock reaction state ---
  // Time runs at CLOCK_TIME_SCALE x real time so recorded values are
  // realistic (t = 4.0/[S2O3] seconds: 0.100 M -> 40 s) without making the
  // student wait 200 real seconds at 0.020 M.
  clock: {
    phase: 'setup', // 'setup' | 'running' | 'complete'
    timerMs: 0,     // SIMULATED elapsed ms (already time-scaled)
    currentConc: 0.100,
    hclConc: 2.00,
    results: [], // [{conc, time, rate}]
  },
  clockStart: () => set((s) => ({
    clock: { ...s.clock, phase: 'running', timerMs: 0 }
  })),
  // clampMs: auto-stop passes the true endpoint time so slow frames (cheap
  // phones) can't inflate the recorded reading past the physical event.
  clockStop: (clampMs) => set((s) => ({
    clock: {
      ...s.clock,
      phase: 'complete',
      timerMs: clampMs ? Math.min(s.clock.timerMs, clampMs) : s.clock.timerMs,
    }
  })),
  clockTick: (ms) => set((s) => ({
    clock: { ...s.clock, timerMs: s.clock.timerMs + ms }
  })),
  clockReset: () => set((s) => ({
    clock: { ...s.clock, phase: 'setup', timerMs: 0 }
  })),
  clockRecordResult: () => set((s) => {
    const { timerMs, currentConc, results } = s.clock
    const timeSec = timerMs / 1000
    const rate = timeSec > 0 ? 1000 / timeSec : 0
    if (timeSec <= 0) return {}
    if (results.some((r) => r.conc === currentConc)) {
      // re-run replaces the previous result for that concentration
      return {
        clock: {
          ...s.clock,
          phase: 'setup',
          timerMs: 0,
          results: results.map((r) => r.conc === currentConc ? { conc: currentConc, time: timeSec, rate } : r),
        }
      }
    }
    return {
      clock: {
        ...s.clock,
        phase: 'setup',
        timerMs: 0,
        results: [...results, { conc: currentConc, time: timeSec, rate }],
      }
    }
  }),
  setClockConc: (conc) => set((s) => ({
    clock: { ...s.clock, currentConc: conc }
  })),
  setClockHclConc: (conc) => set((s) => ({
    clock: { ...s.clock, hclConc: conc }
  })),
  clearClockResults: () => set((s) => ({
    clock: { ...s.clock, results: [] }
  })),

  // --- enthalpy state ---
  enthalpy: {
    phase: 'setup', // 'setup' | 'running' | 'complete'
    mass: 5.30,     // grams of Na2CO3
    volume: 25.0,   // cm3 of water
    T1: 22.0,       // initial temperature °C
    T2: 22.0,       // final temperature °C (animates)
    targetT2: 22.0, // what T2 animates toward
  },
  setEnthalpyMass: (mass) => set((s) => ({ enthalpy: { ...s.enthalpy, mass } })),
  setEnthalpyVolume: (volume) => set((s) => ({ enthalpy: { ...s.enthalpy, volume } })),
  setEnthalpyT1: (T1) => set((s) => ({ enthalpy: { ...s.enthalpy, T1, T2: T1, targetT2: T1 } })),
  enthalpyStart: () => set((s) => {
    // Physical model: anhydrous Na2CO3 dissolution, ΔH_soln ≈ -23.0 kJ/mol.
    // ΔT = n·|ΔH| / (c·V), with ~92% calorimeter efficiency (heat loss to
    // cup/air) so students meet a realistic data-book gap to discuss.
    // Default 5.30 g / 25 cm³ → ΔT ≈ +10.1 °C.
    const n = s.enthalpy.mass / 106
    const dtIdeal = (n * 23000) / (4.2 * Math.max(1, s.enthalpy.volume))
    const dt = Math.round(dtIdeal * 0.92 * 10) / 10
    return {
      enthalpy: {
        ...s.enthalpy,
        phase: 'running',
        T2: s.enthalpy.T1,
        targetT2: s.enthalpy.T1 + dt,
      }
    }
  }),
  enthalpyTickT2: (newT2) => set((s) => ({
    enthalpy: { ...s.enthalpy, T2: newT2 }
  })),
  enthalpyComplete: () => set((s) => ({
    enthalpy: { ...s.enthalpy, phase: 'complete', T2: s.enthalpy.targetT2 }
  })),
  enthalpyReset: () => set((s) => ({
    enthalpy: {
      ...s.enthalpy,
      phase: 'setup',
      T2: s.enthalpy.T1,
      targetT2: s.enthalpy.T1,
    }
  })),

  // --- qualitative analysis state (9701 P3 Q3 ion identification) ---
  qual: {
    unknown: 'fa8',        // key into QUAL_UNKNOWNS
    tests: [],             // [{ reagent, obs }] in the order performed
    lastVisual: null,      // precipitateVisual() of the latest test (drives 3D tube)
    answer: { cation: '', anion: '' },
    result: null,          // markIdentification() output after submit
  },
  qualSetUnknown: (unknown) => set((s) => ({
    qual: { ...s.qual, unknown, tests: [], lastVisual: null, answer: { cation: '', anion: '' }, result: null },
  })),
  qualRunTest: (reagentId) => set((s) => {
    const q = s.qual
    if (q.tests.some((t) => t.reagent === reagentId)) return {}
    // enforce practical order: excess only after dropwise for the same reagent
    if (reagentId === 'naoh_excess' && !q.tests.some((t) => t.reagent === 'naoh_drop')) return {}
    if (reagentId === 'nh3_excess' && !q.tests.some((t) => t.reagent === 'nh3_drop')) return {}
    const obs = observe(q.unknown, reagentId)
    const visual = precipitateVisual(q.unknown, reagentId)
    return {
      qual: {
        ...q,
        tests: [...q.tests, { reagent: reagentId, obs }],
        lastVisual: { ...visual, reagent: reagentId },
        result: null,
      },
    }
  }),
  qualSetAnswer: (field, value) => set((s) => ({
    qual: { ...s.qual, answer: { ...s.qual.answer, [field]: value }, result: null },
  })),
  qualSubmit: () => set((s) => {
    const q = s.qual
    if (!q.answer.cation || !q.answer.anion) return {}
    const result = markIdentification(
      q.unknown, q.answer.cation, q.answer.anion, q.tests.map((t) => t.reagent),
    )
    return { qual: { ...q, result } }
  }),
  qualReset: () => set((s) => ({
    qual: { ...s.qual, tests: [], lastVisual: null, answer: { cation: '', anion: '' }, result: null },
  })),

  // Tip-drain indicator (true only ~1 s after titrant actually left the tip;
  // a closed stopcock must never drip) — exposed for UI + gates.
  dripping: false,
  setDripping: (dripping) => set((st) => (st.dripping === dripping ? {} : { dripping })),

  // --- gravimetric analysis (water of crystallisation, heat to constant mass) ---
  grav: {
    phase: 'idle',        // 'idle' | 'heating' | 'cooling'
    loaded: false,        // sample added to crucible
    heats: 0,             // completed heating cycles
    lastWeighedHeats: -1, // guards one 'heated' reading per cycle
    readings: [],         // [{ kind: 'empty'|'loaded'|'heated', label, mass }]
    answer: '',
    result: null,         // markX() output
  },
  gravWeigh: () => set((s) => {
    const g = s.grav
    if (g.phase !== 'idle') return {}
    const mass = round2(crucibleMass(g.heats, g.loaded))
    let kind, label
    if (!g.loaded) {
      if (g.readings.some((r) => r.kind === 'empty')) return {}
      kind = 'empty'; label = 'crucible + lid'
    } else if (g.heats === 0) {
      if (g.readings.some((r) => r.kind === 'loaded')) return {}
      kind = 'loaded'; label = 'crucible + lid + hydrated salt'
    } else {
      if (g.lastWeighedHeats === g.heats) return {}
      kind = 'heated'; label = `after heating ${g.heats}`
    }
    return {
      grav: {
        ...g,
        readings: [...g.readings, { kind, label, mass }],
        lastWeighedHeats: kind === 'heated' ? g.heats : g.lastWeighedHeats,
        result: null,
      },
    }
  }),
  gravAddSample: () => set((s) => {
    const g = s.grav
    if (g.loaded || g.phase !== 'idle') return {}
    if (!g.readings.some((r) => r.kind === 'empty')) return {}
    return { grav: { ...g, loaded: true } }
  }),
  gravStartHeat: () => set((s) => {
    const g = s.grav
    if (g.phase !== 'idle' || !g.loaded) return {}
    if (!g.readings.some((r) => r.kind === 'loaded')) return {}
    return { grav: { ...g, phase: 'heating' } }
  }),
  gravFinishHeat: () => set((s) => {
    const g = s.grav
    if (g.phase !== 'heating') return {}
    return { grav: { ...g, phase: 'cooling', heats: g.heats + 1 } }
  }),
  gravFinishCool: () => set((s) => {
    const g = s.grav
    if (g.phase !== 'cooling') return {}
    return { grav: { ...g, phase: 'idle' } }
  }),
  gravSetAnswer: (answer) => set((s) => ({ grav: { ...s.grav, answer, result: null } })),
  gravSubmit: () => set((s) => {
    const g = s.grav
    const x = parseFloat(g.answer)
    if (!Number.isFinite(x)) return {}
    return { grav: { ...g, result: markX(g.readings, x) } }
  }),
  gravReset: () => set(() => ({
    grav: {
      phase: 'idle', loaded: false, heats: 0, lastWeighedHeats: -1,
      readings: [], answer: '', result: null,
    },
  })),

  // --- learner's guide course (persistent, offline-first) ---
  courseDone: loadCourseProgress(), // { unitId: true }
  courseOpen: false,
  setCourseOpen: (courseOpen) => set({ courseOpen }),
  courseMarkDone: (id) => set((s) => {
    if (s.courseDone[id]) return {}
    const courseDone = { ...s.courseDone, [id]: true }
    saveCourseProgress(courseDone)
    return { courseDone }
  }),

  // --- mock paper results (feeds course milestones) ---
  mockResults: {}, // { paperId: { score, total } }
  recordMockResult: (paperId, score, total) => set((s) => {
    const prev = s.mockResults[paperId]
    if (prev && prev.score >= score) return {}
    return { mockResults: { ...s.mockResults, [paperId]: { score, total } } }
  }),
}))

export function getEnthalpyCalc(enthalpy) {
  const { mass, volume, T1, T2 } = enthalpy
  const deltaT = T2 - T1
  const q = volume * 4.2 * deltaT
  const moles = mass / 106
  const deltaHkJ = moles > 0 ? (-q / moles) / 1000 : 0
  return { deltaT, q, moles, deltaHkJ }
}


// Cooling-curve model (heat-loss correction, 9701 P3 technique): readings
// every 30 s; solid added at t = 150 s (no reading); linear cooling after
// mixing at COOLING.rate °C/s. The max recorded temp (first post-mix reading
// at t = 180 s) is targetT2; the true mixing-time temp is recovered by
// extrapolating the cooling line back to t = 150 s.
export const COOLING = { mixT: 150, interval: 30, endT: 420, rate: 0.02 }

export function getCoolingReadings(enthalpy) {
  const { T1, targetT2, phase } = enthalpy
  if (phase !== 'complete') return []
  const Tmix = targetT2 + COOLING.rate * COOLING.interval
  const out = []
  for (let t = 0; t <= COOLING.endT; t += COOLING.interval) {
    if (t === COOLING.mixT) { out.push({ t, T: null }); continue }
    out.push({ t, T: t < COOLING.mixT ? T1 : Tmix - COOLING.rate * (t - COOLING.mixT) })
  }
  return out
}

export function getCoolingAnalysis(enthalpy) {
  const readings = getCoolingReadings(enthalpy)
  const post = readings.filter((r) => r.T != null && r.t > COOLING.mixT)
  if (post.length < 2) return null
  const n = post.length
  const sx = post.reduce((s, r) => s + r.t, 0)
  const sy = post.reduce((s, r) => s + r.T, 0)
  const sxy = post.reduce((s, r) => s + r.t * r.T, 0)
  const sxx = post.reduce((s, r) => s + r.t * r.t, 0)
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  const intercept = (sy - slope * sx) / n
  const Textrap = slope * COOLING.mixT + intercept
  return { readings, post, slope, intercept, Textrap }
}

// Clock reaction timing model (9701/31/M/J/23): endpoint when enough S is
// produced to obscure the cross; rate ∝ [S2O3] ⇒ t_end = K_CLOCK/[S2O3].
export const CLOCK_TIME_SCALE = 5
export const K_CLOCK = 4.0 // s·mol·dm⁻³ → 0.100 M: 40 s, 0.020 M: 200 s
export const clockEndpointSec = (conc) => (conc > 0 ? K_CLOCK / conc : Infinity)

export const TITRATION_PRESETS = {
  s22: {
    label: 'S22 — Carboxylic Acid vs NaOH',
    acidLabel: 'Carboxylic acid (10.50 g/dm³)',
    alkaliLabel: 'NaOH (0.110 mol/dm³)',
    indicator: 'Phenolphthalein',
    endpointColor: 'Colourless → permanent pink',
    endpointTitre: 23.85, // representative value from s22 qp
    concentration: {
      alkali: 0.110,
      acidConc_g_dm3: 10.50,
    },
    instructions: [
      'Fill burette with NaOH (0.110 mol/dm³) to 0.00 cm³',
      'Pipette 25.00 cm³ of carboxylic acid into conical flask',
      'Add 3 drops of phenolphthalein indicator',
      'Add NaOH from burette, swirling continuously',
      'Stop at first permanent pink colour (≥30 s)',
      'Record titre to nearest 0.05 cm³',
    ]
  },
  s21: {
    label: 'S21 — FeSO₄ vs KMnO₄ (Redox)',
    acidLabel: 'FeSO₄·xH₂O (26.52 g/dm³)',
    alkaliLabel: 'KMnO₄ (0.0200 mol/dm³)',
    indicator: 'Self-indicating (KMnO₄)',
    endpointColor: 'Colourless → permanent purple/pink',
    endpointTitre: 24.60,
    concentration: {
      KMnO4: 0.0200,
      FeSO4_g_dm3: 26.52,
    },
    instructions: [
      'Fill burette with KMnO₄ (0.0200 mol/dm³) to 0.00 cm³',
      'Pipette 25.00 cm³ of FeSO₄ solution into conical flask',
      'Add ~10 cm³ dilute H₂SO₄ (acidify)',
      'Add KMnO₄ from burette, swirling continuously',
      'Stop at first permanent purple/pink colour (≥30 s)',
      'Record titre to nearest 0.05 cm³',
    ]
  },
}
