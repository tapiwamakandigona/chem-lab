import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import { ELECTRO_UNKNOWNS } from '../lib/electro.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow, LabNotebook } from './scene/props.jsx'

const BK_R = 0.032
const BK_H = 0.065

const METAL_COLORS = {
  Mg: '#c8cdd2', Zn: '#aab4bc', Fe: '#8e8e93', Ni: '#b8bcb6',
  Pb: '#6f7478', Cu: '#c26f3c', Ag: '#dfe3e8',
}

function Beaker({ position, solution = '#cfe4f2', label }) {
  return (
    <group position={position}>
      <mesh position={[0, BK_H / 2, 0]}>
        <cylinderGeometry args={[BK_R, BK_R * 0.95, BK_H, 24, 1, true]} />
        <GlassMaterial opacity={0.16} />
      </mesh>
      <mesh position={[0, 0.0015, 0]}>
        <cylinderGeometry args={[BK_R * 0.95, BK_R * 0.95, 0.003, 24]} />
        <GlassMaterial opacity={0.25} />
      </mesh>
      <mesh position={[0, BK_H * 0.36, 0]}>
        <cylinderGeometry args={[BK_R * 0.9, BK_R * 0.86, BK_H * 0.68, 20]} />
        <LiquidMaterial color={solution} opacity={0.55} />
      </mesh>
      {label && (
        <Text
          font={LAB_FONT}
          position={[0, -0.012, BK_R + 0.004]}
          fontSize={0.009}
          color="#3b4855"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.0008}
          outlineColor="#f5f7fa"
        >
          {label}
        </Text>
      )}
      <BlobShadow r={BK_R * 1.15} />
    </group>
  )
}

function Electrode({ position, color, label }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.045, 0]} castShadow>
        <boxGeometry args={[0.014, 0.09, 0.0035]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.6} />
      </mesh>
      {label && (
        <Text
          font={LAB_FONT}
          position={[0, 0.098, 0]}
          fontSize={0.009}
          color="#3b4855"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.0008}
          outlineColor="#f5f7fa"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

/** U-shaped salt bridge (filter-paper look) spanning the two beakers. */
function SaltBridge({ x1, x2, y }) {
  const mid = (x1 + x2) / 2
  const half = (x2 - x1) / 2
  return (
    <group position={[mid, y, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, half * 2 - 0.01, 10]} />
        <meshStandardMaterial color="#e8e2d2" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (half - 0.005), -0.02, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.045, 10]} />
          <meshStandardMaterial color="#e8e2d2" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Wire drooping between two points (simple quadratic sag). */
function Wire({ from, to, color = '#b3402a', sag = 0.04 }) {
  const mid = [(from[0] + to[0]) / 2, Math.min(from[1], to[1]) - sag, (from[2] + to[2]) / 2]
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to),
  )
  return (
    <mesh>
      <tubeGeometry args={[curve, 20, 0.0016, 8]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

/** Digital voltmeter; needle-free, shows the live EMF + polarity. */
function Voltmeter({ position, emf, negative }) {
  const flick = useRef(0)
  const textRef = useRef()
  useFrame((_, dt) => {
    // tiny display flicker when a fresh reading lands
    if (flick.current > 0) flick.current = Math.max(0, flick.current - dt)
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[0.085, 0.06, 0.03]} />
        <meshStandardMaterial color="#2a323c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.041, 0.0152]}>
        <boxGeometry args={[0.064, 0.024, 0.001]} />
        <meshStandardMaterial color="#101a12" roughness={0.4} emissive="#0c2410" emissiveIntensity={0.6} />
      </mesh>
      <Text
        ref={textRef}
        font={LAB_FONT}
        position={[0, 0.041, 0.017]}
        fontSize={0.013}
        color="#5ee87a"
        anchorX="center"
        anchorY="middle"
      >
        {emf == null ? '-.--' : emf.toFixed(2)}
      </Text>
      <Text
        font={LAB_FONT}
        position={[0, 0.018, 0.017]}
        fontSize={0.006}
        color="#8b98a5"
        anchorX="center"
        anchorY="middle"
      >
        {emf == null ? 'VOLTS DC' : negative ? 'unknown at − terminal' : 'unknown at + terminal'}
      </Text>
      {/* terminals */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.028, 0.002, 0.012]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.006, 10]} />
          <meshStandardMaterial color={s < 0 ? '#2a2f36' : '#b33'} roughness={0.5} />
        </mesh>
      ))}
      <BlobShadow r={0.05} />
    </group>
  )
}

export default function ElectroScene() {
  const electro = useLabStore((s) => s.electro)
  const unknown = ELECTRO_UNKNOWNS[electro.unknown]
  const last = electro.measurements[electro.measurements.length - 1] ?? null
  const ref = last?.ref ?? 'Cu'
  const refSolution = ref === 'Cu' ? '#7fb2d9' : '#dcecf7'

  const UNK_X = -0.12
  const REF_X = 0.02
  const METER = [-0.05, 0, 0.18]

  return (
    <group>
      <LabRoom />
      <group position={[0, -0.015, 0.02]}>
        {/* unknown half-cell */}
        <Beaker position={[UNK_X, 0, 0]} solution="#e3ecf2" label={`${unknown.label} salt (1.00 mol/dm³)`} />
        <Electrode position={[UNK_X - 0.014, 0.012, 0]} color="#9aa1a8" label={unknown.label} />
        {/* reference half-cell */}
        <Beaker position={[REF_X, 0, 0]} solution={refSolution} label={`${ref}²⁺(aq) 1.00 mol/dm³`} />
        <Electrode position={[REF_X + 0.014, 0.012, 0]} color={METAL_COLORS[ref]} label={ref} />
        {/* salt bridge + wiring */}
        <SaltBridge x1={UNK_X + 0.014} x2={REF_X - 0.014} y={0.095} />
        <Wire from={[UNK_X - 0.014, 0.1, 0]} to={[METER[0] - 0.028, 0.02, 0.012]} color="#2a2f36" sag={0.05} />
        <Wire from={[REF_X + 0.014, 0.1, 0]} to={[METER[0] + 0.028, 0.02, 0.012]} color="#b33" sag={0.035} />
        <Voltmeter position={METER} emf={last?.emf ?? null} negative={last?.unknownIsNegative ?? false} />
        <group position={[-0.52, 0, 0.1]}><LabNotebook /></group>
      </group>
    </group>
  )
}
