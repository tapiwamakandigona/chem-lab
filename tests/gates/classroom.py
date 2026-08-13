#!/usr/bin/env python3
"""Gate: classroom core logic (F38).

The classroom layer is pure ESM with no DOM dependency, so this gate imports
src/lib/classroom.js directly in Node and asserts the invariants that protect
learners and teachers: unambiguous join codes, no learner identity, item
validation against the real practical/unit/mock catalogues, replace-on-resubmit,
and a driver that touches no network. UI flows are covered by the teach/
joinclass/results gates.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
LIB = os.path.join(REPO, "src", "lib", "classroom.js")

failures = []


def check(name, ok, detail=""):
    print(f"{'PASS' if ok else 'FAIL'} {name}{(' ' + str(detail)) if detail else ''}")
    if not ok:
        failures.append(name)


HARNESS = r"""
import {
  CODE_ALPHABET, CODE_LENGTH, makeJoinCode, normaliseJoinCode, joinCodeError,
  sanitiseAlias, aliasError, sanitiseItems, itemExists, assignmentError,
  summariseSubmission, createLocalDriver, submissionsToCsv, MAX_ITEMS,
} from './src/lib/classroom.js'

// Deterministic rng so code/id generation is reproducible in the gate.
let seed = 42
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

class MemoryStorage {
  constructor() { this.map = new Map(); this.writes = 0 }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null }
  setItem(k, v) { this.writes += 1; this.map.set(k, String(v)) }
}

const out = {}

// --- join codes -------------------------------------------------------------
const codes = Array.from({ length: 400 }, () => makeJoinCode(rng))
out.codeLengths = [...new Set(codes.map((c) => c.length))]
out.badChars = [...new Set(codes.join('').split(''))].filter((c) => !CODE_ALPHABET.includes(c))
out.ambiguous = [...new Set(codes.join('').split(''))].filter((c) => 'O0I1LZ2S5B8'.includes(c))
out.alphabetCoverage = new Set(codes.join('').split('')).size
out.normalise = normaliseJoinCode(' ab3-cde ')
out.errEmpty = joinCodeError('')
out.errShort = joinCodeError('ACD')
out.errLookalike = joinCodeError('ACDEF0')
out.errValid = joinCodeError(codes[0].toLowerCase())

// --- learner identity -------------------------------------------------------
out.aliasTrim = sanitiseAlias('   Tapiwa    M   ')
out.aliasLong = sanitiseAlias('x'.repeat(80)).length
out.aliasControl = sanitiseAlias('Ta\u0000pi\u001fwa')
// Names legitimately contain hyphens and apostrophes; the control-char strip
// must not eat them, and tabs must collapse like any other whitespace.
out.aliasHyphen = sanitiseAlias('Ana-Maria')
out.aliasApostrophe = sanitiseAlias("N'anga")
out.aliasTab = sanitiseAlias('Rue\tKuda')
out.aliasNul = sanitiseAlias('A\u0000B')
out.aliasEmail = aliasError('kid@school.com')
out.aliasShort = aliasError('a')
out.aliasOk = aliasError('Rue')

// --- assignment items -------------------------------------------------------
out.realPractical = itemExists({ kind: 'practical', id: 'titration' })
out.fakePractical = itemExists({ kind: 'practical', id: 'nope' })
out.fakeMock = itemExists({ kind: 'mock', id: 'not-a-paper' })
out.badKind = itemExists({ kind: 'homework', id: 'titration' })
out.dedupe = sanitiseItems([
  { kind: 'practical', id: 'titration' },
  { kind: 'practical', id: 'titration' },
  { kind: 'mock', id: 'titration-s22' },
  { kind: 'practical', id: 'ghost' },
]).length
out.itemCap = sanitiseItems(
  Array.from({ length: 60 }, (_, i) => ({ kind: 'unit', id: `u${i}` }))
    .concat(Array.from({ length: 40 }, () => ({ kind: 'practical', id: 'titration' })))
).length <= MAX_ITEMS
out.asgNoTitle = assignmentError({ title: 'x', items: [{ kind: 'practical', id: 'titration' }] })
out.asgNoItems = assignmentError({ title: 'Week 1 practical', items: [] })
out.asgBadDate = assignmentError({
  title: 'Week 1 practical', items: [{ kind: 'practical', id: 'titration' }], dueAt: 'soon',
})
out.asgOk = assignmentError({
  title: 'Week 1 practical', items: [{ kind: 'practical', id: 'titration' }],
  dueAt: '2026-09-01T12:00:00.000Z',
})

