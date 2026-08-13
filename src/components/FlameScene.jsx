import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { FLAME_UNKNOWNS, FLAME_IONS, flameAppearance } from '../lib/flame.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial } from './scene/glassware.jsx'
import { BlobShadow, LabNotebook } from './scene/props.jsx'

const BLUE_OUTER = '#2588ff'
const BLUE_INNER = '#b8e5ff'


/** Curved teardrop flame shell. A straight-sided cone silhouette reads as a
 *  diagram of a flame (iter-56 screenshot tell); a lathe profile with a bulge
 *  and a rounded tip, faded out vertically by an alphaMap, reads as combustion.
 */
function flameGeometry(rBase, rBulge, h) {
  const pts = []
  const N = 24
  for (let i = 0; i <= N; i += 1) {
    const t = i / N
    // bulge at ~28% height, smooth taper to a rounded tip
    const bulge = Math.sin(Math.min(t / 0.28, 1) * Math.PI * 0.5)
    const taper = Math.pow(1 - Math.max(0, (t - 0.28) / 0.72), 1.6)
    const r = t < 0.28 ? rBase + (rBulge - rBase) * bulge : rBulge * taper
    pts.push(new THREE.Vector2(Math.max(r, 0.0004), t * h))
  }
  return new THREE.LatheGeometry(pts, 28)
}

function flameAlphaMap() {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 64
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 64, 0, 0)
  grad.addColorStop(0, 'rgb(140,140,140)')
  grad.addColorStop(0.35, 'rgb(255,255,255)')
  grad.addColorStop(0.85, 'rgb(200,200,200)')
  grad.addColorStop(1, 'rgb(0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 1, 64)
  return new THREE.CanvasTexture(c)
}

function Burner({ active, appearance }) {
  const outer = useRef()
  const inner = useRef()
  const glow = useRef()
  const seeds = useMemo(() => ({ a: 1.8, b: 3.4, c: 6.1 }), [])
  const outerGeo = useMemo(() => flameGeometry(0.011, 0.026, 0.108), [])
  const innerGeo = useMemo(() => flameGeometry(0.009, 0.0145, 0.058), [])
  const alphaTex = useMemo(() => flameAlphaMap(), [])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const flicker =
      1 +
      Math.sin(t * 12.7 + seeds.a) * 0.045 +
      Math.sin(t * 23.2 + seeds.b) * 0.025 +
      Math.sin(t * 37.1 + seeds.c) * 0.012
    if (outer.current) outer.current.scale.set(1 + Math.sin(t * 17) * 0.025, flicker, 1)
    if (inner.current) inner.current.scale.set(1 + Math.sin(t * 19) * 0.02, 0.98 + Math.sin(t * 15) * 0.03, 1)
    if (glow.current) glow.current.intensity = active ? 0.85 + Math.sin(t * 13) * 0.16 : 0.22
  })

  const flameColor = active ? appearance.color : BLUE_OUTER
  const innerColor = active ? appearance.color : BLUE_INNER

  return (
    <group>
      {/* weighted base + knurled gas collar */}
      <mesh position={[0, 0.009, 0]} castShadow>
        <cylinderGeometry args={[0.047, 0.055, 0.018, 28]} />
        <meshStandardMaterial color="#39434d" metalness={0.72} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.044, 0]} castShadow>
        <cylinderGeometry args={[0.024, 0.029, 0.058, 24]} />
        <meshStandardMaterial color="#868f98" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.031, 0.031, 0.021, 24]} />
        <meshStandardMaterial color="#59636c" metalness={0.75} roughness={0.34} />
      </mesh>
      {/* collar air holes */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.031, 0.07, Math.sin(a) * 0.031]} rotation={[0, -a, 0]}>
          <circleGeometry args={[0.006, 12]} />
          <meshBasicMaterial color="#15202a" />
        </mesh>
      ))}
      <mesh position={[0, 0.13, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.025, 0.1, 24]} />
        <meshStandardMaterial color="#717c85" metalness={0.82} roughness={0.23} />
      </mesh>
      <mesh position={[0, 0.184, 0]}>
        <torusGeometry args={[0.021, 0.003, 10, 28]} />
        <meshStandardMaterial color="#343d45" metalness={0.7} roughness={0.28} />
      </mesh>

      {/* non-luminous blue flame; sample emission overlays both shells */}
      <mesh ref={outer} geometry={outerGeo} position={[0, 0.192, 0]}>
        <meshBasicMaterial
          color={flameColor}
          transparent
          opacity={active ? 0.85 : 0.62}
          alphaMap={alphaTex}
          side={2}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={inner} geometry={innerGeo} position={[0, 0.192, 0]}>
        <meshBasicMaterial
          color={innerColor}
          transparent
          opacity={0.8}
          alphaMap={alphaTex}
          side={2}
          depthWrite={false}
        />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, 0.24, 0.02]}
        color={active ? appearance.color : BLUE_OUTER}
        intensity={0.22}
        distance={0.72}
        decay={2}
      />
      <BlobShadow r={0.07} />
    </group>
  )
}

