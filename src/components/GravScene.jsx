import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { crucibleMass, round2 } from '../lib/grav.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { BlobShadow, WashBottle, LabNotebook } from './scene/props.jsx'

const TRIPOD_H = 0.115
const CRUCIBLE_Y = TRIPOD_H + 0.012

/** Bunsen burner: base, barrel, collar; roaring cone flame while heating. */
function Bunsen({ heating }) {
  const flameRef = useRef()
  const innerRef = useRef()
  const lightRef = useRef()
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const tt = clock.getElapsedTime()
      lightRef.current.intensity = heating ? 0.55 + Math.sin(tt * 11) * 0.12 + Math.sin(tt * 23) * 0.05 : 0
    }
    if (!flameRef.current) return
    const t = clock.getElapsedTime()
    const flick = heating ? 1 + Math.sin(t * 22) * 0.07 + Math.sin(t * 9.3) * 0.05 : 0
    flameRef.current.scale.set(flick, heating ? flick * (1 + Math.sin(t * 13) * 0.06) : 0, flick)
    if (innerRef.current) innerRef.current.scale.setScalar(heating ? 0.55 + Math.sin(t * 17) * 0.04 : 0)
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
      {/* outer flame */}
      <pointLight ref={lightRef} position={[0, 0.11, 0]} color="#7fb4ff" intensity={0} distance={0.45} decay={2} />
      <mesh ref={flameRef} position={[0, 0.092, 0]}>
        <coneGeometry args={[0.013, 0.055, 12]} />
        <meshBasicMaterial color="#7fb4ff" transparent opacity={0.55} />
      </mesh>
      {/* inner cone */}
      <mesh ref={innerRef} position={[0, 0.078, 0]}>
        <coneGeometry args={[0.007, 0.02, 10]} />
        <meshBasicMaterial color="#cfe4ff" transparent opacity={0.8} />
      </mesh>
      {heating && <pointLight position={[0, 0.13, 0]} intensity={0.5} distance={0.5} color="#8ab4ff" />}
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
  const steamRefs = useRef([])
  const seeds = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ phase: i * 0.7, x: (i % 3 - 1) * 0.006, speed: 0.35 + (i % 3) * 0.1 })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (bodyRef.current) {
      // emissive glow ramps in while heating, fades while cooling
      const target = heating ? 0.55 : cooling ? 0.15 : 0
      const m = bodyRef.current.material
      m.emissiveIntensity += (target - m.emissiveIntensity) * 0.04
    }
    steamRefs.current.forEach((s, i) => {
      if (!s) return
      const sd = seeds[i]
      const f = (t * sd.speed + sd.phase) % 1
      s.position.set(sd.x + Math.sin(t * 2 + i) * 0.004, 0.035 + f * 0.075, 0)
      s.scale.setScalar(0.5 + f * 1.3)
      s.material.opacity = steam ? 0.28 * (1 - f) : 0
    })
  })
  return (
    <group position={[0, CRUCIBLE_Y, 0]}>
      {/* bowl */}
      <mesh ref={bodyRef} position={[0, 0.014, 0]}>
        <cylinderGeometry args={[0.026, 0.016, 0.028, 22]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.85} emissive="#ff5a2a" emissiveIntensity={0} />
      </mesh>
      {/* lid, slightly ajar so steam can escape */}
      <mesh position={[0.007, 0.031, 0]} rotation={[0, 0, -0.12]}>
        <cylinderGeometry args={[0.027, 0.027, 0.004, 22]} />
        <meshStandardMaterial color="#ddd6c8" roughness={0.85} />
      </mesh>
      <mesh position={[0.007, 0.0355, 0]}>
        <sphereGeometry args={[0.005, 12, 8]} />
        <meshStandardMaterial color="#ddd6c8" roughness={0.85} />
      </mesh>
      {/* steam wisps */}
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (steamRefs.current[i] = el)}>
          <sphereGeometry args={[0.006, 8, 6]} />
          <meshBasicMaterial color="#dfe9f2" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
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