// --- driver round trip, no network -----------------------------------------
const storage = new MemoryStorage()
const driver = createLocalDriver({ storage, rng })
const klass = await driver.createClass({ name: 'Form 6 Chemistry', teacherId: 't1' })
out.classCode = klass.code.length
const other = await driver.createClass({ name: 'Form 5', teacherId: 't2' })
out.codesDiffer = klass.code !== other.code
out.listMine = (await driver.listClasses({ teacherId: 't1' })).length
out.foundByCode = (await driver.findClassByCode(klass.code.toLowerCase()))?.id === klass.id
out.missingCode = (await driver.findClassByCode('QQQQQQ')) === null

const asg = await driver.publishAssignment({
  classId: klass.id,
  title: 'Titration + marked calculation',
  items: [
    { kind: 'practical', id: 'titration' },
    { kind: 'mock', id: 'titration-s22' },
    { kind: 'practical', id: 'ghost' },
  ],
})
out.asgItems = asg.items.length
out.asgListed = (await driver.listAssignments({ classId: klass.id })).length

const goodPayload = {
  format: 'chemlab-progress',
  version: 1,
  exportedAt: new Date().toISOString(),
  courseDone: {},
  mockResults: { 'titration-s22': { score: 5, total: 6 } },
}
const summary = summariseSubmission(goodPayload, asg.items)
// Same assignment, but this learner has ticked a titration guide milestone, so
// the practical must now count as done.
const withPractical = summariseSubmission(
  { ...goodPayload, courseDone: { 'titration-endpoint': true } },
  asg.items
)
out.practicalRequired = withPractical.requiredCount
out.practicalDone = withPractical.doneCount
out.practicalComplete = withPractical.complete
out.summaryMarks = summary.marks
out.summaryAvailable = summary.available
out.summaryRequired = summary.requiredCount
out.summaryDone = summary.doneCount
out.summaryComplete = summary.complete

let rejected = 'accepted'
try {
  summariseSubmission({ format: 'not-chemlab', version: 1 }, asg.items)
} catch (err) {
  rejected = 'rejected'
}
out.foreignPayload = rejected

await driver.submitResults({ assignmentId: asg.id, alias: 'Rue', payload: goodPayload, summary })
await driver.submitResults({ assignmentId: asg.id, alias: 'Rue', payload: goodPayload, summary })
await driver.submitResults({ assignmentId: asg.id, alias: 'Kuda', payload: goodPayload, summary })
const subs = await driver.listSubmissions({ assignmentId: asg.id })
out.subCount = subs.length
out.subAliases = subs.map((s) => s.alias).sort().join('|')
out.csvHeader = submissionsToCsv(subs, asg).split('\n')[0]
out.csvRows = submissionsToCsv(subs, asg).split('\n').length
out.csvInjection = submissionsToCsv(
  [{ alias: 'a,b"c', submittedAt: 'now', summary: summary }], asg
).split('\n')[1]
out.storageWrites = storage.writes > 0
out.usedFetch = typeof globalThis.__fetchCalled === 'undefined' ? false : globalThis.__fetchCalled

