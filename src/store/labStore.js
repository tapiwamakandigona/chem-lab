import { create } from 'zustand'

// ── Chemistry state ──────────────────────────────────────────
// All volumes in cm³, concentrations in mol/dm³
// Burette reads to 0.05 cm³ precision (CAIE Paper 3 standard)
// ─────────────────────────────────────────────────────────────

const PRESETS = {
  s22_titration: {
    label: 'June 2022 — Acid/Base Titration',
    analyte: { name: 'Carboxylic acid', conc: 10.50 / 60.05, vol_cm3: 25.00, unit: 'g/dm³ → mol/dm³' },
    // 10.50 g/dm³ of unknown monobasic acid, Mr ~60 → ~0.175 mol/dm³ but students find Mr
    // Titrant in burette: NaOH 0.110 mol/dm³
    titrant: { name: 'NaOH', conc: 0.110, label: '0.110 mol/dm³ NaOH' },
    indicatorColor: { start: '#f0f0ff', end: '#e879f9' }, // colorless → pink (phenolphthalein)
    indicator: 'Phenolphthalein',
    note: '9701_s22_qp_31 — 25.00 cm³ pipette into conical flask',
  },
  s21_redox: {
    label: 'June 2021 — Redox Titration',
    analyte: { name: 'FeSO₄·xH₂O', conc_g: 26.52, vol_cm3: 25.00, unit: 'g/dm³' },
    titrant: { name: 'KMnO₄', conc: 0.0200, label: '0.0200 mol/dm³ KMnO₄' },
    indicatorColor: { start: '#e0f0ff', end: '#c084fc' }, // pale blue-green → pink/purple (self-indicating)
    indicator: 'Self-indicating (KMnO₄)',
    note: '9701_s21_qp_31 — acidified permanganate; endpoint = first permanent pink',
  },
}

