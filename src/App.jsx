import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { useLabStore, QUALITY } from './store.js'
import ExperimentMenu from './components/ExperimentMenu.jsx'
import TitrationScene from './components/TitrationScene.jsx'
import TitrationUI from './components/TitrationUI.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'

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
        </>
      )}

      {/* More experiments: clock, enthalpy — coming in Phase 2/3 */}
      {(experiment === 'clock' || experiment === 'enthalpy') && (
        <>
          <LabCanvas quality={quality}>
            <mesh>
              <boxGeometry args={[1,1,1]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </LabCanvas>
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => setExperiment(null)}
              className="px-3 py-1.5 bg-lab-panel border border-lab-border rounded text-sm text-lab-muted hover:text-lab-ink"
            >
              ← Back
            </button>
            <p className="mt-3 text-lab-muted text-sm">Coming soon — Phase 2/3</p>
          </div>
        </>
      )}
    </div>
  )
}
