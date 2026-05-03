// Pure chemistry calculations — no React, no Three.js
// Unit-tested independently

/**
 * Titration endpoint calculator
 * For 1:1 acid/base:  n(acid) = n(base)
 * For KMnO4/Fe2+:    MnO4- + 5Fe2+ → ratio 1:5
 */

export function calcEndpointVolume({ preset, analyte_vol_cm3 }) {
  if (preset === 's22_titration') {
    // 10.50 g/dm³ carboxylic acid, Mr = 60.05 (propanoic acid C2H5COOH = 74? let's use what paper gives)
    // Paper doesn't give Mr — student determines it. We use 60.05 as placeholder.
    const c_acid = 10.50 / 60.05              // mol/dm³
    const n_acid = c_acid * (analyte_vol_cm3 / 1000)
    const c_NaOH = 0.110
    const v_NaOH_dm3 = n_acid / c_NaOH
    return parseFloat((v_NaOH_dm3 * 1000).toFixed(2))  // cm³
  }
  if (preset === 's21_redox') {
    // FeSO4·xH2O 26.52 g/dm³, assuming x=7, Mr=278.01
    const c_Fe = (26.52 / 278.01)
    const n_Fe = c_Fe * (analyte_vol_cm3 / 1000)
    const n_Mn = n_Fe / 5
    const v_KMnO4_dm3 = n_Mn / 0.0200
    return parseFloat((v_KMnO4_dm3 * 1000).toFixed(2))
  }
  return null
}

/**
 * Round to nearest 0.05 (burette precision)
 */
export function roundBurette(v) {
  return Math.round(v * 20) / 20
}

/**
 * Calculate mean titre, excluding outliers (>0.1 cm³ from others)
 */
export function meanTitre(readings) {
  if (readings.length < 2) return null
  const titres = readings.map(r => r.titre)
  const avg = titres.reduce((a, b) => a + b, 0) / titres.length
  const concordant = titres.filter(t => Math.abs(t - avg) <= 0.10)
  if (concordant.length < 2) return parseFloat(avg.toFixed(2))
  return parseFloat((concordant.reduce((a, b) => a + b, 0) / concordant.length).toFixed(2))
}
