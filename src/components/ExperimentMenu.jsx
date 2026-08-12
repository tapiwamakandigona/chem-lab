import { QUALITY, useLabStore } from '../store.js'
import { COURSE_UNITS, courseProgressCount } from '../lib/course.js'

const EXPERIMENTS = [
  {
    id: 'titration',
    icon: '⚗️',
    title: 'Acid-Base & Redox Titration',
    desc: 'Burette, pipette, conical flask. Presets: S22 carboxylic acid/NaOH, S21 FeSO₄/KMnO₄',
    papers: ['9701/31/M/J/22', '9701/31/M/J/21'],
    available: true,
  },
  {
    id: 'clock',
    icon: '⏱️',
    title: 'Iodine Clock Reaction',
    desc: 'Rate = 1000/time, turbidity simulation, cross obscured method. Preset: S23',
    papers: ['9701/31/M/J/23'],
    available: true,
  },
  {
    id: 'enthalpy',
    icon: '🌡️',
    title: 'Enthalpy of Solution',
    desc: 'Calorimetry, q=mcΔT (4.2 J/cm³/°C), Na₂CO₃ dissolution. Preset: S20',
    papers: ['9701/31/M/J/20'],
    available: true,
  },
  {
    id: 'qual',
    icon: '🧪',
    title: 'Qualitative Analysis',
    desc: 'Identify unknown ions: NaOH/NH₃ dropwise & excess, gas tests, BaCl₂, AgNO₃. Five unknowns',
    papers: ['9701 P3 Q3 style'],
    available: true,
  },
  {
    id: 'grav',
    icon: '🔥',
    title: 'Water of Crystallisation',
    desc: 'Gravimetric analysis: heat MgSO₄·xH₂O to constant mass in a crucible, find x',
    papers: ['9701 P3 Q2 style'],
    available: true,
  },
  {
    id: 'gas',
    icon: '💨',
    title: 'Molar Gas Volume',
    desc: 'Collect CO₂ from impure CaCO₃ + HCl in a gas syringe, find the % purity',
    papers: ['9701 P3 Q2 style'],
    available: true,
  },
  {
    id: 'organic',
    icon: '🍊',
    title: 'Organic Analysis',
    desc: 'Deduce the functional group of an unknown liquid — DNPH, Tollens’, Fehling’s, bromine water',
    papers: ['9701 P3 Q4 style'],
    available: true,
  },
  {
    id: 'electro',
    icon: '🔋',
    title: 'Electrochemical Cells',
    desc: 'Wire half-cells, read the voltmeter, identify an unknown metal from E° values',
    papers: ['9701 A2 practical'],
    available: true,
  },
  {
    id: 'chroma',
    icon: '🌈',
    title: 'Paper Chromatography',
    desc: 'Develop a food-dye chromatogram, measure Rf values, identify the mixture',
    papers: ['9701 AS technique'],
    available: true,
  },
  {
    id: 'flame',
    icon: '🔥',
    title: 'Flame Tests',
    desc: 'Clean a nichrome loop, test five metal ions, diagnose sodium contamination with cobalt glass',
    papers: ['qualitative enrichment'],
    available: true,
  },
  {
    id: 'distill',
    icon: '💧',
    title: 'Simple Distillation',
    desc: 'Assemble cooling flow, control boiling and separate pure water from a coloured solution',
    papers: ['separation enrichment'],
    available: true,
  },
  {
    id: 'solubility',
    icon: '❄️',
    title: 'Solubility & Crystallisation',
    desc: 'Build a KNO₃ solubility curve by heating known mixtures and recording the first crystals',
    papers: ['temperature investigation'],
    available: true,
  },
]

export default function ExperimentMenu({ onSelect }) {
  const { quality, setQuality, courseDone, setCourseOpen } = useLabStore()
  const courseCount = courseProgressCount(courseDone)

  return (
    <div className="flex flex-col items-center w-full h-full bg-lab-bg px-4 py-8 overflow-y-auto">
      <div className="flex flex-col items-center w-full my-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚗</div>
        <h1 className="text-2xl font-semibold text-lab-ink tracking-tight">ChemLab ZW</h1>
        <p className="text-lab-muted text-sm mt-1">Cambridge AS/A Level Chemistry · Paper 3 Practicals</p>
      </div>

      {/* Learner's guide entry — learn by doing, tracked automatically */}
      <div className="w-full max-w-lg mb-3">
        <button
          onClick={() => setCourseOpen(true)}
          data-testid="course-open"
          className="w-full text-left p-4 rounded-xl border border-lab-accent/50 bg-lab-accent/5 hover:bg-lab-accent/10 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🎓</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-lab-ink text-sm">Learner&apos;s Guide</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-lab-accent/15 text-lab-accent border border-lab-accent/30">
                  {courseCount}/{COURSE_UNITS.length}
                </span>
              </div>
              <p className="text-lab-muted text-xs mt-1 leading-relaxed">
                New here? Learn Paper 3 by practising — guided milestones from first
                burette reading to full mock papers, ticked off as you do them.
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Experiment cards */}
      <div className="w-full max-w-lg space-y-3">
        {EXPERIMENTS.map((exp) => (
          <button
            key={exp.id}
            onClick={() => exp.available && onSelect(exp.id)}
            disabled={!exp.available}
            className={`w-full text-left p-4 rounded-xl border transition-all
              ${exp.available
                ? 'bg-lab-panel border-lab-border hover:border-lab-accent hover:bg-[#1e3a4a] active:scale-[0.98] cursor-pointer'
                : 'bg-[#141f2e] border-lab-border opacity-50 cursor-not-allowed'
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{exp.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-lab-ink text-sm">{exp.title}</span>
                  {!exp.available && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-lab-border text-lab-muted">Soon</span>
                  )}
                </div>
                <p className="text-lab-muted text-xs mt-1 leading-relaxed">{exp.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {exp.papers.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-[#0c1e35] text-lab-accent border border-lab-accent/20">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quality selector */}
      <div className="mt-6 flex items-center gap-2 text-xs text-lab-muted">
        <span>Quality:</span>
        {[QUALITY.LOW, QUALITY.MED, QUALITY.HIGH, QUALITY.ULTRA].map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
            data-testid={`quality-${q}`}
            className={`px-2 py-1 rounded border text-xs transition-colors ${
              quality === q
                ? 'border-lab-accent text-lab-accent bg-lab-accent/10'
                : 'border-lab-border text-lab-muted hover:border-lab-muted'
            }`}
          >
            {q.toUpperCase()}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-lab-muted mt-1 opacity-60">Lower quality recommended on mobile / slow devices · ULTRA needs a real GPU</p>
      </div>
    </div>
  )
}
