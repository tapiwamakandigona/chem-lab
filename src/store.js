import { create } from 'zustand'

// Quality tiers for low-end device support (Zimbabwe context)
export const QUALITY = { LOW: 'low', MED: 'med', HIGH: 'high' }

// Detect device capability on first load
function detectQuality() {
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
  setQuality: (q) => set({ quality: q }),

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
