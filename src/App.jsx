import { Suspense, lazy, useState } from 'react'
import { useLabStore } from './store.js'
import ExperimentMenu from './components/ExperimentMenu.jsx'
import TitrationUI from './components/TitrationUI.jsx'
import ClockUI from './components/ClockUI.jsx'
import EnthalpyUI from './components/EnthalpyUI.jsx'
import QualUI from './components/QualUI.jsx'
import GravUI from './components/GravUI.jsx'
import GasUI from './components/GasUI.jsx'
import OrganicUI from './components/OrganicUI.jsx'
import ElectroUI from './components/ElectroUI.jsx'
import ChromaUI from './components/ChromaUI.jsx'
import FlameUI from './components/FlameUI.jsx'
import DistillUI from './components/DistillUI.jsx'
import SolubilityUI from './components/SolubilityUI.jsx'
import PeroxideUI from './components/PeroxideUI.jsx'
import IodineRateUI from './components/IodineRateUI.jsx'
import CalcSheet from './components/CalcSheet.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import GuideCoach from './components/GuideCoach.jsx'
import CoursePanel, { CourseTracker } from './components/CoursePanel.jsx'

// three.js + scenes load only when an experiment opens — the menu paints
// with the small react chunk even on a 2G connection.
const LabViewport = lazy(() => import('./components/LabViewport.jsx'))

export default function App() {
  const { experiment, setExperiment, quality, courseOpen, setCourseOpen } = useLabStore()
  const [showTitrationCalc, setShowTitrationCalc] = useState(false)

  return (
    <div className="relative w-full h-full bg-lab-bg overflow-hidden">
      {/* Ticks learner's-guide milestones from live state, everywhere */}
      <CourseTracker />

      {experiment === null && (
        <ExperimentMenu onSelect={setExperiment} />
      )}
      {experiment === null && courseOpen && (
        <CoursePanel onClose={() => setCourseOpen(false)} />
      )}

      {experiment === 'titration' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="titration" quality={quality} />
          </Suspense>
          <TitrationUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="titration" />
          {showTitrationCalc && <CalcSheet experiment="titration" onClose={() => setShowTitrationCalc(false)} />}
        </>
      )}

      {experiment === 'clock' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="clock" quality={quality} />
          </Suspense>
          <ClockUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="clock" />
        </>
      )}

      {experiment === 'qual' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="qual" quality={quality} />
          </Suspense>
          <QualUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="qual" />
        </>
      )}
      {experiment === 'organic' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="organic" quality={quality} />
          </Suspense>
          <OrganicUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="organic" />
        </>
      )}
      {experiment === 'electro' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="electro" quality={quality} />
          </Suspense>
          <ElectroUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="electro" />
        </>
      )}
      {experiment === 'chroma' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="chroma" quality={quality} />
          </Suspense>
          <ChromaUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="chroma" />
        </>
      )}
      {experiment === 'flame' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="flame" quality={quality} />
          </Suspense>
          <FlameUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="flame" />
        </>
      )}
      {experiment === 'distill' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="distill" quality={quality} />
          </Suspense>
          <DistillUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="distill" />
        </>
      )}
      {experiment === 'solubility' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="solubility" quality={quality} />
          </Suspense>
          <SolubilityUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="solubility" />
        </>
      )}
      {experiment === 'peroxide' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="peroxide" quality={quality} />
          </Suspense>
          <PeroxideUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="peroxide" />
        </>
      )}

      {experiment === 'iodine-rate' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="iodine-rate" quality={quality} />
          </Suspense>
          <IodineRateUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="iodine-rate" />
        </>
      )}

      {experiment === 'grav' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="grav" quality={quality} />
          </Suspense>
          <GravUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="grav" />
        </>
      )}

      {experiment === 'gas' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="gas" quality={quality} />
          </Suspense>
          <GasUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="gas" />
        </>
      )}

      {experiment === 'enthalpy' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="enthalpy" quality={quality} />
          </Suspense>
          <EnthalpyUI onBack={() => setExperiment(null)} />
          <GuideCoach experiment="enthalpy" />
        </>
      )}
    </div>
  )
}
