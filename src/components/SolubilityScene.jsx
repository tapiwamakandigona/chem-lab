import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Instances, Instance } from '@react-three/drei'
import * as THREE from 'three'
import { patchInstanceOpacityMaterial } from '../lib/instancedOpacity.js'
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

const BATH_COUNT = 12
const BATH_SEEDS = Array.from({ length: BATH_COUNT }, (_, i) => ({
  x: ((i % 4) - 1.5) * 0.025,
  z: (Math.floor(i / 4) - 1) * 0.025,
  phase: (i * 0.19) % 1,
}))
const BATH_OPACITIES = new Float32Array(BATH_COUNT)
const SWARM_DUMMY = new THREE.Object3D()

function WaterBath({ active, rushing }) {
  const bathMesh = useRef()
  useFrame(({ clock }) => {
    const mesh = bathMesh.current
    if (!mesh) return
    mesh.visible = active
    if (!active) return
    const t = clock.getElapsedTime()
    const opacityAttr = mesh.geometry.attributes.aOpacity
    for (let i = 0; i < BATH_COUNT; i += 1) {
      const s = BATH_SEEDS[i]
      const f = (t * 0.45 + s.phase) % 1
      SWARM_DUMMY.position.set(s.x, 0.055 + f * 0.095, s.z)
      SWARM_DUMMY.rotation.set(0, 0, 0)
      SWARM_DUMMY.scale.setScalar(1)
      SWARM_DUMMY.updateMatrix()
      mesh.setMatrixAt(i, SWARM_DUMMY.matrix)
      opacityAttr.array[i] = 0.3 * (1 - f)
    }
    mesh.instanceMatrix.needsUpdate = true
    opacityAttr.needsUpdate = true
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
      {/* crash-cooling ice — one instanced draw for all 8 cubes */}
      {rushing && (
        <Instances limit={8}>
          <boxGeometry args={[0.025, 0.021, 0.024]} />
          <meshStandardMaterial color="#dff5ff" transparent opacity={0.78} roughness={0.18} />
          {Array.from({ length: 8 }, (_, i) => (
            <Instance
              key={`ice-${i}`}
              position={[
                ((i % 4) - 1.5) * 0.038,
                0.115 + (i % 2) * 0.018,
                (Math.floor(i / 4) - 0.5) * 0.06,
              ]}
              rotation={[i * 0.17, i * 0.3, 0]}
            />
          ))}
        </Instances>
      )}
      {/* bath bubbles — single instanced draw, per-instance fade via aOpacity */}
      <instancedMesh ref={bathMesh} args={[undefined, undefined, BATH_COUNT]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.0032, 8, 6]}>
          <instancedBufferAttribute
            attach="attributes-aOpacity"
            args={[BATH_OPACITIES, 1]}
            usage={THREE.DynamicDrawUsage}
          />
        </sphereGeometry>
        <meshBasicMaterial
          transparent
          color="#eefaff"
          depthWrite={false}
          onBeforeCompile={patchInstanceOpacityMaterial}
        />
      </instancedMesh>
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
      {/* graduations — one instanced draw for all ticks */}
      <Instances limit={13}>
        <boxGeometry args={[1, 0.0007, 0.0007]} />
        <meshBasicMaterial color="#354655" />
        {Array.from({ length: 13 }, (_, i) => (
          <Instance
            key={i}
            position={[0.006, -stem / 2 + 0.015 + i * 0.02, 0]}
            scale={[i % 2 ? 0.004 : 0.006, 1, 1]}
          />
        ))}
      </Instances>
    </group>
  )
}

const POWDER_COUNT = 14
const CRYSTAL_COUNT = 24
const CRYSTAL_SEEDS = Array.from({ length: CRYSTAL_COUNT }, (_, i) => ({
  x: ((i * 17) % 11 - 5) * 0.0043,
  z: ((i * 29) % 9 - 4) * 0.004,
  y: (i % 4) * 0.003,
  rot: (i * 0.7) % Math.PI,
}))

function BoilingTube({ temperature, status, phase }) {
  const powderMesh = useRef()
  const crystalMesh = useRef()
  const stirrer = useRef()
  const crystalCount = Math.min(CRYSTAL_COUNT, Math.round(status.crystalMass * 3.5))
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (stirrer.current) stirrer.current.rotation.y = phase === 'heating' ? t * 5 : 0
    const dissolved = status.clear || phase === 'clear' || phase === 'cooling' || phase === 'complete'
    const pm = powderMesh.current
    if (pm) {
      pm.visible = !dissolved
      if (!dissolved) {
        for (let i = 0; i < POWDER_COUNT; i += 1) {
          SWARM_DUMMY.position.set(
            ((i * 7) % 9 - 4) * 0.005,
            0.018 + Math.sin(t * 2.4 + i) * 0.003,
            ((i * 5) % 7 - 3) * 0.005,
          )
          SWARM_DUMMY.rotation.set(0, 0, 0)
          SWARM_DUMMY.scale.setScalar(1)
          SWARM_DUMMY.updateMatrix()
          pm.setMatrixAt(i, SWARM_DUMMY.matrix)
        }
        pm.instanceMatrix.needsUpdate = true
      }
    }
    const cm = crystalMesh.current
    if (cm) {
      cm.visible = crystalCount > 0
      const grow = Math.min(1, status.crystalMass / 2)
      const scale = 0.35 + grow * (status.quality.startsWith('large') ? 0.9 : 0.55)
      for (let i = 0; i < CRYSTAL_COUNT; i += 1) {
        const seed = CRYSTAL_SEEDS[i]
        SWARM_DUMMY.position.set(seed.x, -0.024 + seed.y, seed.z)
        SWARM_DUMMY.rotation.set(seed.rot, seed.rot * 0.5, seed.rot * 0.3)
        SWARM_DUMMY.scale.setScalar(i < crystalCount ? scale : 0)
        SWARM_DUMMY.updateMatrix()
        cm.setMatrixAt(i, SWARM_DUMMY.matrix)
      }
      cm.instanceMatrix.needsUpdate = true
    }
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
      {/* undissolved KNO3 powder — one instanced draw */}
      <instancedMesh ref={powderMesh} args={[undefined, undefined, POWDER_COUNT]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.0038, 8, 6]} />
        <meshStandardMaterial color="#f5f5ee" roughness={0.95} />
      </instancedMesh>
      {/* crystals settle at the rounded bottom — one instanced draw */}
      <instancedMesh ref={crystalMesh} args={[undefined, undefined, CRYSTAL_COUNT]} frustumCulled={false} visible={false}>
        <octahedronGeometry args={[0.006, 0]} />
        <meshStandardMaterial
          color="#edf4fb"
          transparent
          opacity={0.88}
          roughness={0.18}
          metalness={0.02}
        />
      </instancedMesh>
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
