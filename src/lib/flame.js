// Flame-test identification — an enrichment practical supporting Cambridge
// AS/A-Level qualitative observation skills. The current 9701 Paper 3
// qualitative-analysis notes do not tabulate flame colours, so the UI labels
// this as enrichment rather than claiming it is an examinable Paper 3 table.
//
// Technique modelled here: clean a nichrome loop with dilute HCl, heat it
// until no persistent colour is seen, load a chloride sample, then place it
// in the hottest part of a non-luminous Bunsen flame. Sodium contamination
// can mask weaker colours; cobalt-blue glass absorbs that yellow emission.

export const FLAME_IONS = {
  Li: {
    name: 'lithium',
    ion: 'Li⁺',
    salt: 'LiCl',
    flame: 'crimson red',
    color: '#ed3754',
  },
  Na: {
    name: 'sodium',
    ion: 'Na⁺',
    salt: 'NaCl',
    flame: 'intense yellow',
    color: '#ffd21f',
  },
  K: {
    name: 'potassium',
    ion: 'K⁺',
    salt: 'KCl',
    flame: 'lilac',
    color: '#bc7cff',
  },
  Ca: {
    name: 'calcium',
    ion: 'Ca²⁺',
    salt: 'CaCl₂',
    flame: 'orange-red',
    color: '#ff653f',
  },
  Cu: {
    name: 'copper(II)',
    ion: 'Cu²⁺',
    salt: 'CuCl₂',
    flame: 'blue-green',
    color: '#26d6a0',
  },
}

export const FLAME_UNKNOWNS = {
  ft1: { label: 'FT 1', ion: 'Li' },
  ft2: { label: 'FT 2', ion: 'Na' },
  ft3: { label: 'FT 3', ion: 'K' },
  ft4: { label: 'FT 4', ion: 'Ca' },
  ft5: { label: 'FT 5', ion: 'Cu' },
}

/**
 * What a learner sees for a sample in the flame.
 *
 * A dirty loop is modelled as sodium-contaminated: without the cobalt filter,
 * its intense yellow masks the sample. Through cobalt glass the yellow is
 * absorbed and a non-sodium sample's underlying colour becomes visible.
 */
export function flameAppearance(unknownId, clean, cobaltGlass = false) {
  const unknown = FLAME_UNKNOWNS[unknownId]
  const ion = FLAME_IONS[unknown?.ion] ?? FLAME_IONS.Na

  if (!clean && !cobaltGlass) {
    return {
      color: FLAME_IONS.Na.color,
      label: FLAME_IONS.Na.flame,
      note: 'sodium contamination masks the sample colour',
      masked: true,
    }
  }

  if (cobaltGlass && unknown?.ion === 'Na') {
    return {
      color: '#5b658e',
      label: 'very faint — yellow absorbed by cobalt glass',
      note: clean
        ? 'the filter removes most sodium emission'
        : 'the filter removes the contaminating sodium emission',
      masked: false,
    }
  }

  return {
    color: ion.color,
    label: ion.flame,
    note: !clean && cobaltGlass
      ? `cobalt glass absorbs the yellow; ${ion.flame} remains visible`
      : `${ion.name} emission`,
    masked: false,
  }
}

/**
 * Two-mark evidence-based conclusion:
 *  1 — identify the cation;
 *  2 — support that conclusion with an observation made using a loop that
 *      was acid-cleaned and heated to a colourless blank first.
 */
export function markFlame(unknownId, answer, observations) {
  const unknown = FLAME_UNKNOWNS[unknownId]
  const ion = FLAME_IONS[unknown?.ion]
  const identityOk = answer === unknown?.ion
  const evidence = (observations || []).some(
    (o) => o.unknown === unknownId && o.kind === 'sample' && o.clean === true,
  )
  const total = (identityOk ? 1 : 0) + (identityOk && evidence ? 1 : 0)
  return {
    ok: identityOk && evidence,
    identityOk,
    evidence,
    total,
    max: 2,
    ionName: ion?.name ?? '',
    ionSymbol: ion?.ion ?? '',
    flame: ion?.flame ?? '',
  }
}
