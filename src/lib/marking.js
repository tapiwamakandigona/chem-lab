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
