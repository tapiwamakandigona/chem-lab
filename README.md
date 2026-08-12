# ChemLab ZW ⚗️

**Live: [chemlab.tapiwa.me](https://chemlab.tapiwa.me/)**

A virtual chemistry lab for **Cambridge AS/A Level Chemistry (9701)** students — built for learners without access to physical lab equipment. Thirteen interactive practicals with 3D apparatus, guided procedures, live worked calculations, and marked past-paper-style questions. Offline-first and phone-friendly, because that's how most of its students will use it.

## Experiments

| Experiment | Paper 3 style | What you practise |
|---|---|---|
| **Acid-Base & Redox Titration** | Q1 (S22 & S21 presets) | Burette control, meniscus reading, concordant titres, mean titre |
| **Iodine Clock Reaction** | Q2 (S23) | Timing, rate = 1000/t, rate–concentration graph, gradient |
| **Enthalpy of Solution** | Q2 (S20) | Cooling correction by extrapolation, q = mcΔT, sign of ΔH |
| **Qualitative Analysis** | Q3 | Cation/anion tests (NaOH, NH₃, HCl, BaCl₂, AgNO₃), observation recording |
| **Water of Crystallisation** | Q2 | Heating to constant mass, gravimetric calculation of x |
| **Molar Gas Volume** | Q2 | Gas syringe collection to constant volume, % purity from your own data |
| **Organic Analysis** | Q4 | 2,4-DNPH, Tollens', Fehling's, dichromate, bromine water, iodoform deduction |
| **Electrochemical Cells** | A2 practical | Wire half-cells, read polarity and E cell, identify an unknown metal from E° |
| **Paper Chromatography** | AS technique | Develop a chromatogram, measure spot distances, calculate Rf, identify dyes |
| **Flame Tests** | Enrichment | Clean a nichrome loop, observe five cations, diagnose sodium contamination |
| **Simple Distillation** | Enrichment | Fill a Liebig condenser upward, prevent bumping, collect colourless water at 100 °C |
| **Solubility & Crystallisation** | Temperature investigation | Heat five KNO₃ mixtures, record first crystals, plot a solubility curve |
| **Catalytic Decomposition Kinetics** | P3 / P5 rates investigation | Collect O₂ continuously, compare initial gradients, vary one rate factor fairly |

## Learn mode

- 🎓 **18-unit guided course** with progress tracking (stored locally, no account)
- 🧭 **In-experiment coach** — step-by-step guidance that ticks off as you work
- 📝 **Marked mock papers** — past-paper-style questions marked with tolerance + error-carried-forward, like a real examiner
- 📏 **Meniscus reading trainer** with randomised burette sections

## Built for real-world constraints

- 📴 **Offline-first PWA** — loads with no connection after first visit (2G/3G friendly)
- 📱 **Phone-first** — touch controls, pinch zoom, zoom buttons, portrait & landscape
- 🎚️ **Quality presets** — LOW to ULTRA; auto-detected, never assumes a GPU
- 🔬 **Honest physics** — closed stopcocks don't drip, readings quantise like real glassware, marking uses *your* measured values, not the textbook answer

## Tech stack

React 19 · Three.js / React Three Fiber / Drei · Zustand · Tailwind CSS 3 · Vite 8

## Development

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
python tests/run_gates.py   # full 27-gate Playwright regression
```

Every experiment ships with a Playwright **gate** (`tests/gates/`) asserting the full user flow — from menu click to marked answer — plus mobile usability. CI runs all gates on every push and deploys only when green.