function NichromeLoop({ state }) {
  const inFlame = state.active
  const loaded = state.loop === 'loaded'
  // A real holder approaches from the side: the wire loop sits in the
  // hottest zone just above the inner blue cone, while the insulated handle
  // stays safely outside the flame. Keep it close to the bench when idle.
  const x = inFlame ? -0.006 : -0.16
  const y = inFlame ? 0.225 : 0.042
  const rotation = inFlame ? [0, 0, 0] : [0, 0, -0.12]
  const unknown = FLAME_UNKNOWNS[state.unknown]
  const sample = FLAME_IONS[unknown.ion]

  return (
    <group position={[x, y, 0.014]} rotation={rotation}>
      {/* insulated holder */}
      <mesh position={[-0.126, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.014, 0.17, 16]} />
        <meshStandardMaterial color="#ba3e32" roughness={0.65} />
      </mesh>
      <mesh position={[-0.016, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.0017, 0.0017, 0.135, 10]} />
        <meshStandardMaterial color="#9da6ad" metalness={0.8} roughness={0.24} />
      </mesh>
      <mesh position={[0.052, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.011, 0.0017, 8, 24]} />
        <meshStandardMaterial color="#9da6ad" metalness={0.8} roughness={0.24} />
      </mesh>
      {loaded && (
        <mesh position={[0.052, 0, 0]}>
          <sphereGeometry args={[0.004, 10, 8]} />
          <meshStandardMaterial color={sample.color} emissive={sample.color} emissiveIntensity={0.2} roughness={0.6} />
        </mesh>
      )}
    </group>
  )
}

function SampleVials({ selected }) {
  return (
    <group position={[-0.26, 0, -0.055]}>
      {Object.entries(FLAME_UNKNOWNS).map(([id, u], i) => {
        const x = (i - 2) * 0.055
        const chosen = id === selected
        return (
          <group key={id} position={[x, 0, 0]}>
            <mesh position={[0, 0.028, 0]}>
              <cylinderGeometry args={[0.014, 0.015, 0.056, 16, 1, true]} />
              <GlassMaterial opacity={0.18} />
            </mesh>
            <mesh position={[0, 0.011, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.02, 14]} />
              <meshStandardMaterial color={chosen ? '#e7d9bd' : '#dad3c5'} roughness={0.94} />
            </mesh>
            <mesh position={[0, 0.061, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.013, 16]} />
              <meshStandardMaterial color={chosen ? '#38bdf8' : '#5a6670'} roughness={0.55} />
            </mesh>
            <Text
              font={LAB_FONT}
              position={[0, 0.087, 0]}
              fontSize={0.009}
              color={chosen ? '#1675a2' : '#46515b'}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.0007}
              outlineColor="#f5f7fa"
            >
              {u.label}
            </Text>
          </group>
        )
      })}
      <BlobShadow r={0.16} />
    </group>
  )
}

function AcidBeaker() {
  return (
    <group position={[0.18, 0, -0.055]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.038, 0.034, 0.08, 24, 1, true]} />
        <GlassMaterial opacity={0.17} />
      </mesh>
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.032, 0.031, 0.041, 20]} />
        <meshStandardMaterial color="#d6eaf4" transparent opacity={0.58} roughness={0.25} />
      </mesh>
      <Text
        font={LAB_FONT}
        position={[0, 0.045, 0.039]}
        fontSize={0.009}
        color="#304756"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0007}
        outlineColor="#f5f7fa"
      >
        dilute HCl
      </Text>
      <BlobShadow r={0.045} />
    </group>
  )
}

function CobaltGlass({ visible }) {
  if (!visible) return null
  return (
    <group position={[-0.06, 0.255, 0.08]} rotation={[0.08, -0.18, 0.04]}>
      <mesh>
        <boxGeometry args={[0.105, 0.085, 0.004]} />
        <meshStandardMaterial
          color="#314ea8"
          emissive="#172762"
          emissiveIntensity={0.15}
          transparent
          opacity={0.54}
          roughness={0.12}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[-0.065, 0, 0]}>
        <boxGeometry args={[0.025, 0.018, 0.009]} />
        <meshStandardMaterial color="#1d2733" roughness={0.55} />
      </mesh>
    </group>
  )
}

export default function FlameScene() {
  const flame = useLabStore((s) => s.flame)
  const appearance = flameAppearance(flame.unknown, flame.sampleClean, flame.cobaltGlass)
  const showingSample = flame.active && flame.loop === 'loaded'

  return (
    <group>
      <LabRoom />
      <group position={[0.02, -0.015, 0.015]}>
        <Burner active={showingSample} appearance={appearance} />
        <NichromeLoop state={flame} />
        <SampleVials selected={flame.unknown} />
        <AcidBeaker />
        <CobaltGlass visible={flame.cobaltGlass} />
        <group position={[0.38, 0, 0.1]}>
          <LabNotebook />
        </group>
      </group>
    </group>
  )
}
