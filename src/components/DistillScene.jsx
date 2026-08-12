import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import {
  DISTILL_TIME_SCALE,
  distillStatus,
} from '../lib/distill.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial, FresnelRim } from './scene/glassware.jsx'
import { BlobShadow, LabNotebook } from './scene/props.jsx'

const FLASK = [-0.22, 0.18, 0]
const HEAD_Y = 0.37
const COND_START_X = -0.13
const COND_END_X = 0.23

function sphereGeometry() {
  return new THREE.SphereGeometry(0.082, 36, 24)
}

function RoundBottomFlask({ heating, granules, bumping, volume }) {
  const liquid = useRef()
  const bubbleRefs = useRef([])
  const flaskGeo = useMemo(() => sphereGeometry(), [])
  const seeds = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      x: ((i * 37) % 11 - 5) * 0.008,
      z: ((i * 53) % 9 - 4) * 0.008,
      phase: (i * 0.21) % 1,
      speed: 0.7 + (i % 4) * 0.17,
    })),
    [],
  )

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (liquid.current) {
      liquid.current.rotation.z = bumping ? Math.sin(t * 18) * 0.025 : Math.sin(t * 2) * 0.002
    }
    bubbleRefs.current.forEach((b, i) => {
      if (!b) return
      const sd = seeds[i]
      const f = (t * sd.speed + sd.phase) % 1
      b.position.set(sd.x * (1 - f * 0.5), -0.04 + f * 0.075, sd.z * (1 - f * 0.5))
      b.material.opacity = heating ? (bumping ? 0.85 : 0.48) * (1 - f * 0.55) : 0
      b.scale.setScalar((bumping ? 1.55 : 0.75) + f * 0.55)
    })
  })

  const fillScale = Math.max(0.34, 0.72 * Math.sqrt(Math.max(volume, 1) / 20))
  const liquidGeo = useMemo(
    () => new THREE.SphereGeometry(
      0.071, 28, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2,
    ),
    [],
  )
  return (
    <group position={FLASK}>
      <mesh geometry={flaskGeo} castShadow>
        <GlassMaterial opacity={0.16} />
      </mesh>
      <FresnelRim geometry={flaskGeo} />
      <mesh position={[0, 0.077, 0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.11, 22, 1, true]} />
        <GlassMaterial opacity={0.18} />
      </mesh>

      {/* CuSO4 solution stays blue in the flask; only water distils. */}
      <mesh ref={liquid} geometry={liquidGeo} position={[0, -0.025, 0]} scale={[1, fillScale, 1]}>
        <LiquidMaterial color="#327cb8" opacity={0.78} />
      </mesh>
      {granules && [
        [-0.023, -0.073, 0.012], [0.006, -0.075, -0.018], [0.028, -0.071, 0.005],
      ].map((p, i) => (
        <mesh key={i} position={p}>
          <dodecahedronGeometry args={[0.006]} />
          <meshStandardMaterial color="#d7d1bf" roughness={0.95} />
        </mesh>
      ))}
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => { bubbleRefs.current[i] = el }}>
          <sphereGeometry args={[0.0028, 8, 6]} />
          <meshBasicMaterial color="#d8effb" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
      <BlobShadow r={0.1} />
    </group>
  )
}

function ElectricHeater({ active }) {
  const coil = useRef()
  useFrame(({ clock }) => {
    if (!coil.current) return
    coil.current.material.emissiveIntensity = active
      ? 1.5 + Math.sin(clock.getElapsedTime() * 9) * 0.18
      : 0.08
  })
  return (
    <group position={[-0.22, 0.02, 0]}>
      <mesh position={[0, 0.017, 0]}>
        <cylinderGeometry args={[0.095, 0.105, 0.034, 28]} />
        <meshStandardMaterial color="#333b43" metalness={0.55} roughness={0.42} />
      </mesh>
      <mesh ref={coil} position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.007, 12, 36]} />
        <meshStandardMaterial color="#c0472d" emissive="#ff542e" emissiveIntensity={0.08} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.044, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.078, 30]} />
        <meshStandardMaterial color="#606971" roughness={0.6} metalness={0.38} />
      </mesh>
      <BlobShadow r={0.12} />
    </group>
  )
}

