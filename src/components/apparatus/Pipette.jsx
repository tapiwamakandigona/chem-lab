import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useLabStore } from '../../store/labStore'

// Pipette — 25.00 cm³ graduated, single-mark
export function Pipette({ position = [0, 0, 0] }) {
  const { titration } = useLabStore()

  return (
    <group position={position}>
      {/* Main bulb */}
      <mesh position={[0, -1.2, 0]}>
        <sphereGeometry args={[0.35, 16, 12]} />
        <meshPhysicalMaterial
          color="#a8d8ea" transparent opacity={0.2}
          roughness={0} transmission={0.85} thickness={0.08}
        />
      </mesh>
      {/* Bulb fill */}
      {titration.pipetteFilled && (
        <mesh position={[0, -1.2, 0]}>
          <sphereGeometry args={[0.3, 14, 10]} />
          <meshStandardMaterial color="#60a5fa" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Upper stem */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 3.2, 10, 1, true]} />
        <meshPhysicalMaterial color="#a8d8ea" transparent opacity={0.2} roughness={0} transmission={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Lower stem */}
      <mesh position={[0, -2.5, 0]}>
        <cylinderGeometry args={[0.055, 0.04, 1.8, 10, 1, true]} />
        <meshPhysicalMaterial color="#a8d8ea" transparent opacity={0.2} roughness={0} transmission={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* 25 cm³ graduation mark */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[0.08, 0.008, 4, 16]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <Text position={[0.22, 1.5, 0]} fontSize={0.18} color="#94a3b8" anchorX="left">
        25.00
      </Text>

      {/* Status */}
      <Text position={[0, 2.8, 0]} fontSize={0.22} color={titration.pipetteFilled ? '#4ade80' : '#64748b'} anchorX="center">
        {titration.pipetteFilled ? '25.00 cm³ ✓' : '25.00 cm³'}
      </Text>
    </group>
  )
}