console.log('__RESULT__' + JSON.stringify(out))
"""


def main():
    if not os.path.exists(LIB):
        sys.exit(f"missing {LIB}")
    harness_path = os.path.join(REPO, ".classroom-gate.mjs")
    with open(harness_path, "w") as fh:
        fh.write(HARNESS)
    try:
        # Trip a hard failure if the classroom layer ever reaches the network.
        proc = subprocess.run(
            ["node", "--input-type=module", "-e",
             "globalThis.fetch = () => { globalThis.__fetchCalled = true;"
             " throw new Error('classroom layer must not fetch') };"
             f"await import('file://{harness_path}')"],
            cwd=REPO, capture_output=True, text=True, timeout=120,
        )
    finally:
        if os.path.exists(harness_path):
            os.remove(harness_path)

    if proc.returncode != 0:
        print(proc.stdout[-2000:])
        print(proc.stderr[-2000:], file=sys.stderr)
        sys.exit("node harness failed")

    line = next((l for l in proc.stdout.splitlines() if l.startswith("__RESULT__")), None)
    if not line:
        print(proc.stdout[-2000:])
        sys.exit("no result from harness")
    r = json.loads(line[len("__RESULT__"):])

    check("join codes are all 6 characters", r["codeLengths"] == [CODE_LEN := 6], r["codeLengths"])
    check("join codes only use the safe alphabet", r["badChars"] == [], r["badChars"])
    check("join codes contain no lookalike characters", r["ambiguous"] == [], r["ambiguous"])
    check("code generator uses the whole alphabet", r["alphabetCoverage"] >= 20, r["alphabetCoverage"])
    check("codes normalise from typed input", r["normalise"] == "AB3CDE", r["normalise"])
    check("empty code is explained", isinstance(r["errEmpty"], str))
    check("short code is explained", isinstance(r["errShort"], str))
    check("lookalike char is named in the error", "0" in (r["errLookalike"] or ""), r["errLookalike"])
    check("valid lower-case code passes", r["errValid"] is None, r["errValid"])

    check("alias whitespace collapses", r["aliasTrim"] == "Tapiwa M", r["aliasTrim"])
    check("alias length capped", r["aliasLong"] == 24, r["aliasLong"])
    check("alias strips control characters", r["aliasControl"] == "Tapiwa", r["aliasControl"])
    check("alias keeps hyphens", r["aliasHyphen"] == "Ana-Maria", r["aliasHyphen"])
    check("alias keeps apostrophes", r["aliasApostrophe"] == "N'anga", r["aliasApostrophe"])
    check("alias collapses tabs to a space", r["aliasTab"] == "Rue Kuda", r["aliasTab"])
    check("alias strips NUL", r["aliasNul"] == "AB", repr(r["aliasNul"]))
    check("email address refused as alias", isinstance(r["aliasEmail"], str), r["aliasEmail"])
    check("one-character alias refused", isinstance(r["aliasShort"], str))
    check("normal alias accepted", r["aliasOk"] is None, r["aliasOk"])

    check("real practical validates", r["realPractical"] is True)
    check("unknown practical rejected", r["fakePractical"] is False)
    check("unknown mock paper rejected", r["fakeMock"] is False)
    check("unknown item kind rejected", r["badKind"] is False)
    check("items dedupe and drop unknowns", r["dedupe"] == 2, r["dedupe"])
    check("item count capped", r["itemCap"] is True)
    check("short assignment title refused", isinstance(r["asgNoTitle"], str))
    check("empty assignment refused", isinstance(r["asgNoItems"], str))
    check("invalid due date refused", isinstance(r["asgBadDate"], str))
    check("valid assignment accepted", r["asgOk"] is None, r["asgOk"])

    check("created class gets a 6-char code", r["classCode"] == 6, r["classCode"])
    check("two classes get different codes", r["codesDiffer"] is True)
    check("classes scope to their teacher", r["listMine"] == 1, r["listMine"])
    check("class found by lower-case code", r["foundByCode"] is True)
    check("unknown code returns nothing", r["missingCode"] is True)
    check("published assignment drops unknown item", r["asgItems"] == 2, r["asgItems"])
    check("assignment listed for its class", r["asgListed"] == 1, r["asgListed"])

    check("summary totals mock marks", r["summaryMarks"] == 5, r["summaryMarks"])
    check("summary totals available marks", r["summaryAvailable"] == 6, r["summaryAvailable"])
    # Rule changed deliberately in iter-55: practicals used to count for
    # nothing, so a learner who had done the work showed as "0/1" in the
    # teacher's table. A practical is now required, and counts as done once any
    # of its guide milestones is ticked.
    check("practicals and mocks both count as required", r["summaryRequired"] == 2, r["summaryRequired"])
    check("required mock counts as done", r["summaryDone"] == 1, r["summaryDone"])
    check("not complete while the practical has no evidence", r["summaryComplete"] is False)
    check("practical counts as required", r["practicalRequired"] == 2, r["practicalRequired"])
    check("practical with a ticked milestone counts as done", r["practicalDone"] == 2, r["practicalDone"])
    check("assignment completes once every item has evidence", r["practicalComplete"] is True)
    check("foreign payload rejected", r["foreignPayload"] == "rejected", r["foreignPayload"])

    check("resubmit replaces instead of duplicating", r["subCount"] == 2, r["subCount"])
    check("both learners listed", r["subAliases"] == "Kuda|Rue", r["subAliases"])
    check("csv header is stable",
          r["csvHeader"] == "alias,submitted_at,items_done,items_required,mock_marks,mock_available",
          r["csvHeader"])
    check("csv has one row per submission", r["csvRows"] == 3, r["csvRows"])
    check("csv quotes commas and quotes", r["csvInjection"].startswith('"a,b""c"'), r["csvInjection"])
    check("local driver persists to storage", r["storageWrites"] is True)
    check("classroom layer never fetches", r["usedFetch"] is False)

    print(f"\nclassroom gate: {'PASS' if not failures else 'FAIL'}")
    if failures:
        sys.exit(f"GATE FAIL: {failures}")


if __name__ == "__main__":
    main()
