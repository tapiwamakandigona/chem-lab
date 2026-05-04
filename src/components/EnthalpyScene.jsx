import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'

function LabBench() {
  return (
    <group position={[0, -0.05, 0]}>
      <RoundedBox args={[3.2, 0.06, 1.4]} radius={0.01} position={[0, 0, 0]}>
        <meshStandardMaterial color="#1e3a4a" roughness={0.4} metalness={0.1} />
      </RoundedBox>
      {[[-1.4,-0.4,-0.6],[1.4,-0.4,-0.6],[-1.4,-0.4,0.6],[1.4,-0.4,0.6]].map(([x,y,z],i) => (
        <mesh key={i} position={[x,y,z]}>
          <boxGeometry args={[0.06, 0.7, 0.06]} />
          <meshStandardMaterial color="#0f172a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// Digital balance
function Balance({ mass }) {
  return (
    <group position={[0.7, 0.01, 0.1]}>
      {/* Body */}
      <RoundedBox args={[0.32, 0.04, 0.22]} radius={0.008}>
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Screen */}
      <mesh position={[0, 0.022, -0.04]}>
        <boxGeometry args={[0.18, 0.001, 0.06]} />
        <meshStandardMaterial color="#0a2a1a" emissive="#00ff88" emissiveIntensity={0.4} />
      </mesh>
      {/* Platform */}
      <mesh position={[0, 0.028, 0.02]}>
        <boxGeometry args={[0.22, 0.008, 0.14]} />
        <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.5} />
      </mesh>
    </group>
  )
}

// Weighing boat with white powder
function WeighingBoat() {
  return (
    <group position={[0.7, 0.052, 0.04]}>
      {/* Boat */}
      <mesh>
        <boxGeometry args={[0.08, 0.018, 0.06]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.7} />
      </mesh>
      {/* Powder */}
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.025, 0.03, 0.008, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={1.0} />
      </mesh>
    </group>
  )
}

// Polystyrene cup
function PolystyreneCup() {
  return (
    <group position={[-0.2, 0.08, 0.05]}>
      {/* Cup body */}
      <mesh>
        <cylinderGeometry args={[0.065, 0.052, 0.16, 24, 1, true]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Cup base */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.005, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
      </mesh>
      {/* Water inside */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.056, 0.045, 0.1, 20]} />
        <meshPhysicalMaterial color="#7dd3fc" transparent opacity={0.35} roughness={0.05} transmission={0.6} />
      </mesh>
    </group>
  )
}

// Thermometer with animated fill
function Thermometer({ running }) {
  const fillRef = useRef()
  const fillScaleRef = useRef(0.1)

  useFrame((_, delta) => {
    if (!fillRef.current) return
    if (running) {
      fillScaleRef.current = Math.min(1.0, fillScaleRef.current + delta * 0.18)
    } else if (!running && fillScaleRef.current < 0.12) {
      fillScaleRef.current = 0.1
    }
    fillRef.current.scale.y = fillScaleRef.current
    fillRef.current.position.y = -0.09 + fillScaleRef.current * 0.09
  })

  return (
    <group position={[-0.2, 0.22, 0.05]}>
      {/* Glass tube */}
      <mesh>
        <cylinderGeometry args={[0.007, 0.007, 0.22, 12, 1, true]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.3} roughness={0} transmission={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Red bulb */}
      <mesh position={[0, -0.11, 0]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      {/* Red fill — animates upward */}
      <mesh ref={fillRef} position={[0, -0.09, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.18, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}

export default function EnthalpyScene() {
  const { enthalpy } = useLabStore()

  return (
    <group>
      <LabBench />
      <PolystyreneCup />
      <Thermometer running={enthalpy.phase === 'running'} />
      <Balance mass={enthalpy.mass} />
      <WeighingBoat />
    </group>
  )
}
