import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'

// ── Lab bench ───────────────────────────────────────────────────────────────
function LabBench() {
  return (
    <group position={[0, -0.05, 0]}>
      {/* Bench top */}
      <RoundedBox args={[3.2, 0.06, 1.4]} radius={0.01} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1e3a4a" roughness={0.4} metalness={0.1} />
      </RoundedBox>
      {/* Bench legs */}
      {[[-1.4,-0.4,-0.6],[1.4,-0.4,-0.6],[-1.4,-0.4,0.6],[1.4,-0.4,0.6]].map(([x,y,z],i) => (
        <mesh key={i} position={[x,y,z]}>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ── Retort stand + clamp ─────────────────────────────────────────────────────
function RetortStand() {
  return (
    <group position={[0.3, 0, 0]}>
      {/* Base */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[0.4, 0.025, 0.18]} />
        <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Rod */}
      <mesh position={[0.1, 0.85, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.7, 12]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Clamp arm */}
      <mesh position={[0.02, 1.4, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.2, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  )
}

// ── Burette ──────────────────────────────────────────────────────────────────
function Burette({ reading }) {
  const liquidRef = useRef()
  const fillFraction = 1 - reading / 50.0

  useFrame(() => {
    if (liquidRef.current) {
      liquidRef.current.scale.y = Math.max(0.001, fillFraction)
      liquidRef.current.position.y = (fillFraction - 1) * 0.36
    }
  })

  return (
    <group position={[0.3, 1.05, 0]}>
      {/* Glass tube (transparent) */}
      <mesh>
        <cylinderGeometry args={[0.018, 0.018, 0.78, 24, 1, true]} />
        <meshPhysicalMaterial
          color="#b8d4ff"
          transparent
          opacity={0.18}
          roughness={0}
          transmission={0.92}
          thickness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Liquid inside */}
      <group ref={liquidRef}>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.72, 16]} />
          <meshPhysicalMaterial color="#b3d9ff" transparent opacity={0.7} roughness={0.1} />
        </mesh>
      </group>
      {/* Stopcock */}
      <mesh position={[0, -0.42, 0]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.05, 12]} />
        <meshStandardMaterial color="#f97316" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Tip */}
      <mesh position={[0, -0.52, 0]}>
        <cylinderGeometry args={[0.004, 0.01, 0.08, 8]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.3} roughness={0} transmission={0.9} />
      </mesh>
      {/* Scale markings */}
      {[0,10,20,30,40,50].map((mark) => {
        const y = 0.36 - (mark / 50) * 0.72
        return (
          <group key={mark} position={[0, y, 0]}>
            <mesh position={[0.03, 0, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.0008, 0.0008, 0.022, 4]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <Text
              position={[0.07, 0, 0]}
              fontSize={0.022}
              color="#94a3b8"
              anchorX="left"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ.woff2"
            >
              {mark}
            </Text>
          </group>
        )
      })}
    </group>
  )
}

// ── Conical flask ─────────────────────────────────────────────────────────────
function ConicalFlask({ indicatorColor, endpointReached }) {
  const [r, g, b, a] = indicatorColor
  const color = useMemo(() => new THREE.Color(r, g, b), [r, g, b])

  const flashRef = useRef()
  useFrame(({ clock }) => {
    if (flashRef.current && endpointReached) {
      flashRef.current.material.emissiveIntensity = 0.3 + 0.2 * Math.sin(clock.getElapsedTime() * 4)
    }
  })

  return (
    <group position={[0, 0.05, 0]}>
      {/* Flask body (simplified cone + cylinder) */}
      <mesh ref={flashRef}>
        <coneGeometry args={[0.14, 0.22, 28, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={Math.max(0.22, a)}
          roughness={0.05}
          transmission={0.75}
          thickness={0.015}
          emissive={endpointReached ? color : '#000000'}
          emissiveIntensity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Flask neck */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 18, 1, true]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.22} roughness={0} transmission={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Liquid in flask */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.12, 0.02, 0.1, 24]} />
        <meshPhysicalMaterial color={color} transparent opacity={Math.max(0.35, a * 0.9)} roughness={0.05} />
      </mesh>
    </group>
  )
}

// ── Pipette (decorative, to the side) ────────────────────────────────────────
function Pipette() {
  return (
    <group position={[-0.55, 0.35, 0.1]} rotation={[0, 0.3, Math.PI * 0.08]}>
      <mesh>
        <cylinderGeometry args={[0.007, 0.007, 0.45, 12]} />
        <meshPhysicalMaterial color="#c8e6ff" transparent opacity={0.3} roughness={0} transmission={0.85} />
      </mesh>
      <mesh position={[0, -0.27, 0]}>
        <cylinderGeometry args={[0.007, 0.003, 0.08, 8]} />
        <meshPhysicalMaterial color="#c8e6ff" transparent opacity={0.3} roughness={0} transmission={0.85} />
      </mesh>
      {/* Bulge */}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.02, 14, 10]} />
        <meshPhysicalMaterial color="#c8e6ff" transparent opacity={0.3} roughness={0} transmission={0.85} />
      </mesh>
    </group>
  )
}

// ── White tile (for colour comparison) ────────────────────────────────────────
function WhiteTile() {
  return (
    <mesh position={[0, 0.002, 0.1]}>
      <boxGeometry args={[0.32, 0.004, 0.25]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.7} />
    </mesh>
  )
}

// ── Drop animation ─────────────────────────────────────────────────────────────
function DropEffect({ active }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current && active) {
      const t = (clock.getElapsedTime() * 3) % 1
      ref.current.position.y = 0.6 - t * 0.55
      ref.current.material.opacity = t < 0.8 ? 0.7 : 0.7 * (1 - (t - 0.8) / 0.2)
    }
    if (ref.current && !active) ref.current.material.opacity = 0
  })
  return (
    <mesh ref={ref} position={[0.3, 0.6, 0]}>
      <sphereGeometry args={[0.006, 8, 8]} />
      <meshPhysicalMaterial color="#b3d9ff" transparent opacity={0} roughness={0} />
    </mesh>
  )
}

// ── Main scene ──────────────────────────────────────────────────────────────────
export default function TitrationScene() {
  const { titration } = useLabStore()
  const isRunning = titration.phase === 'running'

  return (
    <group>
      <LabBench />
      <RetortStand />
      <Burette reading={titration.buretteReading} />
      <ConicalFlask
        indicatorColor={titration.indicatorColor}
        endpointReached={titration.endpointReached}
      />
      <Pipette />
      <WhiteTile />
      <DropEffect active={isRunning} />
    </group>
  )
}
