import { useMemo, useRef } from 'react'
import { Object3D, DynamicDrawUsage } from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { crucibleMass, round2 } from '../lib/grav.js'
import { patchInstanceOpacityMaterial } from '../lib/instancedOpacity.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { BlobShadow, WashBottle, LabNotebook } from './scene/props.jsx'
import {
  flameGeometry,
  flameAlphaMap,
  BUNSEN_BLUE_OUTER,
  BUNSEN_BLUE_INNER,
} from './scene/flameShell.js'

const TRIPOD_H = 0.115
const CRUCIBLE_Y = TRIPOD_H + 0.012

// Steam wisps above the crucible — one InstancedMesh instead of 6 meshes.
const STEAM_COUNT = 6
const STEAM_SEEDS = Array.from({ length: STEAM_COUNT }, (_, i) => ({
  phase: i * 0.7,
  x: (i % 3 - 1) * 0.006,
  speed: 0.35 + (i % 3) * 0.1,
}))
const STEAM_DUMMY = new Object3D()
const STEAM_OPACITIES = new Float32Array(STEAM_COUNT)

/** Bunsen burner: base, barrel, collar; roaring teardrop flame while heating
 *  (shared flameShell lathe — iter-56 rule: no bare-cone flames). */
function Bunsen({ heating }) {
  const flameRef = useRef()
  const innerRef = useRef()
  const lightRef = useRef()
  const outerGeo = useMemo(() => flameGeometry(0.008, 0.0165, 0.06), [])
  const innerGeo = useMemo(() => flameGeometry(0.0065, 0.0095, 0.032), [])
  const alphaTex = useMemo(() => flameAlphaMap(), [])
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const tt = clock.getElapsedTime()
      lightRef.current.intensity = heating ? 0.5 + Math.sin(tt * 11) * 0.11 + Math.sin(tt * 23) * 0.05 : 0
    }
    if (!flameRef.current) return
    const t = clock.getElapsedTime()
    const flick = heating
      ? 1 + Math.sin(t * 12.7) * 0.045 + Math.sin(t * 23.2) * 0.025 + Math.sin(t * 37.1) * 0.012
      : 0
    flameRef.current.scale.set(heating ? 1 + Math.sin(t * 17) * 0.03 : 0, flick, heating ? 1 : 0)
    if (innerRef.current)
      innerRef.current.scale.set(heating ? 1 : 0, heating ? 0.98 + Math.sin(t * 15) * 0.04 : 0, heating ? 1 : 0)
  })
  return (
    <group>
      {/* base */}
      <mesh position={[0, 0.006, 0]}>
        <cylinderGeometry args={[0.038, 0.045, 0.012, 24]} />
        <meshStandardMaterial color="#2a2f36" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* barrel */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.0075, 0.0075, 0.06, 16]} />
        <meshStandardMaterial color="#3c434c" roughness={0.35} metalness={0.75} />
      </mesh>
      {/* collar */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.0105, 0.0105, 0.02, 16]} />
        <meshStandardMaterial color="#8a6a1f" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* roaring flame — shared teardrop shells, root at barrel mouth (y=0.07) */}
      <pointLight ref={lightRef} position={[0, 0.105, 0.015]} color={BUNSEN_BLUE_OUTER} intensity={0} distance={0.38} decay={2} />
      <mesh ref={flameRef} geometry={outerGeo} position={[0, 0.07, 0]}>
        <meshBasicMaterial
          color={BUNSEN_BLUE_OUTER}
          transparent
          opacity={0.85}
          alphaMap={alphaTex}
          side={2}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={innerRef} geometry={innerGeo} position={[0, 0.07, 0]}>
        <meshBasicMaterial
          color={BUNSEN_BLUE_INNER}
          transparent
          opacity={0.8}
          alphaMap={alphaTex}
          side={2}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/** Tripod + pipeclay triangle over the Bunsen. */
