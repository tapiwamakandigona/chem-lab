# ChemLab ZW ⚗️

A virtual chemistry lab built for **Cambridge AS/A Level Chemistry (9701)** students — particularly those without access to physical lab equipment. Simulates three Paper 3 practical experiments with interactive 3D apparatus, step-by-step procedures, and live worked calculations.

## Experiments

| Experiment | Paper | Description |
|---|---|---|
| **Acid-Base & Redox Titration** | 9701/31/M/J/22 & /21 | Burette, pipette, conical flask — S22 carboxylic acid/NaOH and S21 FeSO₄/KMnO₄ presets |
| **Iodine Clock Reaction** | 9701/31/M/J/23 | Rate = 1000/time, turbidity simulation, cross-obscured method |
| **Enthalpy of Solution** | 9701/31/M/J/20 | Calorimetry with q = mcΔT, Na₂CO₃ dissolution |

## Features

- 🧪 Interactive 3D lab scenes (React Three Fiber + Three.js)
- 📊 Live worked calculations (moles, concentrations, ΔH)
- 📝 Concordant titre detection and mean calculation
- 📱 Quality presets (Low/Med/High) for mobile & low-end devices
- 🎨 Dark lab-themed UI with Tailwind CSS

## Tech Stack

- **React 19** — UI framework
- **Three.js / React Three Fiber / Drei** — 3D rendering
- **Zustand** — state management
- **Tailwind CSS 3** — styling
- **Vite 8** — build tool
- **GSAP** — animation (available, not yet heavily used)

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Project Structure

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Root — experiment selection & canvas routing
├── store.js                  # Zustand store (titration, clock, enthalpy state)
├── store/
│   └── labStore.js           # Alternative store (apparatus-level titration logic)
├── components/
│   ├── ExperimentMenu.jsx    # Landing screen — experiment picker + quality toggle
│   ├── TitrationScene.jsx    # 3D titration apparatus (burette, flask, pipette)
│   ├── TitrationUI.jsx       # Titration controls & readings overlay
│   ├── ClockScene.jsx        # 3D clock reaction (beakers, cross paper, flask)
│   ├── ClockUI.jsx           # Clock reaction timer & results panel
│   ├── EnthalpyScene.jsx     # 3D enthalpy setup (cup, balance, thermometer)
│   ├── EnthalpyUI.jsx        # Enthalpy inputs & live calculation panel
│   ├── CalcSheet.jsx         # Worked calculations overlay (all experiments)
│   ├── LoadingScreen.jsx     # Loading spinner
│   ├── apparatus/            # Standalone 3D apparatus components
│   │   ├── Burette.jsx
│   │   ├── ConicalFlask.jsx
│   │   └── Pipette.jsx
│   └── ui/
│       ├── HUD.jsx           # Top bar, toast, help overlay
│       └── TitrationPanel.jsx # Step-by-step titration procedure panel
├── scenes/
│   └── TitrationScene.jsx    # Alternative full-scene titration layout
├── lib/
│   └── chemistry/
│       └── titration.js      # Pure chemistry calculations (endpoint, mean titre)
├── index.css                 # Global styles + Tailwind directives
└── App.css                   # Legacy boilerplate styles (unused)
```

## License

ISC

## CI / gates

Every push to `main` runs `.github/workflows/ci.yml`: build → all 17
Playwright probe gates (`python tests/run_gates.py`, screenshots uploaded
as artifacts) → deploy to https://chemlab.tapiwa.me/ (Appwrite, repo
secrets) only when every gate is green, then verifies the live bundle
hash. Run a single gate locally with
`CHEMLAB_DIST=dist CHEMLAB_SHOTS=shots python tests/run_gates.py meniscus`.
