import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer } from '@react-three/drei'
import { QUALITY } from '../store.js'
import TitrationScene from './TitrationScene.jsx'
import ClockScene from './ClockScene.jsx'
import EnthalpyScene from './EnthalpyScene.jsx'

/**
 * Per-experiment camera composition: [position, target].
 * Framed for a 320px right UI panel — subject sits left-of-center.
 */
const CAMERAS = {
  titration: { pos: [-0.68, 0.52, 1.55], target: [0.14, 0.4, 0] },
  clock: { pos: [-0.19, 0.33, 0.5], target: [0.02, 0.07, 0.03] },
  enthalpy: { pos: [-0.3, 0.3, 0.6], target: [0.1, 0.09, 0.04] },
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
      {/* Aerial depth: background softens toward the wall colour */}
      <fog attach="fog" args={['#dfe7ef', 3.2, 9]} />
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

const SCENES = {
  titration: TitrationScene,
  clock: ClockScene,
  enthalpy: EnthalpyScene,
}

export default function LabViewport({ experiment, quality }) {
  const Scene = SCENES[experiment]
  if (!Scene) return null
  return (
    <LabCanvas quality={quality} view={experiment}>
      <Scene />
    </LabCanvas>
  )
}
