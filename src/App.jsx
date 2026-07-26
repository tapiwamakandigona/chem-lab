import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { useLabStore, QUALITY } from './store.js'
import ExperimentMenu from './components/ExperimentMenu.jsx'
import TitrationScene from './components/TitrationScene.jsx'
import TitrationUI from './components/TitrationUI.jsx'
import ClockScene from './components/ClockScene.jsx'
import ClockUI from './components/ClockUI.jsx'
import EnthalpyScene from './components/EnthalpyScene.jsx'
import EnthalpyUI from './components/EnthalpyUI.jsx'
import CalcSheet from './components/CalcSheet.jsx'
// LoadingScreen available for future use:
// import LoadingScreen from './components/LoadingScreen.jsx'

function LabCanvas({ children, quality }) {
  const dpr = quality === QUALITY.LOW ? 1 : quality === QUALITY.MED ? 1.5 : Math.min(window.devicePixelRatio, 2)
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality !== QUALITY.LOW, powerPreference: 'high-performance' }}
      shadows={quality === QUALITY.HIGH}
      camera={{ position: [0, 1.2, 3.5], fov: 45, near: 0.01, far: 50 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {quality === QUALITY.HIGH && <Stats />}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.2} castShadow={quality === QUALITY.HIGH} />
      <pointLight position={[-2, 3, -2]} intensity={0.4} color="#b8d4ff" />
      <Environment preset="studio" />
      <OrbitControls
        makeDefault
        minDistance={1.5}
        maxDistance={6}
        maxPolarAngle={Math.PI / 1.8}
        enableDamping
        dampingFactor={0.08}
        touches={{ ONE: 2, TWO: 512 }}
      />
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </Canvas>
  )
}

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
          <LabCanvas quality={quality}>
            <TitrationScene />
          </LabCanvas>
          <TitrationUI onBack={() => setExperiment(null)} />
          {showTitrationCalc && <CalcSheet experiment="titration" onClose={() => setShowTitrationCalc(false)} />}
        </>
      )}

      {experiment === 'clock' && (
        <>
          <LabCanvas quality={quality}>
            <ClockScene />
          </LabCanvas>
          <ClockUI onBack={() => setExperiment(null)} />
        </>
      )}

      {experiment === 'enthalpy' && (
        <>
          <LabCanvas quality={quality}>
            <EnthalpyScene />
          </LabCanvas>
          <EnthalpyUI onBack={() => setExperiment(null)} />
        </>
      )}
    </div>
  )
}
