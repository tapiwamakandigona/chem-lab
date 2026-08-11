import { Suspense, lazy, useState } from 'react'
import { useLabStore } from './store.js'
import ExperimentMenu from './components/ExperimentMenu.jsx'
import TitrationUI from './components/TitrationUI.jsx'
import ClockUI from './components/ClockUI.jsx'
import EnthalpyUI from './components/EnthalpyUI.jsx'
import CalcSheet from './components/CalcSheet.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

// three.js + scenes load only when an experiment opens — the menu paints
// with the small react chunk even on a 2G connection.
const LabViewport = lazy(() => import('./components/LabViewport.jsx'))

export default function App() {
  const { experiment, setExperiment, quality } = useLabStore()
  const [showTitrationCalc, setShowTitrationCalc] = useState(false)

  return (
    <div className="relative w-full h-full bg-lab-bg overflow-hidden">
      {experiment === null && (
        <ExperimentMenu onSelect={setExperiment} />
      )}

      {experiment === 'titration' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="titration" quality={quality} />
          </Suspense>
          <TitrationUI onBack={() => setExperiment(null)} />
          {showTitrationCalc && <CalcSheet experiment="titration" onClose={() => setShowTitrationCalc(false)} />}
        </>
      )}

      {experiment === 'clock' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="clock" quality={quality} />
          </Suspense>
          <ClockUI onBack={() => setExperiment(null)} />
        </>
      )}

      {experiment === 'enthalpy' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="enthalpy" quality={quality} />
          </Suspense>
          <EnthalpyUI onBack={() => setExperiment(null)} />
        </>
      )}
    </div>
  )
}
