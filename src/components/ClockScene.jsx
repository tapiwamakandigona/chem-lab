import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { LAB_FONT } from '../lib/labFont.js'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import LabRoom from './scene/LabRoom.jsx'

// Beaker with label
function Beaker({ position, label, liquidColor = [0.8, 0.9, 1.0, 0.3] }) {
  const [r,g,b,a] = liquidColor
  const color = useMemo(() => new THREE.Color(r,g,b), [r,g,b])
  return (
    <group position={position}>
      {/* Beaker walls */}
      <mesh>
        <cylinderGeometry args={[0.055, 0.048, 0.14, 24, 1, true]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.18} roughness={0} transmission={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Beaker base */}
      <mesh position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.006, 24]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.22} roughness={0} />
      </mesh>
      {/* Liquid */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.044, 0.038, 0.07, 20]} />
        <meshPhysicalMaterial color={color} transparent opacity={a} roughness={0.05} />
      </mesh>
      {/* Label */}
      <Text
        font={LAB_FONT}
        position={[0, 0.11, 0]}
        fontSize={0.022}
        color="#94a3b8"
        anchorX="center"
        anchorY="bottom"
      >
        {label}
      </Text>
    </group>
  )
}

// White paper with black cross underneath the flask
function CrossPaper({ crossOpacity }) {
  // crossOpacity: 1 = fully visible, 0 = fully hidden
  return (
    <group position={[0, 0.001, 0.05]}>
      {/* White paper */}
      <mesh>
        <boxGeometry args={[0.28, 0.003, 0.22]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* Horizontal bar of cross */}
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.09, 0.001, 0.016]} />
        <meshStandardMaterial color={`rgba(0,0,0,${crossOpacity})`} roughness={1} transparent opacity={crossOpacity} />
      </mesh>
      {/* Vertical bar of cross */}
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.016, 0.001, 0.09]} />
        <meshStandardMaterial color="#000000" roughness={1} transparent opacity={crossOpacity} />
      </mesh>
    </group>
  )
}

// Conical flask with turbidity animation
function ClockFlask({ turbidity }) {
  // turbidity: 0 = clear, 1 = opaque white
  const color = useMemo(() => {
    return new THREE.Color(
      0.7 + turbidity * 0.3,
      0.85 + turbidity * 0.15,
      0.9 + turbidity * 0.1
    )
  }, [turbidity])

  const opacity = 0.22 + turbidity * 0.75
  const roughness = turbidity * 0.8

  return (
    <group position={[0, 0.08, 0.05]}>
      {/* Flask body */}
      <mesh>
        <coneGeometry args={[0.14, 0.22, 28, 1, true]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={Math.min(opacity, 0.97)}
          roughness={roughness}
          transmission={Math.max(0, 0.75 - turbidity * 0.75)}
          thickness={0.015}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Flask neck */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.1, 18, 1, true]} />
        <meshPhysicalMaterial color="#b8d4ff" transparent opacity={0.22} roughness={0} transmission={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* Liquid */}
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.12, 0.02, 0.1, 24]} />
        <meshPhysicalMaterial
          color={color}
          transparent
          opacity={Math.min(0.4 + turbidity * 0.55, 0.95)}
          roughness={roughness}
        />
      </mesh>
    </group>
  )
}

export default function ClockScene() {
  const { clock, clockTick, clockStop } = useLabStore()

  // Simulate turbidity: at current conc, endpoint time varies
  // At 0.100 mol/dm3 => ~40s, at 0.020 => ~200s
  const endpointTime = clock.currentConc > 0
    ? (0.004 / clock.currentConc) * 1000  // ms: 4000ms / conc => at 0.1: 40s
    : 40000

  useFrame((_, delta) => {
    if (clock.phase !== 'running') return
    clockTick(delta * 1000)
    // Auto-stop when cross fully obscured
    if (clock.timerMs / endpointTime >= 0.98) clockStop()
  })

  // Derived purely from store state (clockTick re-renders every frame).
  const turbidity = clock.phase === 'running'
    ? Math.min(1, clock.timerMs / endpointTime)
    : (clock.phase === 'complete' ? 0.98 : 0)
  const crossOpacity = Math.max(0, 1 - turbidity / 0.85)

  return (
    <group>
      <LabRoom />
      <CrossPaper crossOpacity={crossOpacity} />
      <ClockFlask turbidity={turbidity} />
      {/* Na2S2O3 beaker - left */}
      <Beaker
        position={[-0.65, 0.07, 0.05]}
        label="Na₂S₂O₃"
        liquidColor={[0.85, 0.95, 1.0, 0.25]}
      />
      {/* HCl beaker - right */}
      <Beaker
        position={[0.65, 0.07, 0.05]}
        label="HCl"
        liquidColor={[0.9, 0.95, 0.85, 0.25]}
      />
    </group>
  )
}
