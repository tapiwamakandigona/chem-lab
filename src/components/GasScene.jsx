import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { volumeAt, GAS_TIME_SCALE, SYRINGE_MAX } from '../lib/gas.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { BlobShadow, WashBottle, LabNotebook } from './scene/props.jsx'

const FLASK_X = -0.17
const SYR_X = 0.05
const SYR_Y = 0.15
const SYR_LEN = 0.24        // barrel length for 100 cm³
const SYR_R = 0.021

/** Conical flask with acid + carbonate; fizzes while reaction runs. */
function ReactionFlask({ running, rate }) {
  const bubbleRefs = useRef([])
  const seeds = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      phase: (i * 0.37) % 1,
      x: ((i * 7919) % 100) / 100 * 0.05 - 0.025,
      z: ((i * 104729) % 100) / 100 * 0.05 - 0.025,
      speed: 0.6 + ((i * 31) % 10) / 10 * 0.7,
      r: 0.0015 + ((i * 13) % 10) / 10 * 0.0022,
    })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    bubbleRefs.current.forEach((b, i) => {
      if (!b) return
      const sd = seeds[i]
      const f = (t * sd.speed + sd.phase) % 1
      // bubbles rise inside the liquid then pop at the surface
      b.position.set(sd.x * (1 - f * 0.5), 0.015 + f * 0.05, sd.z * (1 - f * 0.5))
      b.scale.setScalar(rate > 0.02 ? 0.6 + f * 0.9 : 0)
      b.material.opacity = running && rate > 0.02 ? 0.5 * (1 - f * 0.6) * Math.min(rate * 4, 1) : 0
    })
  })
  return (
    <group position={[FLASK_X, 0, 0]}>
      {/* conical body */}
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.017, 0.052, 0.09, 26, 1, true]} />
        <meshPhysicalMaterial color="#dbe7f0" transparent opacity={0.18} roughness={0.05} side={2} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0.104, 0]}>
        <cylinderGeometry args={[0.014, 0.017, 0.03, 20, 1, true]} />
        <meshPhysicalMaterial color="#dbe7f0" transparent opacity={0.18} roughness={0.05} side={2} />
      </mesh>
      {/* bung */}
      <mesh position={[0, 0.122, 0]}>
        <cylinderGeometry args={[0.0125, 0.0148, 0.018, 18]} />
        <meshStandardMaterial color="#c96f3a" roughness={0.8} />
      </mesh>
      {/* acid + carbonate slurry */}
      <mesh position={[0, 0.028, 0]}>
        <cylinderGeometry args={[0.028, 0.048, 0.05, 24]} />
        <meshPhysicalMaterial color="#cfd8cd" transparent opacity={0.5} roughness={0.25} />
      </mesh>
      {/* undissolved carbonate lumps */}
      {[[-0.014, 0.008, 0.01], [0.012, 0.007, -0.012], [0.002, 0.006, 0.018]].map((p, i) => (
        <mesh key={i} position={p}>
          <dodecahedronGeometry args={[0.006 - i * 0.001]} />
          <meshStandardMaterial color="#e8e4da" roughness={0.95} />
        </mesh>
      ))}
      {/* CO₂ bubbles */}
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (bubbleRefs.current[i] = el)}>
          <sphereGeometry args={[seeds[i].r, 8, 6]} />
          <meshBasicMaterial color="#eef6fb" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Delivery tube: flask bung → up → across → syringe nozzle. */
function DeliveryTube() {
  const mat = <meshPhysicalMaterial color="#dbe7f0" transparent opacity={0.3} roughness={0.1} />
  return (
    <group>
      {/* vertical out of the bung */}
      <mesh position={[FLASK_X, 0.15, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.055, 10]} />
        {mat}
      </mesh>
      {/* elbow */}
      <mesh position={[FLASK_X + 0.011, 0.176, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.026, 10]} />
        {mat}
      </mesh>
      {/* horizontal run to the syringe */}
      <mesh
        position={[(FLASK_X + 0.02 + (SYR_X - SYR_LEN / 2 - 0.012)) / 2, 0.185, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.0035, 0.0035, SYR_X - SYR_LEN / 2 - 0.012 - (FLASK_X + 0.02), 10]} />
        {mat}
      </mesh>
      {/* drop down to nozzle height */}
      <mesh position={[SYR_X - SYR_LEN / 2 - 0.012, (0.185 + SYR_Y) / 2, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.185 - SYR_Y, 10]} />
        {mat}
      </mesh>
    </group>
  )
}

