// Mock-paper marking engine — mirrors how 9701 Paper 3 mark schemes work:
// each part has an expected value computed from TRUE data, but "error
// carried forward" (ECF) means a wrong earlier answer still earns later
// marks if the follow-through arithmetic is right.

// A part spec: { id, prompt, marks, unit, sf, expected(ctx), ecf(ctx, answers) }
// ctx = experiment-derived true values; answers = parsed student numbers.

export function parseNum(txt) {
  if (typeof txt !== 'string') return NaN
  const clean = txt.replace(/[, ]+/g, '').replace(/×10\^?/i, 'e').replace(/x10\^?/i, 'e')
  return parseFloat(clean)
}

// Accept within relTol (default 1%) of either the true-value answer or the
// ECF answer following from the student's own earlier numbers.
export function markPart(part, ctx, answers) {
  const v = parseNum(answers[part.id])
  if (Number.isNaN(v)) return { ok: false, why: 'no answer' }
  const target = part.expected(ctx)
  const relTol = part.relTol ?? 0.01
  const ok = (t) =>
    Number.isFinite(t) && Math.abs(v - t) <= Math.max(Math.abs(t) * relTol, part.absTol ?? 0)
  if (ok(target)) return { ok: true, why: 'correct' }
  if (part.ecf) {
    const ecfTarget = part.ecf(ctx, answers)
    if (ok(ecfTarget)) return { ok: true, why: 'ecf' }
  }
  return { ok: false, why: 'wrong', target }
}

export function markPaper(parts, ctx, answers) {
  const results = {}
  let score = 0
  for (const part of parts) {
    const r = markPart(part, ctx, answers)
    results[part.id] = r
    if (r.ok) score += part.marks
  }
  const total = parts.reduce((s, p) => s + p.marks, 0)
  return { results, score, total }
}

// ---- S22 titration paper (9701/31/M/J/22 Q1 style, 1:1 NaOH:HA) ----
export const TITRATION_PAPER_S22 = {
  id: 'titration-s22',
  title: 'Mock Paper — Q1 (S22 style)',
  requires: 'concordant',
  intro:
    'Use your own results. Marks follow the real scheme: a slip in one part ' +
    'is carried forward, so later working can still score.',
  parts: [
    {
      id: 'a',
      prompt: '(a) Mean titre from your two concordant results (cm³)',
      marks: 1,
      unit: 'cm³',
      relTol: 0,
      absTol: 0.055,
      expected: (ctx) => ctx.meanTitre,
    },
    {
      id: 'b',
      prompt: '(b) Moles of NaOH in the mean titre (mol)  [c(NaOH) = 0.110 mol/dm³]',
      marks: 1,
      unit: 'mol',
      expected: (ctx) => (0.110 * ctx.meanTitre) / 1000,
      ecf: (ctx, ans) => (0.110 * parseNum(ans.a)) / 1000,
    },
    {
      id: 'c',
      prompt: '(c) Moles of acid HA in 25.00 cm³ (mol)  [HA + NaOH → NaA + H₂O]',
      marks: 1,
      unit: 'mol',
      expected: (ctx) => (0.110 * ctx.meanTitre) / 1000,
      ecf: (ctx, ans) => parseNum(ans.b),
    },
    {
      id: 'd',
      prompt: '(d) Concentration of HA (mol/dm³)',
      marks: 1,
      unit: 'mol/dm³',
      expected: (ctx) => ((0.110 * ctx.meanTitre) / 1000) * (1000 / 25.0),
      ecf: (ctx, ans) => parseNum(ans.c) * (1000 / 25.0),
    },
    {
      id: 'e',
      prompt: '(e) Mr of HA  [the acid solution contains 10.50 g/dm³]',
      marks: 2,
      unit: 'g/mol',
      expected: (ctx) => 10.50 / (((0.110 * ctx.meanTitre) / 1000) * (1000 / 25.0)),
      ecf: (ctx, ans) => 10.50 / parseNum(ans.d),
    },
  ],
}

export function titrationPaperCtx(titreValues) {
  for (let i = 0; i < titreValues.length - 1; i++)
    for (let j = i + 1; j < titreValues.length; j++)
      if (Math.abs(titreValues[i] - titreValues[j]) <= 0.1)
        return { meanTitre: (titreValues[i] + titreValues[j]) / 2 }
  return null
}