export const useLabStore = create((set, get) => ({
  // ── Scene ─────────────────────────────────────────────────
  activeExperiment: 'titration', // 'titration' | 'clock' | 'enthalpy'
  quality: 'medium',             // 'low' | 'medium' | 'high'
  isMobile: window.innerWidth < 768,
  showHelp: false,
  toast: null,

  // ── Active preset ─────────────────────────────────────────
  preset: 's22_titration',
  presets: PRESETS,
  getPreset: () => PRESETS[get().preset],

  // ── Titration state ───────────────────────────────────────
  titration: {
    buretteVolume: 50.00,     // starting volume in burette (cm³)
    dispensed: 0.00,          // total dispensed so far
    readings: [],             // [{trial, initial, final, titre}]
    currentTrial: 1,
    pipetteFilled: false,
    flaskFilled: false,
    indicatorAdded: false,
    endpointReached: false,
    color: '#f0f0ff',         // live flask color
    dripping: false,          // is the stopcock open?
    flowRate: 0.5,            // cm³/s when open
  },

  // ── Actions ───────────────────────────────────────────────
  setQuality: (q) => set({ quality: q }),
  setPreset:  (p) => set({ preset: p }),
  setToast:   (msg, duration = 2500) => {
    set({ toast: msg })
    setTimeout(() => set({ toast: null }), duration)
  },
  toggleHelp: () => set(s => ({ showHelp: !s.showHelp })),

  fillPipette: () => set(s => {
    if (s.titration.pipetteFilled) return {}
    return { titration: { ...s.titration, pipetteFilled: true } }
  }),

  fillFlask: () => set(s => {
    if (!s.titration.pipetteFilled) return {}
    return { titration: { ...s.titration, flaskFilled: true, color: '#e8f4e8' } }
  }),

  addIndicator: () => set(s => {
    if (!s.titration.flaskFilled) return {}
    const startColor = get().getPreset()?.indicatorColor?.start ?? '#f0f0ff'
    return { titration: { ...s.titration, indicatorAdded: true, color: startColor } }
  }),

  setDripping: (val) => set(s => ({
    titration: { ...s.titration, dripping: val }
  })),

  // Called each animation frame when dripping=true; delta in seconds
  tickDispense: (delta) => set(s => {
    const t = s.titration
    if (!t.dripping || t.endpointReached) return { titration: { ...t, dripping: false } }

    const added = parseFloat((t.flowRate * delta).toFixed(4))
    const dispensed = parseFloat((t.dispensed + added).toFixed(2))
    const buretteVolume = parseFloat((t.buretteVolume - added).toFixed(2))

    // Endpoint: for s22 acid/base — equivalence ~23.5 cm³ NaOH  (Tapiwa will do actual calc)
    // We calculate dynamically: n(titrant) dispensed vs n(analyte)
    const preset = PRESETS[s.preset]
    let endpointReached = false
    let color = t.color

    if (t.indicatorAdded) {
      const conc_t = preset.titrant.conc          // mol/dm³
      const vol_t_dm3 = dispensed / 1000           // cm³ → dm³
      const n_titrant = conc_t * vol_t_dm3

      const vol_a_dm3 = preset.analyte.vol_cm3 / 1000
      // For acid/base: n(NaOH) = n(acid), monoprotic
      let n_analyte
      if (s.preset === 's22_titration') {
        n_analyte = (10.50 / 60.05) * vol_a_dm3 * 1000 * vol_a_dm3
        // Actually: conc = 10.50/60.05 mol/dm³ = 0.1748
        n_analyte = 0.1748 * vol_a_dm3
      } else if (s.preset === 's21_redox') {
        // MnO4- + 5Fe2+ + 8H+ → Mn2+ + 5Fe3+ + 4H2O  (ratio 1:5)
        const Mr_FeSO4xH2O_approx = 278 // x=7
        n_analyte = (26.52 / Mr_FeSO4xH2O_approx) * vol_a_dm3
        if (n_titrant >= n_analyte / 5) endpointReached = true
      }

      if (s.preset === 's22_titration') {
        // Smooth color gradient colorless → pink
        const ratio = Math.min(n_titrant / n_analyte, 1.2)
        if (ratio >= 1.0) endpointReached = true
        // interpolate R:240→232, G:240→121, B:255→249
        const r = Math.round(240 - (240 - 232) * Math.min(ratio, 1))
        const g = Math.round(240 - (240 - 121) * Math.min(ratio * 2, 1))
        const b = 255
        color = `rgb(${r},${g},${b})`
      } else if (s.preset === 's21_redox') {
        // pale to purple
        const ratio = Math.min((n_titrant * 5) / n_analyte, 1.2)
        if (ratio >= 1.0) endpointReached = true
        const r = Math.round(224 - (224 - 192) * Math.min(ratio, 1))
        const g = Math.round(240 - (240 - 132) * Math.min(ratio, 1))
        const b = Math.round(255 - (255 - 252) * Math.min(ratio, 1))
        color = `rgb(${r},${g},${b})`
      }
    }

    if (endpointReached && !t.endpointReached) {
      // snap endpoint color
      color = preset.indicatorColor.end
    }

    return {
      titration: {
        ...t,
        dispensed,
        buretteVolume: Math.max(0, buretteVolume),
        color,
        endpointReached,
        dripping: !endpointReached,
      }
    }
  }),

  recordReading: () => set(s => {
    const t = s.titration
    const initial = parseFloat((50.00 - (t.buretteVolume + t.dispensed)).toFixed(2))
    const final   = parseFloat((50.00 - t.buretteVolume).toFixed(2))
    const titre   = parseFloat(t.dispensed.toFixed(2))
    const readings = [...t.readings, { trial: t.currentTrial, initial, final, titre }]
    return { titration: { ...t, readings, currentTrial: t.currentTrial + 1 } }
  }),

  resetTitration: () => set(s => ({
    titration: {
      ...s.titration,
      buretteVolume: 50.00,
      dispensed: 0.00,
      pipetteFilled: false,
      flaskFilled: false,
      indicatorAdded: false,
      endpointReached: false,
      color: '#f0f0ff',
      dripping: false,
      // keep readings
    }
  })),

  clearReadings: () => set(s => ({
    titration: {
      ...s.titration,
      readings: [],
      currentTrial: 1,
    }
  })),
}))