/** 100 cm³ gas syringe on a stand; plunger position tracks live volume. */
function GasSyringe({ volume }) {
  const plungerRef = useRef()
  const shown = useRef(0)
  useFrame(() => {
    // ease toward true volume so recordings feel physical
    shown.current += (volume - shown.current) * 0.08
    if (plungerRef.current) {
      plungerRef.current.position.x = (shown.current / SYRINGE_MAX) * (SYR_LEN - 0.02)
    }
  })
  const grads = useMemo(() => Array.from({ length: 11 }, (_, i) => i), [])
  return (
    <group position={[SYR_X, SYR_Y, 0]}>
      {/* barrel */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[SYR_R, SYR_R, SYR_LEN, 24, 1, true]} />
        <meshPhysicalMaterial color="#dbe7f0" transparent opacity={0.16} roughness={0.05} side={2} />
      </mesh>
      {/* nozzle (gas inlet, faces the flask) */}
      <mesh position={[-SYR_LEN / 2 - 0.008, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.016, 10]} />
        <meshPhysicalMaterial color="#dbe7f0" transparent opacity={0.35} roughness={0.1} />
      </mesh>
      {/* graduations every 10 cm³ */}
      {grads.map((i) => (
        <group key={i} position={[-SYR_LEN / 2 + 0.01 + (i / 10) * (SYR_LEN - 0.02), 0, 0]}>
          <mesh position={[0, 0, SYR_R - 0.0005]}>
            <boxGeometry args={[0.0008, i % 5 === 0 ? 0.012 : 0.007, 0.0006]} />
            <meshBasicMaterial color="#5a6b7a" />
          </mesh>
          {i % 2 === 0 && (
            <Text position={[0, -0.031, 0]} fontSize={0.0068} color="#8fa3b5" anchorX="center" font={LAB_FONT}>
              {String(i * 10)}
            </Text>
          )}
        </group>
      ))}
      {/* plunger: seal disc inside barrel + rod + thumb plate */}
      <group ref={plungerRef}>
        <mesh position={[-SYR_LEN / 2 + 0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[SYR_R - 0.0015, SYR_R - 0.0015, 0.008, 20]} />
          <meshStandardMaterial color="#8a94a1" roughness={0.45} />
        </mesh>
        <mesh position={[SYR_LEN / 2 * 0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, SYR_LEN * 0.85, 12]} />
          <meshStandardMaterial color="#cbd5df" roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[SYR_LEN / 2 * 0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.006, 20]} />
          <meshStandardMaterial color="#cbd5df" roughness={0.3} metalness={0.4} />
        </mesh>
      </group>
      {/* stand: two slim steel posts + feet + cradle rings */}
      {[-0.07, 0.07].map((x) => (
        <group key={x}>
          <mesh position={[x, -SYR_Y / 2, 0]}>
            <cylinderGeometry args={[0.0032, 0.0032, SYR_Y, 12]} />
            <meshStandardMaterial color="#7b8794" roughness={0.35} metalness={0.7} />
          </mesh>
          <mesh position={[x, -SYR_Y + 0.003, 0]}>
            <cylinderGeometry args={[0.016, 0.02, 0.006, 16]} />
            <meshStandardMaterial color="#4a525c" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[x, 0, 0]}>
            <torusGeometry args={[SYR_R + 0.0025, 0.0022, 10, 24]} />
            <meshStandardMaterial color="#7b8794" roughness={0.35} metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function GasScene() {
  const { gas, gasTick } = useLabStore()
  const running = gas.phase === 'running'
  useFrame((_, delta) => {
    if (running) gasTick(delta * GAS_TIME_SCALE)
  })
  const vol = gas.phase === 'setup' ? 0 : volumeAt(gas.timeSec)
  // fizz intensity ∝ dV/dt (normalised): fast early, dies away
  const rate = running ? Math.exp(-0.02 * gas.timeSec) : 0

  return (
    <group>
      <LabRoom />
      <group position={[FLASK_X, 0, 0]}><BlobShadow r={0.09} /></group>
      <group position={[SYR_X, 0, 0]}><BlobShadow r={0.07} /></group>
      <ReactionFlask running={running} rate={rate} />
      <DeliveryTube />
      <GasSyringe volume={vol} />
      <group position={[-0.34, 0, 0.12]}><WashBottle /></group>
      <group position={[0.26, 0, 0.16]}><LabNotebook /></group>
    </group>
  )
}