// ---- S23 iodine clock paper (9701/31/M/J/23 Q2 style, rate analysis) ----
// ctx = { results: [{conc, time, rate}] } — the student's OWN five runs.
export const CLOCK_PAPER_S23 = {
  id: 'clock-s23',
  title: 'Mock Paper — Q2 (S23 style)',
  requires: 'five runs',
  intro:
    'Use your own recorded times. Rate = 1000/t. A slip carried forward ' +
    'still earns later marks (ECF), exactly like the real mark scheme.',
  parts: [
    {
      id: 'a',
      prompt: '(a) Rate for your 0.100 mol/dm³ run (rate = 1000/t, in s⁻¹ ×10³)',
      marks: 1,
      unit: 's⁻¹ ×10³',
      expected: (ctx) => 1000 / ctx.results.find((r) => Math.abs(r.conc - 0.1) < 1e-9).time,
    },
    {
      id: 'b',
      prompt: '(b) Gradient of your rate vs [S₂O₃²⁻] graph (best-fit through origin)',
      marks: 2,
      unit: '(s⁻¹ ×10³)/(mol dm⁻³)',
      relTol: 0.05,
      expected: (ctx) => {
        // least-squares through origin: sum(xy)/sum(x^2)
        const sxy = ctx.results.reduce((s, r) => s + r.conc * (1000 / r.time), 0)
        const sxx = ctx.results.reduce((s, r) => s + r.conc * r.conc, 0)
        return sxy / sxx
      },
      ecf: (ctx, ans) => parseNum(ans.a) / 0.1,
    },
    {
      id: 'c',
      prompt: '(c) Order of reaction with respect to S₂O₃²⁻ (a straight line through the origin means rate ∝ [S₂O₃²⁻]ⁿ; give n)',
      marks: 1,
      unit: '',
      relTol: 0,
      absTol: 0.01,
      expected: () => 1,
    },
    {
      id: 'd',
      prompt: '(d) Predicted time (s) for a 0.050 mol/dm³ run  [t = 1000/rate, rate from your gradient]',
      marks: 2,
      unit: 's',
      relTol: 0.05,
      expected: (ctx) => {
        const sxy = ctx.results.reduce((s, r) => s + r.conc * (1000 / r.time), 0)
        const sxx = ctx.results.reduce((s, r) => s + r.conc * r.conc, 0)
        return 1000 / ((sxy / sxx) * 0.05)
      },
      ecf: (ctx, ans) => 1000 / (parseNum(ans.b) * 0.05),
    },
  ],
}

export function clockPaperCtx(results) {
  if (results.length < 5) return null
  if (!results.some((r) => Math.abs(r.conc - 0.1) < 1e-9)) return null
  return { results }
}

// ---- S20 enthalpy paper (9701/31/M/J/20 Q2 style, cooling-corrected) ----
// ctx = { mass, volume, T1, Textrap } — Textrap from the student's cooling
// curve extrapolation (the corrected T2).
export const ENTHALPY_PAPER_S20 = {
  id: 'enthalpy-s20',
  title: 'Mock Paper — Q2 (S20 style)',
  requires: 'completed run',
  intro:
    'Use your own run and your cooling-curve extrapolation. ' +
    'ECF applies: carried-forward slips still score.',
  parts: [
    {
      id: 'a',
      prompt: '(a) Corrected temperature rise ΔT = T(extrapolated) − T₁ (°C)',
      marks: 1,
      unit: '°C',
      relTol: 0,
      absTol: 0.15,
      expected: (ctx) => ctx.Textrap - ctx.T1,
    },
    {
      id: 'b',
      prompt: '(b) Heat released q = V × 4.2 × ΔT (J)  [assume 4.2 J cm⁻³ K⁻¹]',
      marks: 1,
      unit: 'J',
      expected: (ctx) => ctx.volume * 4.2 * (ctx.Textrap - ctx.T1),
      ecf: (ctx, ans) => ctx.volume * 4.2 * parseNum(ans.a),
    },
    {
      id: 'c',
      prompt: '(c) Moles of Na₂CO₃ dissolved  [Mr = 106]',
      marks: 1,
      unit: 'mol',
      expected: (ctx) => ctx.mass / 106,
    },
    {
      id: 'd',
      prompt: '(d) ΔH(solution) in kJ/mol — include the sign (temperature rose)',
      marks: 2,
      unit: 'kJ/mol',
      expected: (ctx) => -(ctx.volume * 4.2 * (ctx.Textrap - ctx.T1)) / (ctx.mass / 106) / 1000,
      ecf: (ctx, ans) => -parseNum(ans.b) / parseNum(ans.c) / 1000,
    },
  ],
}

export function enthalpyPaperCtx(enthalpy, analysis) {
  if (!analysis || !Number.isFinite(analysis.Textrap)) return null
  return {
    mass: enthalpy.mass,
    volume: enthalpy.volume,
    T1: enthalpy.T1,
    Textrap: analysis.Textrap,
  }
}