function StillHead() {
  return (
    <group>
      <mesh position={[-0.22, HEAD_Y - 0.03, 0]}>
        <cylinderGeometry args={[0.021, 0.022, 0.18, 22, 1, true]} />
        <GlassMaterial opacity={0.19} />
      </mesh>
      <mesh position={[-0.17, HEAD_Y + 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.12, 20, 1, true]} />
        <GlassMaterial opacity={0.19} />
      </mesh>
      {/* thermometer bulb sits level with the side-arm opening */}
      <mesh position={[-0.22, HEAD_Y + 0.055, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.19, 12]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
      <mesh position={[-0.22, HEAD_Y - 0.02, 0]}>
        <sphereGeometry args={[0.007, 14, 10]} />
        <meshStandardMaterial color="#ce4036" emissive="#6b1712" emissiveIntensity={0.2} roughness={0.3} />
      </mesh>
    </group>
  )
}

function ConnectorTube({ from, to, radius, color, opacity = 1 }) {
  const a = new THREE.Vector3(...from)
  const b = new THREE.Vector3(...to)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const dir = b.clone().sub(a)
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  )
  return (
    <mesh position={mid} quaternion={q}>
      <cylinderGeometry args={[radius, radius, dir.length(), 12]} />
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} roughness={0.35} />
    </mesh>
  )
}

function Condenser({ cooling, condensing }) {
  const drops = useRef([])
  const seeds = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({ phase: i / 8, lane: (i % 3 - 1) * 0.004 })),
    [],
  )
  const start = new THREE.Vector3(COND_START_X, HEAD_Y + 0.015, 0)
  const end = new THREE.Vector3(COND_END_X, HEAD_Y - 0.03, 0)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const dir = end.clone().sub(start)
  const angle = Math.atan2(dir.y, dir.x)
  const waterActive = cooling !== 'off'
  const lowerCorrect = cooling === 'lower'

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    drops.current.forEach((d, i) => {
      if (!d) return
      const f = (t * 0.23 + seeds[i].phase) % 1
      d.position.set(
        start.x + dir.x * f,
        start.y + dir.y * f + seeds[i].lane,
        0,
      )
      d.material.opacity = condensing ? 0.78 * Math.sin(Math.PI * f) : 0
      d.scale.setScalar(0.65 + f * 0.45)
    })
  })

  return (
    <group>
      {/* outer water jacket + inner vapour tube */}
      <mesh position={mid} rotation={[0, 0, angle + Math.PI / 2]}>
        <cylinderGeometry args={[0.033, 0.033, dir.length(), 28, 1, true]} />
        <GlassMaterial opacity={0.15} />
      </mesh>
      <mesh position={mid} rotation={[0, 0, angle + Math.PI / 2]}>
        <cylinderGeometry args={[0.014, 0.014, dir.length() + 0.035, 18, 1, true]} />
        <GlassMaterial opacity={0.24} />
      </mesh>
      {waterActive && (
        <mesh position={mid} rotation={[0, 0, angle + Math.PI / 2]}>
          <cylinderGeometry args={[0.029, 0.029, dir.length() - 0.018, 24, 1, true]} />
          <meshStandardMaterial
            color={lowerCorrect ? '#73c8ec' : '#92b6c8'}
            transparent
            opacity={lowerCorrect ? 0.28 : 0.14}
            roughness={0.25}
            side={2}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* hose nozzles: lower/right inlet, upper/left outlet */}
      <ConnectorTube
        from={[COND_END_X - 0.045, HEAD_Y - 0.057, 0]}
        to={[COND_END_X - 0.045, HEAD_Y - 0.12, 0.02]}
        radius={0.006}
        color={lowerCorrect ? '#3bb5e8' : '#758c99'}
        opacity={waterActive ? 0.88 : 0.45}
      />
      <ConnectorTube
        from={[COND_START_X + 0.045, HEAD_Y + 0.04, 0]}
        to={[COND_START_X + 0.045, HEAD_Y + 0.105, 0.02]}
        radius={0.006}
        color={cooling === 'upper' ? '#3bb5e8' : '#758c99'}
        opacity={waterActive ? 0.88 : 0.45}
      />
      <Text
        font={LAB_FONT}
        position={[COND_END_X - 0.012, HEAD_Y - 0.13, 0.025]}
        fontSize={0.008}
        color="#42535f"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0007}
        outlineColor="#f5f7fa"
      >
        lower inlet
      </Text>
      <Text
        font={LAB_FONT}
        position={[COND_START_X + 0.035, HEAD_Y + 0.12, 0.025]}
        fontSize={0.008}
        color="#42535f"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0007}
        outlineColor="#f5f7fa"
      >
        upper outlet
      </Text>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => { drops.current[i] = el }}>
          <sphereGeometry args={[0.0032, 9, 7]} />
          <meshBasicMaterial color="#d8f2fb" transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function Receiver({ volume }) {
  const fill = Math.min(0.75, volume / 18)
  return (
    <group position={[0.3, 0.015, 0]}>
      {/* open receiving cylinder — apparatus must never be sealed */}
      <mesh position={[0, 0.065, 0]}>
        <cylinderGeometry args={[0.041, 0.038, 0.13, 24, 1, true]} />
        <GlassMaterial opacity={0.17} />
      </mesh>
      <mesh position={[0, 0.0015, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.003, 24]} />
        <GlassMaterial opacity={0.25} />
      </mesh>
      {fill > 0 && (
        <mesh position={[0, 0.004 + fill * 0.105 / 2, 0]}>
          <cylinderGeometry args={[0.035, 0.035, fill * 0.105, 22]} />
          <LiquidMaterial color="#e4f3fa" opacity={0.65} />
        </mesh>
      )}
      <Text
        font={LAB_FONT}
        position={[0, 0.15, 0]}
        fontSize={0.01}
        color="#40515e"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.0008}
        outlineColor="#f5f7fa"
      >
        {volume.toFixed(1)} cm³
      </Text>
      <BlobShadow r={0.065} />
    </group>
  )
}

