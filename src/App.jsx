import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
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

/**
 * Per-experiment camera composition: [position, target].
 * Framed for a 320px right UI panel — subject sits left-of-center.
 */
const CAMERAS = {
  titration: { pos: [-0.68, 0.52, 1.55], target: [0.14, 0.4, 0] },
  clock: { pos: [-0.35, 0.55, 1.25], target: [0, 0.12, 0.05] },
  enthalpy: { pos: [-0.45, 0.5, 1.3], target: [0.1, 0.12, 0.05] },
}

function LabCanvas({ children, quality, view }) {
  const dpr = quality === QUALITY.LOW ? 1 : quality === QUALITY.MED ? 1.5 : Math.min(window.devicePixelRatio, 2)
  const cam = CAMERAS[view] ?? CAMERAS.titration
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality !== QUALITY.LOW, powerPreference: 'high-performance' }}
      shadows={quality === QUALITY.HIGH}
      camera={{ position: cam.pos, fov: 42, near: 0.01, far: 50 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      {/* Bright teaching-lab grade: warm key, cool sky fill, wall bounce */}
      <ambientLight intensity={0.55} color="#eef2f8" />
      <directionalLight
        position={[2.2, 3.5, 2.8]}
        intensity={1.6}
        color="#fff2dd"
        castShadow={quality === QUALITY.HIGH}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-3, 2.5, 1]} intensity={0.5} color="#cfe0f5" />
      <directionalLight position={[0, 1.2, -2.5]} intensity={0.3} color="#f0ead9" />
      {/* Procedural environment — bundled, zero network. Soft panels give
          glassware something to refract without blowing out diffuse. */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#eef3fa" />
        <Lightformer intensity={0.7} position={[-4, 1.5, 2]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#dde6f2" />
        <Lightformer intensity={0.5} position={[4, 1, -2]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} color="#f2ead9" />
      </Environment>
      <OrbitControls
        makeDefault
        target={cam.target}
        minDistance={0.5}
        maxDistance={4.5}
        maxPolarAngle={Math.PI / 1.9}
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
          <LabCanvas quality={quality} view="titration">
            <TitrationScene />
          </LabCanvas>
          <TitrationUI onBack={() => setExperiment(null)} />
          {showTitrationCalc && <CalcSheet experiment="titration" onClose={() => setShowTitrationCalc(false)} />}
        </>
      )}

      {experiment === 'clock' && (
        <>
          <LabCanvas quality={quality} view="clock">
            <ClockScene />
          </LabCanvas>
          <ClockUI onBack={() => setExperiment(null)} />
        </>
      )}

      {experiment === 'enthalpy' && (
        <>
          <LabCanvas quality={quality} view="enthalpy">
            <EnthalpyScene />
          </LabCanvas>
          <EnthalpyUI onBack={() => setExperiment(null)} />
        </>
      )}
    </div>
  )
}
