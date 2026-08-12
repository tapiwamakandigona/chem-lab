// Paper chromatography — Cambridge 9701 AS practical technique: separate a
// food-dye unknown, measure Rf values against the solvent front, and match
// them to a reference table to identify the component dyes.
//
// Pure data + pure functions. No store imports.

// Reference dyes with true Rf in the standard (aqueous NaCl) solvent.
// Rf values chosen so every unknown pair is unambiguous at ±0.05.
export const DYES = {
  E102: { name: 'tartrazine', rf: 0.18, color: '#e8c517' },
  E110: { name: 'sunset yellow', rf: 0.35, color: '#e67e22' },
  E122: { name: 'carmoisine', rf: 0.50, color: '#c0392b' },
  E133: { name: 'brilliant blue', rf: 0.68, color: '#2e86de' },
  E127: { name: 'erythrosine', rf: 0.82, color: '#e84393' },
}

// Unknown food colourings (each a mixture of two dyes).
export const CHROMA_UNKNOWNS = {
  fb20: { label: 'FB 20', dyes: ['E102', 'E133'] },
  fb21: { label: 'FB 21', dyes: ['E110', 'E122'] },
  fb22: { label: 'FB 22', dyes: ['E102', 'E127'] },
  fb23: { label: 'FB 23', dyes: ['E122', 'E133'] },
  fb24: { label: 'FB 24', dyes: ['E110', 'E127'] },
}

// Solvent-front travel from the baseline when development completes (cm).
export const FRONT_CM = 8.0

// Spot travel for a dye, rounded to the 1 mm a ruler resolves.
export function spotDistanceCm(dyeId) {
  return Math.round(DYES[dyeId].rf * FRONT_CM * 10) / 10
}

// Readings table for a completed chromatogram: sorted baseline->front so
// spot numbering matches what the student sees on the paper.
export function chromaReadings(unknownId) {
  const u = CHROMA_UNKNOWNS[unknownId]
  if (!u) return []
  return u.dyes
    .map((d) => ({ dye: d, dist: spotDistanceCm(d), color: DYES[d].color }))
    .sort((a, b) => a.dist - b.dist)
}

// Rf tolerance: ±0.05 absorbs the 1 mm reading rounding with margin.
export const RF_TOL = 0.05

// Marking (2 marks, evidence-required like the other experiments):
// 1 — both component dyes identified (exact set, order-free)
// 2 — an Rf value entered for each spot, each within RF_TOL of the truth;
//     only credited when the chromatogram was actually developed.
export function markChroma(unknownId, answerDyes, rfEntries, developed) {
  const u = CHROMA_UNKNOWNS[unknownId]
  const truth = [...u.dyes].sort()
  const ans = [...(answerDyes || [])].sort()
  const dyesOk = truth.length === ans.length && truth.every((d, i) => d === ans[i])
  const readings = chromaReadings(unknownId)
  const rfOk =
    developed &&
    readings.length > 0 &&
    readings.every((r, i) => {
      const v = parseFloat(rfEntries?.[i])
      return Number.isFinite(v) && Math.abs(v - r.dist / FRONT_CM) <= RF_TOL
    })
  const total = (dyesOk ? 1 : 0) + (rfOk ? 1 : 0)
  return {
    ok: dyesOk && rfOk,
    dyesOk,
    rfOk,
    developed,
    total,
    max: 2,
    dyeNames: u.dyes.map((d) => DYES[d].name).join(' + '),
  }
}