function SupportStand() {
  return (
    <group>
      <mesh position={[-0.34, 0.29, -0.075]}>
        <cylinderGeometry args={[0.005, 0.005, 0.56, 12]} />
        <meshStandardMaterial color="#aeb8c1" metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh position={[-0.34, 0.008, -0.075]}>
        <boxGeometry args={[0.18, 0.016, 0.14]} />
        <meshStandardMaterial color="#3e454c" metalness={0.55} roughness={0.5} />
      </mesh>
      <ConnectorTube
        from={[-0.34, 0.31, -0.075]}
        to={[-0.23, 0.29, -0.01]}
        radius={0.004}
        color="#aeb8c1"
      />
      <mesh position={[-0.22, 0.29, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.03, 0.004, 10, 28]} />
        <meshStandardMaterial color="#d5a64c" roughness={0.55} />
      </mesh>
    </group>
  )
}

function CondenserStand() {
  return (
    <group>
      <mesh position={[0.13, 0.235, -0.07]}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.47, 12]} />
        <meshStandardMaterial color="#aeb8c1" metalness={0.82} roughness={0.25} />
      </mesh>
      <mesh position={[0.13, 0.008, -0.07]}>
        <boxGeometry args={[0.16, 0.016, 0.13]} />
        <meshStandardMaterial color="#3e454c" metalness={0.55} roughness={0.5} />
      </mesh>
      <ConnectorTube
        from={[0.13, 0.34, -0.07]}
        to={[0.08, 0.34, -0.01]}
        radius={0.004}
        color="#aeb8c1"
      />
      <mesh position={[0.075, 0.34, 0]} rotation={[Math.PI / 2, 0.12, 0]}>
        <torusGeometry args={[0.036, 0.004, 10, 28]} />
        <meshStandardMaterial color="#d5a64c" roughness={0.55} />
      </mesh>
    </group>
  )
}

export default function DistillScene() {
  const { distill, distillTick } = useLabStore()
  const status = distillStatus(distill)

  useFrame((_, delta) => {
    if (distill.heating) distillTick(delta * DISTILL_TIME_SCALE)
  })

  const remaining = Math.max(3, 20 - status.volume)
  const condensing = distill.heating && status.temperature >= 98 && distill.cooling !== 'off'

  return (
    <group>
      <LabRoom />
      <group position={[-0.02, -0.015, 0.02]}>
        <SupportStand />
        <CondenserStand />
        <ElectricHeater active={distill.heating} />
        <RoundBottomFlask
          heating={distill.heating && status.temperature > 80}
          granules={distill.granules}
          bumping={status.bumping}
          volume={remaining}
        />
        <StillHead />
        <Condenser cooling={distill.cooling} condensing={condensing} />
        <ConnectorTube
          from={[COND_END_X, HEAD_Y - 0.03, 0]}
          to={[0.3, 0.17, 0]}
          radius={0.013}
          color="#dcecf7"
          opacity={0.24}
        />
        <Receiver volume={status.volume} />
        <group position={[0.5, 0, 0.14]}><LabNotebook /></group>
      </group>
    </group>
  )
}
