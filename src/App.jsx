import { Suspense, lazy, useEffect, useState } from 'react'
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
import MockLibrary from './components/MockLibrary.jsx'
import NotFound from './components/NotFound.jsx'
import { navigate, parseRoute, PRACTICAL_META, routeForExperiment } from './lib/routes.js'

// three.js + scenes load only when an experiment opens — the menu paints
// with the small react chunk even on a 2G connection.
const LabViewport = lazy(() => import('./components/LabViewport.jsx'))
const TeacherConsole = lazy(() => import('./components/TeacherConsole.jsx'))
const ClassJoin = lazy(() => import('./components/ClassJoin.jsx'))

export default function App() {
  const { experiment, setExperiment, quality, setCourseOpen } = useLabStore()
  const [showTitrationCalc, setShowTitrationCalc] = useState(false)
  const [route, setRoute] = useState(() => parseRoute())

  useEffect(() => {
    const syncRoute = () => {
      const next = parseRoute()
      setRoute(next)
      setExperiment(next.kind === 'practical' ? next.experiment : null)
      setCourseOpen(next.kind === 'guide')
    }
    window.addEventListener('popstate', syncRoute)
    syncRoute()
    return () => window.removeEventListener('popstate', syncRoute)
  }, [setCourseOpen, setExperiment])

  const openExperiment = (id) => navigate(routeForExperiment(id))
  const openGuide = () => navigate('/guide')
  const openMocks = () => navigate('/mocks')
  const goHome = () => navigate('/')

  useEffect(() => {
    const practical = PRACTICAL_META.find(({ id }) => id === route.experiment)
    const LANDING_DESCRIPTION =
      'Run 14 interactive Cambridge AS & A Level Chemistry practicals, follow a 19-unit guide and practise marked exam-style work.'
    const META = {
      guide: [
        'Learner’s Guide — ChemLab',
        'Follow a 19-milestone learn-by-doing route through Cambridge 9701 practical chemistry skills.',
      ],
      mocks: [
        'Marked Mock Papers — ChemLab',
        'Open three marked chemistry mock-paper workflows based on results you collect in ChemLab practicals.',
      ],
      teach: [
        'Teacher Dashboard — ChemLab',
        'Create a class, set practicals and marked mocks as an assignment, and see what your learners actually completed.',
      ],
      join: [
        'Join a Class — ChemLab',
        'Enter the six-character code from your teacher to load this week’s practicals. No account and no email needed.',
      ],
      landing: ['ChemLab — Practise Cambridge Chemistry Practicals', LANDING_DESCRIPTION],
      'not-found': ['Page not found — ChemLab', LANDING_DESCRIPTION],
    }
    const [title, description] = route.kind === 'practical'
      ? [`${practical?.title ?? 'Chemistry Practical'} — ChemLab`, practical?.description]
      : META[route.kind] ?? META['not-found']
    document.title = title
    const descriptionMeta = document.querySelector('meta[name="description"]')
    if (descriptionMeta && description) descriptionMeta.content = description
    let robots = document.querySelector('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = route.kind === 'not-found' ? 'noindex, nofollow' : 'index, follow'
    const canonical = document.querySelector('link[rel="canonical"]')
    if (canonical && route.kind !== 'not-found') {
      canonical.href = `https://chemlab.tapiwa.me${window.location.pathname}`
    }
  }, [route])

  if (route.kind === 'not-found') return <NotFound />

  return (
    <div className="relative w-full h-full bg-lab-bg overflow-hidden">
      {/* Ticks learner's-guide milestones from live state, everywhere */}
      <CourseTracker />

      {route.kind === 'landing' && (
        <ExperimentMenu
          onSelect={openExperiment}
          onOpenGuide={openGuide}
          onOpenMocks={openMocks}
        />
      )}
      {route.kind === 'guide' && (
        <CoursePanel onClose={goHome} onNavigateExperiment={openExperiment} />
      )}
      {route.kind === 'mocks' && (
        <MockLibrary onBack={goHome} onOpenExperiment={openExperiment} />
      )}
      {route.kind === 'teach' && (
        <Suspense fallback={<LoadingScreen />}>
          <TeacherConsole onBack={goHome} />
        </Suspense>
      )}
      {route.kind === 'join' && (
        <Suspense fallback={<LoadingScreen />}>
          <ClassJoin onBack={goHome} onOpenExperiment={openExperiment} />
        </Suspense>
      )}

      {experiment === 'titration' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="titration" quality={quality} />
          </Suspense>
          <TitrationUI onBack={goHome} />
          <GuideCoach experiment="titration" />
          {showTitrationCalc && <CalcSheet experiment="titration" onClose={() => setShowTitrationCalc(false)} />}
        </>
      )}

      {experiment === 'clock' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="clock" quality={quality} />
          </Suspense>
          <ClockUI onBack={goHome} />
          <GuideCoach experiment="clock" />
        </>
      )}

      {experiment === 'qual' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="qual" quality={quality} />
          </Suspense>
          <QualUI onBack={goHome} />
          <GuideCoach experiment="qual" />
        </>
      )}
      {experiment === 'organic' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="organic" quality={quality} />
          </Suspense>
          <OrganicUI onBack={goHome} />
          <GuideCoach experiment="organic" />
        </>
      )}
      {experiment === 'electro' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="electro" quality={quality} />
          </Suspense>
          <ElectroUI onBack={goHome} />
          <GuideCoach experiment="electro" />
        </>
      )}
      {experiment === 'chroma' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="chroma" quality={quality} />
          </Suspense>
          <ChromaUI onBack={goHome} />
          <GuideCoach experiment="chroma" />
        </>
      )}
      {experiment === 'flame' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="flame" quality={quality} />
          </Suspense>
          <FlameUI onBack={goHome} />
          <GuideCoach experiment="flame" />
        </>
      )}
      {experiment === 'distill' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="distill" quality={quality} />
          </Suspense>
          <DistillUI onBack={goHome} />
          <GuideCoach experiment="distill" />
        </>
      )}
      {experiment === 'solubility' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="solubility" quality={quality} />
          </Suspense>
          <SolubilityUI onBack={goHome} />
          <GuideCoach experiment="solubility" />
        </>
      )}
      {experiment === 'peroxide' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="peroxide" quality={quality} />
          </Suspense>
          <PeroxideUI onBack={goHome} />
          <GuideCoach experiment="peroxide" />
        </>
      )}

      {experiment === 'iodine-rate' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="iodine-rate" quality={quality} />
          </Suspense>
          <IodineRateUI onBack={goHome} />
          <GuideCoach experiment="iodine-rate" />
        </>
      )}

      {experiment === 'grav' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="grav" quality={quality} />
          </Suspense>
          <GravUI onBack={goHome} />
          <GuideCoach experiment="grav" />
        </>
      )}

      {experiment === 'gas' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="gas" quality={quality} />
          </Suspense>
          <GasUI onBack={goHome} />
          <GuideCoach experiment="gas" />
        </>
      )}

      {experiment === 'enthalpy' && (
        <>
          <Suspense fallback={<LoadingScreen />}>
            <LabViewport experiment="enthalpy" quality={quality} />
          </Suspense>
          <EnthalpyUI onBack={goHome} />
          <GuideCoach experiment="enthalpy" />
        </>
      )}
    </div>
  )
}