function Tripod() {
  const legs = useMemo(
    () => [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6
      return { x: Math.cos(a) * 0.052, z: Math.sin(a) * 0.052 }
    }),
    [],
  )
  return (
    <group>
      {legs.map((l, i) => (
        <mesh key={i} position={[l.x, TRIPOD_H / 2, l.z]}>
          <cylinderGeometry args={[0.0035, 0.0035, TRIPOD_H, 10]} />
          <meshStandardMaterial color="#33393f" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* top ring */}
      <mesh position={[0, TRIPOD_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.0035, 10, 28]} />
        <meshStandardMaterial color="#33393f" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* pipeclay triangle */}
      {[0, 1, 2].map((i) => (
        <mesh key={`t${i}`} position={[0, TRIPOD_H + 0.003, 0]} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.085, 0.004, 0.006]} />
          <meshStandardMaterial color="#d8cfc0" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/** Crucible + lid; glows red-hot while heating, steams while water remains. */
function Crucible({ heating, cooling, steam }) {
  const bodyRef = useRef()
  const glowRef = useRef()
  const steamRef = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (bodyRef.current) {
      // emissive glow ramps in while heating, fades while cooling
      const target = heating ? 0.9 : cooling ? 0.2 : 0
      const m = bodyRef.current.material
      m.emissiveIntensity += (target - m.emissiveIntensity) * 0.09
      if (glowRef.current) glowRef.current.intensity = m.emissiveIntensity * 0.6
    }
    const mesh = steamRef.current
    if (!mesh) return
    mesh.visible = steam
    if (!steam) return
    const opacityAttr = mesh.geometry.attributes.aOpacity
    for (let i = 0; i < STEAM_COUNT; i += 1) {
      const sd = STEAM_SEEDS[i]
      const f = (t * sd.speed + sd.phase) % 1
      STEAM_DUMMY.position.set(sd.x + Math.sin(t * 2 + i) * 0.004, 0.035 + f * 0.075, 0)
      STEAM_DUMMY.scale.setScalar(0.5 + f * 1.3)
      STEAM_DUMMY.updateMatrix()
      mesh.setMatrixAt(i, STEAM_DUMMY.matrix)
      opacityAttr.array[i] = 0.28 * (1 - f)
    }
    mesh.instanceMatrix.needsUpdate = true
    opacityAttr.needsUpdate = true
  })
  return (
    <group position={[0, CRUCIBLE_Y, 0]}>
      {/* bowl */}
      <mesh ref={bodyRef} position={[0, 0.014, 0]}>
        <cylinderGeometry args={[0.026, 0.016, 0.028, 22]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.85} emissive="#ff5a2a" emissiveIntensity={0} />
      </mesh>
      {/* warm incandescence spilling onto tripod/bench while hot */}
      <pointLight ref={glowRef} position={[0, 0.01, 0]} color="#ff7a3a" intensity={0} distance={0.32} decay={2} />
      {/* lid, slightly ajar so steam can escape */}
      <mesh position={[0.007, 0.031, 0]} rotation={[0, 0, -0.12]}>
        <cylinderGeometry args={[0.027, 0.027, 0.004, 22]} />
        <meshStandardMaterial color="#ddd6c8" roughness={0.85} />
      </mesh>
      <mesh position={[0.007, 0.0355, 0]}>
        <sphereGeometry args={[0.005, 12, 8]} />
        <meshStandardMaterial color="#ddd6c8" roughness={0.85} />
      </mesh>
      {/* steam wisps — single instanced draw call */}
      <instancedMesh ref={steamRef} args={[undefined, undefined, STEAM_COUNT]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.006, 8, 6]}>
          <instancedBufferAttribute
            attach="attributes-aOpacity"
            args={[STEAM_OPACITIES, 1]}
            usage={DynamicDrawUsage}
          />
        </sphereGeometry>
        <meshBasicMaterial
          transparent
          color="#dfe9f2"
          depthWrite={false}
          onBeforeCompile={patchInstanceOpacityMaterial}
        />
      </instancedMesh>
    </group>
  )
}

/** Digital balance with live readout — reads the crucible's current mass. */
function Balance({ display }) {
  return (
    <group position={[-0.26, 0, 0.18]} rotation={[0, 0.55, 0]}>
      <mesh position={[0, 0.011, 0]}>
        <boxGeometry args={[0.13, 0.022, 0.11]} />
        <meshStandardMaterial color="#252b33" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.0235, -0.008]}>
        <cylinderGeometry args={[0.042, 0.042, 0.003, 24]} />
        <meshStandardMaterial color="#3a424c" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* readout */}
      <mesh position={[0, 0.017, 0.0552]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.075, 0.017]} />
        <meshBasicMaterial color="#0a1408" />
      </mesh>
      <Text
        position={[0, 0.0175, 0.0562]}
        rotation={[-0.35, 0, 0]}
        fontSize={0.0105}
        color="#7dffa0"
        anchorX="center"
        anchorY="middle"
        font={LAB_FONT}
      >
        {display}
      </Text>
    </group>
  )
}

export default function GravScene() {
  const grav = useLabStore((s) => s.grav)
  const heating = grav.phase === 'heating'
  const cooling = grav.phase === 'cooling'
  // steam while heating and water still bound
  const steam = heating && grav.heats < 3
  const live = grav.phase === 'idle' ? round2(crucibleMass(grav.heats, grav.loaded)).toFixed(2) + ' g' : '-- --'

  return (
    <group>
      <LabRoom />
      <group position={[-0.06, 0, 0]}>
        <BlobShadow r={0.08} />
        <Bunsen heating={heating} />
        <Tripod />
        <Crucible heating={heating} cooling={cooling} steam={steam} />
      </group>
      <Balance display={live} />
      <group position={[-0.34, 0, 0.1]}><WashBottle /></group>
      <group position={[0.05, 0, 0.16]}><LabNotebook /></group>
    </group>
  )
}
