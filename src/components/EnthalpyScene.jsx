import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial } from './scene/glassware.jsx'
import { BlobShadow } from './scene/props.jsx'

/** Digital balance with live mass readout. */
function Balance({ mass, boatLoaded }) {
  return (
    <group>
      <RoundedBox args={[0.24, 0.035, 0.18]} radius={0.008} castShadow>
        <meshStandardMaterial color="#e8eaed" roughness={0.5} metalness={0.1} />
      </RoundedBox>
      {/* pan */}
      <mesh position={[0, 0.024, -0.01]}>
        <cylinderGeometry args={[0.062, 0.062, 0.008, 32]} />
        <meshStandardMaterial color="#c8cdd3" roughness={0.25} metalness={0.7} />
      </mesh>
      {/* display */}
      <mesh position={[0, 0.012, 0.082]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.028, 0.004]} />
        <meshStandardMaterial color="#1a2129" roughness={0.4} />
      </mesh>
      <Text
        font={LAB_FONT}
        position={[0, 0.013, 0.086]}
        rotation={[-0.5, 0, 0]}
        fontSize={0.013}
        color="#48e08a"
        anchorX="center"
        anchorY="middle"
      >
        {boatLoaded ? `${mass.toFixed(2)} g` : '0.00 g'}
      </Text>
      {/* weighing boat + powder on the pan */}
      {boatLoaded && (
        <group position={[0, 0.032, -0.01]}>
          <mesh>
            <boxGeometry args={[0.07, 0.012, 0.055]} />
            <meshStandardMaterial color="#f6f8fa" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.009, 0]}>
            <cylinderGeometry args={[0.02, 0.026, 0.01, 16]} />
            <meshStandardMaterial color="#ffffff" roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/** Expanded-polystyrene cup in a beaker (standard 9701 rig). */
function CalorimeterCup({ running, T1, T2, phase }) {
  const dissolveRef = useRef()
  useFrame((_, delta) => {
    if (!dissolveRef.current) return
    const target = phase === 'running' ? 1 : 0
    const s = dissolveRef.current.userData.s ?? 0
    const ns = THREE.MathUtils.damp(s, target, 2, delta)
    dissolveRef.current.userData.s = ns
    // powder cloud swirls down and fades as it dissolves
    dissolveRef.current.material.opacity = phase === 'running' ? 0.5 * (1 - ns * 0.8) : 0
    dissolveRef.current.rotation.y += delta * 2.2
  })
  return (
    <group>
      {/* support beaker */}
      <mesh castShadow>
        <cylinderGeometry args={[0.052, 0.048, 0.105, 32, 1, true]} />
        <GlassMaterial opacity={0.18} />
      </mesh>
      {/* polystyrene cup nested inside */}
      <mesh position={[0, 0.022, 0]}>
        <cylinderGeometry args={[0.045, 0.035, 0.115, 28, 1, true]} />
        <meshStandardMaterial color="#f4f6f7" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.034, 0]}>
        <cylinderGeometry args={[0.0355, 0.0355, 0.004, 28]} />
        <meshStandardMaterial color="#eceff1" roughness={0.85} />
      </mesh>
      {/* water */}
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.042, 0.036, 0.075, 24]} />
        <meshStandardMaterial color="#cfe6f4" transparent opacity={0.55} roughness={0.1} />
      </mesh>
      {/* dissolving powder swirl */}
      <mesh ref={dissolveRef} position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.03, 0.02, 0.05, 12, 1, true]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {/* lid with thermometer hole */}
      <mesh position={[0, 0.082, 0]}>
        <cylinderGeometry args={[0.047, 0.047, 0.006, 28]} />
        <meshStandardMaterial color="#eef1f3" roughness={0.8} />
      </mesh>
      <Thermometer T1={T1} T2={T2} running={running} />
    </group>
  )
}

/** -10..110 °C thermometer through the lid; red column tracks T2. */
function Thermometer({ T1, T2, running }) {
  const colRef = useRef()
  const STEM = 0.2
  const frac = (t) => THREE.MathUtils.clamp((t + 10) / 120, 0, 1)
  useFrame(() => {
    if (!colRef.current) return
    const f = 0.12 + frac(running ? T2 : T1) * 0.55
    colRef.current.scale.y = f
    colRef.current.position.y = 0.09 - STEM / 2 + (f * STEM) / 2
  })
  return (
    <group position={[0.012, 0.09, 0]} rotation={[0, 0, -0.06]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.005, 0.005, STEM, 14]} />
        <GlassMaterial opacity={0.35} />
      </mesh>
      {/* bulb below lid, in the water */}
      <mesh position={[0, -STEM / 2 - 0.006, 0]}>
        <sphereGeometry args={[0.008, 14, 12]} />
        <meshStandardMaterial color="#d94141" roughness={0.2} />
      </mesh>
      <mesh ref={colRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.0018, 0.0018, STEM, 8]} />
        <meshStandardMaterial color="#d94141" roughness={0.3} />
      </mesh>
      {/* scale marks */}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[0.0052, -STEM / 2 + 0.02 + i * ((STEM - 0.04) / 12), 0]}>
          <boxGeometry args={[0.004, 0.0006, 0.0006]} />
          <meshBasicMaterial color="#3b4855" />
        </mesh>
      ))}
    </group>
  )
}

export default function EnthalpyScene() {
  const { enthalpy } = useLabStore()
  const BENCH_Y = -0.015

  return (
    <group>
      <LabRoom />
      <group position={[-0.08, BENCH_Y, 0.04]}>
        <BlobShadow r={0.062} opacity={0.22} y={0.001} />
      </group>
      <group position={[0.3, BENCH_Y, 0.02]}>
        <BlobShadow r={0.1} opacity={0.2} y={0.001} />
      </group>
      <group position={[-0.08, BENCH_Y + 0.0545, 0.04]}>
        <CalorimeterCup
          running={enthalpy.phase !== 'setup'}
          T1={enthalpy.T1}
          T2={enthalpy.T2}
          phase={enthalpy.phase}
        />
      </group>
      <group position={[0.3, BENCH_Y + 0.018, 0.02]} rotation={[0, -0.5, 0]}>
        <Balance mass={enthalpy.mass} boatLoaded={enthalpy.phase === 'setup'} />
      </group>
    </group>
  )
}
