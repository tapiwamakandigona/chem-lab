import { QUALITY, useLabStore } from '../store.js'

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
    available: false,
  },
  {
    id: 'enthalpy',
    icon: '🌡️',
    title: 'Enthalpy of Solution',
    desc: 'Calorimetry, q=mcΔT (4.2 J/cm³/°C), Na₂CO₃ dissolution. Preset: S20',
    papers: ['9701/31/M/J/20'],
    available: false,
  },
]

export default function ExperimentMenu({ onSelect }) {
  const { quality, setQuality } = useLabStore()

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-lab-bg px-4 py-8 overflow-y-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚗</div>
        <h1 className="text-2xl font-semibold text-lab-ink tracking-tight">ChemLab ZW</h1>
        <p className="text-lab-muted text-sm mt-1">Cambridge AS/A Level Chemistry · Paper 3 Practicals</p>
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
        {[QUALITY.LOW, QUALITY.MED, QUALITY.HIGH].map((q) => (
          <button
            key={q}
            onClick={() => setQuality(q)}
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
      <p className="text-[10px] text-lab-muted mt-1 opacity-60">Lower quality recommended on mobile / slow devices</p>
    </div>
  )
}
