// Electrochemical cells — Cambridge 9701 A2 practical style: identify an
// unknown metal electrode from measured cell potentials against known
// reference half-cells (Cu²⁺/Cu and Zn²⁺/Zn, both 1.00 mol/dm³).
//
// Pure data + pure functions. No store imports.

// Standard electrode potentials, V vs SHE (Data Booklet values).
export const ELECTRODES = {
  Mg: { name: 'magnesium', e0: -2.38 },
  Zn: { name: 'zinc', e0: -0.76 },
  Fe: { name: 'iron', e0: -0.44 },
  Ni: { name: 'nickel', e0: -0.25 },
  Pb: { name: 'lead', e0: -0.13 },
  Cu: { name: 'copper', e0: +0.34 },
  Ag: { name: 'silver', e0: +0.80 },
}

// References the student can wire the unknown against.
export const REFERENCES = ['Cu', 'Zn']

// Unknown electrodes offered (Cu/Zn excluded — they are the references).
export const ELECTRO_UNKNOWNS = {
  fb15: { label: 'FB 15', metal: 'Mg' },
  fb16: { label: 'FB 16', metal: 'Fe' },
  fb17: { label: 'FB 17', metal: 'Ni' },
  fb18: { label: 'FB 18', metal: 'Pb' },
  fb19: { label: 'FB 19', metal: 'Ag' },
}

// Measured cell EMF for unknown u against reference r.
// Voltmeter reads |E(ref) − E(unknown)| to 0.01 V; polarity tells the
// student which terminal the unknown is.
export function measureCell(unknownId, ref) {
  const u = ELECTRO_UNKNOWNS[unknownId]
  if (!u || !REFERENCES.includes(ref)) return null
  const eU = ELECTRODES[u.metal].e0
  const eR = ELECTRODES[ref].e0
  const emf = Math.round(Math.abs(eR - eU) * 100) / 100
  // unknown is the negative terminal when it has the lower (more negative) E°
  const unknownIsNegative = eU < eR
  return {
    ref,
    emf,
    unknownIsNegative,
    obs: `E cell = ${emf.toFixed(2)} V — unknown is the ${unknownIsNegative ? 'negative (−)' : 'positive (+)'} terminal`,
  }
}

// Every unknown must be uniquely identified by its (vsCu, vsZn) pair.
export function signature(metal) {
  const e = ELECTRODES[metal].e0
  const vs = (r) => Math.round(Math.abs(ELECTRODES[r].e0 - e) * 100) / 100
  return `${vs('Cu')}|${vs('Zn')}`
}

// Marking: metal right (1) + at least one cell actually measured (1).
// Full deduction credit needs BOTH references measured (distinguishes
// magnitude-only guesses), mirroring how P5-style planning marks work.
export function markElectro(unknownId, metalAnswer, measuredRefs) {
  const u = ELECTRO_UNKNOWNS[unknownId]
  const metalOk = metalAnswer === u.metal
  const evidence = REFERENCES.every((r) => measuredRefs.includes(r))
  const total = (metalOk ? 1 : 0) + (metalOk && evidence ? 1 : 0)
  return {
    ok: metalOk && evidence,
    metalOk,
    evidence,
    total,
    max: 2,
    metalName: ELECTRODES[u.metal].name,
  }
}
