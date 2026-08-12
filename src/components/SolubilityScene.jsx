import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import {
  SOLUBILITY_HEAT_RATE,
  SOLUBILITY_COOL_RATE,
  solubilityStatus,
} from '../lib/solubility.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow, LabNotebook, WashBottle } from './scene/props.jsx'
import { clampSimDelta } from '../lib/simClock.js'

function HotPlate({ active }) {
  const ring = useRef()
  useFrame(({ clock }) => {
    if (!ring.current) return
    ring.current.material.emissiveIntensity = active
      ? 0.55 + Math.sin(clock.getElapsedTime() * 7) * 0.08
      : 0.04
  })
  return (
    <group>
      <mesh position={[0, 0.016, 0]}>
        <cylinderGeometry args={[0.105, 0.115, 0.032, 32]} />
        <meshStandardMaterial color="#252b31" roughness={0.45} metalness={0.55} />
      </mesh>
      <mesh ref={ring} position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.078, 0.078, 0.006, 32]} />
        <meshStandardMaterial
          color="#4b4f51"
          emissive="#ff542f"
          emissiveIntensity={0.04}
          roughness={0.58}
        />
      </mesh>
      <mesh position={[0.075, 0.018, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.012, 20]} />
        <meshStandardMaterial color="#747b82" roughness={0.45} metalness={0.55} />
      </mesh>
    </group>
  )
}

function WaterBath({ active, rushing }) {
  const bubbles = useRef([])
  const seeds = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      x: ((i % 4) - 1.5) * 0.025,
      z: (Math.floor(i / 4) - 1) * 0.025,
      phase: (i * 0.19) % 1,
    })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    bubbles.current.forEach((b, i) => {
      if (!b) return
      const s = seeds[i]
      const f = (t * 0.45 + s.phase) % 1
      b.position.set(s.x, 0.055 + f * 0.095, s.z)
      b.material.opacity = active ? 0.3 * (1 - f) : 0
    })
  })
  return (
    <group>
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.105, 0.095, 0.18, 32, 1, true]} />
        <GlassMaterial opacity={0.17} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.095, 0.095, 0.006, 32]} />
        <GlassMaterial opacity={0.24} />
      </mesh>
      <mesh position={[0, 0.077, 0]}>
        <cylinderGeometry args={[0.098, 0.09, 0.13, 32]} />
        <LiquidMaterial color={rushing ? '#9ccdf0' : '#78b8dd'} opacity={0.43} />
      </mesh>
      {rushing && Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={`ice-${i}`}
          position={[
            ((i % 4) - 1.5) * 0.038,
            0.115 + (i % 2) * 0.018,
            (Math.floor(i / 4) - 0.5) * 0.06,
          ]}
          rotation={[i * 0.17, i * 0.3, 0]}
        >
          <boxGeometry args={[0.025, 0.021, 0.024]} />
          <meshStandardMaterial color="#dff5ff" transparent opacity={0.78} roughness={0.18} />
        </mesh>
      ))}
      {seeds.map((s, i) => (
        <mesh key={i} ref={(node) => (bubbles.current[i] = node)} position={[s.x, 0.06, s.z]}>
          <sphereGeometry args={[0.0032, 8, 6]} />
          <meshBasicMaterial color="#eefaff" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Thermometer({ temperature }) {
  const column = useRef()
  const stem = 0.27
  useFrame(() => {
    if (!column.current) return
    const frac = THREE.MathUtils.clamp((temperature + 10) / 120, 0.02, 1)
    const h = stem * frac
    column.current.scale.y = frac
    column.current.position.y = -stem / 2 + h / 2
  })
  return (
    <group position={[0.018, 0.32, 0.002]} rotation={[0, 0, -0.045]}>
      <mesh>
        <cylinderGeometry args={[0.0055, 0.0055, stem, 14]} />
        <GlassMaterial opacity={0.38} />
      </mesh>
      <mesh position={[0, -stem / 2 - 0.006, 0]}>
        <sphereGeometry args={[0.008, 14, 10]} />
        <meshStandardMaterial color="#cf3e39" roughness={0.2} emissive="#721815" emissiveIntensity={0.12} />
      </mesh>
      <mesh ref={column}>
        <cylinderGeometry args={[0.0017, 0.0017, stem, 8]} />
        <meshStandardMaterial color="#cf3e39" roughness={0.25} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[0.006, -stem / 2 + 0.015 + i * 0.02, 0]}>
          <boxGeometry args={[i % 2 ? 0.004 : 0.006, 0.0007, 0.0007]} />
          <meshBasicMaterial color="#354655" />
        </mesh>
      ))}
    </group>
  )
}

