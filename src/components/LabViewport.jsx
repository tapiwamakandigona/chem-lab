import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { QUALITY } from '../store.js'
import TitrationScene from './TitrationScene.jsx'
import ClockScene from './ClockScene.jsx'
import EnthalpyScene from './EnthalpyScene.jsx'
import QualScene from './QualScene.jsx'
import OrganicScene from './OrganicScene.jsx'
import ElectroScene from './ElectroScene.jsx'
import GravScene from './GravScene.jsx'
import GasScene from './GasScene.jsx'
import ChromaScene from './ChromaScene.jsx'
import FlameScene from './FlameScene.jsx'

/**
 * Per-experiment camera composition: [position, target].
 * Framed for a 320px right UI panel — subject sits left-of-center.
 */
const CAMERAS = {
  titration: { pos: [-0.68, 0.52, 1.55], target: [0.14, 0.4, 0] },
  clock: { pos: [-0.19, 0.33, 0.5], target: [0.02, 0.07, 0.03] },
  enthalpy: { pos: [-0.3, 0.3, 0.6], target: [0.1, 0.09, 0.04] },
  qual: { pos: [-0.24, 0.34, 0.55], target: [-0.04, 0.05, -0.05] },
  organic: { pos: [-0.22, 0.34, 0.58], target: [-0.02, 0.05, -0.05] },
  electro: { pos: [-0.12, 0.27, 0.58], target: [-0.02, 0.06, 0] },
  grav: { pos: [-0.1, 0.3, 0.52], target: [-0.02, 0.1, 0] },
  gas: { pos: [-0.06, 0.3, 0.74], target: [-0.05, 0.11, 0] },
  chroma: { pos: [-0.2, 0.26, 0.62], target: [-0.01, 0.08, 0] },
  flame: { pos: [-0.21, 0.3, 0.67], target: [-0.02, 0.12, 0] },
}

function LabCanvas({ children, quality, view, controlsRef }) {
  const ultra = quality === QUALITY.ULTRA
  const dpr =
    quality === QUALITY.LOW ? 1 :
    quality === QUALITY.MED ? 1.5 :
    ultra ? Math.min(window.devicePixelRatio, 2.5) : Math.min(window.devicePixelRatio, 2)
  const cam = CAMERAS[view] ?? CAMERAS.titration
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality !== QUALITY.LOW, powerPreference: 'high-performance' }}
      shadows={ultra ? 'soft' : quality === QUALITY.HIGH}
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
        castShadow={quality === QUALITY.HIGH || quality === QUALITY.ULTRA}
        shadow-mapSize={quality === QUALITY.ULTRA ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-3, 2.5, 1]} intensity={0.5} color="#cfe0f5" />
      <directionalLight position={[0, 1.2, -2.5]} intensity={0.3} color="#f0ead9" />
      {/* Procedural environment — bundled, zero network. Soft panels give
          glassware something to refract without blowing out diffuse. */}
      {ultra && (
        <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={3} blur={2.2} far={1.2} resolution={512} frames={1} />
      )}
      <Environment resolution={ultra ? 256 : 64} frames={1}>
        <Lightformer intensity={1.3} position={[0, 4, 0]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} color="#eef3fa" />
        <Lightformer intensity={0.7} position={[-4, 1.5, 2]} rotation-y={Math.PI / 2} scale={[4, 2, 1]} color="#dde6f2" />
        <Lightformer intensity={0.5} position={[4, 1, -2]} rotation-y={-Math.PI / 2} scale={[4, 2, 1]} color="#f2ead9" />
        {ultra && (
          <>
            <Lightformer intensity={0.4} position={[0, 2, 4]} scale={[5, 1.5, 1]} color="#ffffff" />
            <Lightformer intensity={0.3} form="ring" position={[-2, 3, -1]} scale={2} color="#e8f0fb" />
          </>
        )}
      </Environment>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={cam.target}
        minDistance={0.5}
        maxDistance={4.5}
        maxPolarAngle={Math.PI / 1.9}
        minAzimuthAngle={-Math.PI / 2.15}
        maxAzimuthAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.08}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
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
  qual: QualScene,
  organic: OrganicScene,
  electro: ElectroScene,
  grav: GravScene,
  gas: GasScene,
  chroma: ChromaScene,
  flame: FlameScene,
}

/** DOM zoom buttons — the touch/mouse-free way to dolly the camera.
 *  Works on every device; pinch (two fingers) and wheel also zoom. */
function ZoomButtons({ controlsRef }) {
  const zoom = (factor) => {
    const c = controlsRef.current
    if (!c) return
    const cam = c.object
    const dir = cam.position.clone().sub(c.target)
    const next = THREE.MathUtils.clamp(dir.length() * factor, c.minDistance, c.maxDistance)
    dir.setLength(next)
    cam.position.copy(c.target).add(dir)
    c.update()
  }
  const btn = 'w-9 h-9 rounded-lg bg-lab-panel/90 border border-lab-border text-lab-ink text-lg leading-none active:bg-lab-accent/20 backdrop-blur-sm'
  return (
    <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1.5 pointer-events-auto">
      <button className={btn} data-testid="zoom-in" aria-label="Zoom in" onClick={() => zoom(1 / 1.3)}>+</button>
      <button className={btn} data-testid="zoom-out" aria-label="Zoom out" onClick={() => zoom(1.3)}>−</button>
    </div>
  )
}

export default function LabViewport({ experiment, quality }) {
  const controlsRef = useRef()
  const Scene = SCENES[experiment]
  if (!Scene) return null
  return (
    <div className="absolute inset-0" data-testid="gfx-root" data-quality={quality}>
      <LabCanvas quality={quality} view={experiment} controlsRef={controlsRef}>
        <Scene />
      </LabCanvas>
      <ZoomButtons controlsRef={controlsRef} />
    </div>
  )
}