function BoilingTube({ temperature, status, phase }) {
  const crystalRefs = useRef([])
  const powderRefs = useRef([])
  const stirrer = useRef()
  const crystalCount = Math.min(24, Math.round(status.crystalMass * 3.5))
  const crystalSeeds = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({
      x: ((i * 17) % 11 - 5) * 0.0043,
      z: ((i * 29) % 9 - 4) * 0.004,
      y: (i % 4) * 0.003,
      rot: (i * 0.7) % Math.PI,
    })),
    [],
  )
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (stirrer.current) stirrer.current.rotation.y = phase === 'heating' ? t * 5 : 0
    powderRefs.current.forEach((p, i) => {
      if (!p) return
      const dissolved = status.clear || phase === 'clear' || phase === 'cooling' || phase === 'complete'
      p.visible = !dissolved
      p.position.y = 0.018 + Math.sin(t * 2.4 + i) * 0.003
    })
    crystalRefs.current.forEach((c, i) => {
      if (!c) return
      c.visible = i < crystalCount
      const grow = Math.min(1, status.crystalMass / 2)
      c.scale.setScalar(0.35 + grow * (status.quality.startsWith('large') ? 0.9 : 0.55))
    })
  })
  return (
    <group position={[0, 0.135, 0]}>
      {/* rounded tube end + straight wall */}
      <mesh position={[0, 0.085, 0]}>
        <cylinderGeometry args={[0.034, 0.034, 0.19, 28, 1, true]} />
        <GlassMaterial opacity={0.2} />
      </mesh>
      <mesh position={[0, -0.012, 0]}>
        <sphereGeometry args={[0.034, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <GlassMaterial opacity={0.23} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.034, 0.0025, 10, 28]} />
        <GlassMaterial opacity={0.35} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.031, 0.031, 0.09, 28]} />
        <LiquidMaterial color="#d8e9f3" opacity={0.56} />
      </mesh>
      {/* undissolved KNO3 powder */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh
          key={`powder-${i}`}
          ref={(node) => (powderRefs.current[i] = node)}
          position={[((i * 7) % 9 - 4) * 0.005, 0.02, ((i * 5) % 7 - 3) * 0.005]}
        >
          <sphereGeometry args={[0.0038, 8, 6]} />
          <meshStandardMaterial color="#f5f5ee" roughness={0.95} />
        </mesh>
      ))}
      {/* crystals settle at the rounded bottom */}
      {crystalSeeds.map((seed, i) => (
        <mesh
          key={`crystal-${i}`}
          ref={(node) => (crystalRefs.current[i] = node)}
          position={[seed.x, -0.024 + seed.y, seed.z]}
          rotation={[seed.rot, seed.rot * 0.5, seed.rot * 0.3]}
        >
          <octahedronGeometry args={[0.006, 0]} />
          <meshStandardMaterial
            color="#edf4fb"
            transparent
            opacity={0.88}
            roughness={0.18}
            metalness={0.02}
          />
        </mesh>
      ))}
      {/* glass stirring rod */}
      <mesh ref={stirrer} position={[-0.014, 0.105, 0.002]} rotation={[0, 0, -0.08]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.22, 10]} />
        <GlassMaterial opacity={0.38} />
      </mesh>
      <group position={[0, 0.065, 0]}>
        <Thermometer temperature={temperature} />
      </group>
    </group>
  )
}

function RetortStand() {
  return (
    <group>
      <mesh position={[-0.18, 0.27, -0.055]}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.54, 12]} />
        <meshStandardMaterial color="#abb6bf" roughness={0.25} metalness={0.78} />
      </mesh>
      <mesh position={[-0.18, 0.01, -0.055]}>
        <boxGeometry args={[0.15, 0.018, 0.13]} />
        <meshStandardMaterial color="#3b4248" roughness={0.48} metalness={0.55} />
      </mesh>
      <mesh position={[-0.09, 0.32, -0.03]}>
        <boxGeometry args={[0.18, 0.005, 0.005]} />
        <meshStandardMaterial color="#abb6bf" roughness={0.25} metalness={0.78} />
      </mesh>
      <mesh position={[-0.002, 0.32, -0.005]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.041, 0.004, 10, 28]} />
        <meshStandardMaterial color="#d0a04a" roughness={0.56} />
      </mesh>
    </group>
  )
}

function DigitalReadout({ temperature }) {
  return (
    <group position={[-0.285, 0.045, 0.17]} rotation={[-0.12, 0.38, 0]}>
      <mesh>
        <boxGeometry args={[0.13, 0.07, 0.035]} />
        <meshStandardMaterial color="#28323b" roughness={0.48} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.006, 0.018]}>
        <planeGeometry args={[0.095, 0.032]} />
        <meshBasicMaterial color="#0b1612" />
      </mesh>
      <Text
        font={LAB_FONT}
        position={[0, 0.006, 0.019]}
        fontSize={0.016}
        color="#86f2aa"
        anchorX="center"
        anchorY="middle"
      >
        {temperature.toFixed(1)} °C
      </Text>
    </group>
  )
}

export default function SolubilityScene() {
  const { solubility, solubilityTick } = useLabStore()
  const state = solubilityStatus(solubility)
  const heating = solubility.phase === 'heating'
  const cooling = solubility.phase === 'cooling'
  useFrame((_, delta) => {
    if (heating) solubilityTick(clampSimDelta(delta) * SOLUBILITY_HEAT_RATE)
    if (cooling) solubilityTick(clampSimDelta(delta) * SOLUBILITY_COOL_RATE * (solubility.rushing ? 2.4 : 1))
  })
  return (
    <group>
      <LabRoom />
      <group position={[-0.02, 0, 0]}>
        <BlobShadow r={0.15} opacity={0.25} />
        <HotPlate active={heating} />
        <WaterBath active={heating} rushing={solubility.rushing} />
        <BoilingTube
          temperature={solubility.temperature}
          status={state}
          phase={solubility.phase}
        />
        <RetortStand />
      </group>
      <DigitalReadout temperature={solubility.temperature} />
      <group position={[0.2, 0, 0.15]}><LabNotebook /></group>
      <group position={[0.28, 0, -0.05]}><WashBottle /></group>
    </group>
  )
}
