import { useRef } from 'react'
import { DynamicDrawUsage, Object3D } from 'three'
import { useFrame } from '@react-three/fiber'
import { Text, Instances, Instance } from '@react-three/drei'
import { useLabStore } from '../store.js'
import {
  PEROXIDE_TIME_SCALE,
  peroxideRun,
  oxygenVolumeAt,
  initialRate,
} from '../lib/peroxide.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow } from './scene/props.jsx'
import { clampSimDelta } from '../lib/simClock.js'
import { patchInstanceOpacityMaterial } from '../lib/instancedOpacity.js'

const FLASK_X = -0.17
const SYRINGE_X = 0.08
const SYRINGE_Y = 0.17
const BARREL_LEN = 0.25
const BARREL_R = 0.022

const BUBBLE_COUNT = 20

const BUBBLE_SEEDS = Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
  x: ((i * 17) % 13 - 6) * 0.004,
  z: ((i * 23) % 11 - 5) * 0.004,
  phase: (i * 0.31) % 1,
  speed: 0.45 + (i % 6) * 0.08,
}))

const BUBBLE_DUMMY = new Object3D()

const BUBBLE_OPACITIES = new Float32Array(BUBBLE_COUNT)

function OxygenBubbles({ running, activity }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.visible = running
    if (!running) return
    const t = clock.getElapsedTime()
    const opacityAttr = mesh.geometry.attributes.aOpacity
    for (let i = 0; i < BUBBLE_COUNT; i += 1) {
      const seed = BUBBLE_SEEDS[i]
      const f = (t * seed.speed * (0.7 + activity) + seed.phase) % 1
      BUBBLE_DUMMY.position.set(seed.x * (1 - f * 0.35), 0.014 + f * 0.058, seed.z)
      BUBBLE_DUMMY.scale.setScalar(0.55 + f)
      BUBBLE_DUMMY.updateMatrix()
      mesh.setMatrixAt(i, BUBBLE_DUMMY.matrix)
      opacityAttr.array[i] = 0.55 * (1 - f) * Math.max(0.12, activity)
    }
    mesh.instanceMatrix.needsUpdate = true
    opacityAttr.needsUpdate = true
  })
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BUBBLE_COUNT]} frustumCulled={false} visible={false}>
      <sphereGeometry args={[0.0024, 8, 6]}>
        <instancedBufferAttribute
          attach="attributes-aOpacity"
          args={[BUBBLE_OPACITIES, 1]}
          usage={DynamicDrawUsage}
        />
      </sphereGeometry>
      <meshBasicMaterial
        transparent
        color="#eefbff"
        depthWrite={false}
        onBeforeCompile={patchInstanceOpacityMaterial}
      />
    </instancedMesh>
  )
}

const GRAIN_LIMIT = 18

const GRAIN_DUMMY = new Object3D()

function CatalystGrains({ grainCount, form }) {
  const meshRef = useRef()
  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.visible = grainCount > 0
    if (!grainCount) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < GRAIN_LIMIT; i += 1) {
      GRAIN_DUMMY.position.set(
        ((i * 11) % 9 - 4) * 0.005,
        0.008 + (i % 3) * 0.003,
        ((i * 7) % 7 - 3) * 0.005,
      )
      GRAIN_DUMMY.rotation.set(t * 0.5 + i, 0, t * 0.35 + i * 0.6)
      GRAIN_DUMMY.scale.setScalar(i < grainCount ? 1 : 0)
      GRAIN_DUMMY.updateMatrix()
      mesh.setMatrixAt(i, GRAIN_DUMMY.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh key={form} ref={meshRef} args={[undefined, undefined, GRAIN_LIMIT]} frustumCulled={false} visible={false}>
      {form === 'granules'
        ? <dodecahedronGeometry args={[0.0055]} />
        : <sphereGeometry args={[0.0022, 7, 5]} />}
      <meshStandardMaterial color="#34312f" roughness={0.88} />
    </instancedMesh>
  )
}

function ReactionFlask({ running, started, run }) {
  const activity = Math.min(1.7, initialRate(run.id) / initialRate('control'))
  const grainCount = !started || run.catalyst === 'none' ? 0 : run.catalystForm === 'powder' ? 18 : 6
  return (
    <group position={[FLASK_X, 0, 0]}>
      <mesh position={[0, 0.047, 0]}>
        <cylinderGeometry args={[0.017, 0.054, 0.094, 28, 1, true]} />
        <GlassMaterial opacity={0.18} />
      </mesh>
      <mesh position={[0, 0.107, 0]}>
        <cylinderGeometry args={[0.014, 0.017, 0.032, 20, 1, true]} />
        <GlassMaterial opacity={0.22} />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.0125, 0.015, 0.018, 18]} />
        <meshStandardMaterial color="#c17643" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.03, 0.049, 0.054, 26]} />
        <LiquidMaterial color="#c9e6f5" opacity={0.56} />
      </mesh>
      <CatalystGrains grainCount={grainCount} form={run.catalystForm} />
      <OxygenBubbles running={running} activity={activity} />
      {!started && run.catalyst !== 'none' && (
        <group position={[-0.082, 0.012, 0.035]} rotation={[0.08, 0.2, -0.08]}>
          <mesh>
            <boxGeometry args={[0.056, 0.004, 0.038]} />
            <meshStandardMaterial color="#edf2f5" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.004, 0]}>
            <boxGeometry args={[0.034, 0.004, 0.022]} />
            <meshStandardMaterial color="#34312f" roughness={0.9} />
          </mesh>
        </group>
      )}
      {run.temperature > 25 && (
        <group position={[0, -0.002, 0]}>
          <mesh position={[0, 0.043, 0]}>
            <cylinderGeometry args={[0.07, 0.066, 0.08, 28, 1, true]} />
            <GlassMaterial opacity={0.15} />
          </mesh>
          <mesh position={[0, 0.025, 0]}>
            <cylinderGeometry args={[0.067, 0.064, 0.045, 28]} />
            <LiquidMaterial color="#86bad9" opacity={0.34} />
          </mesh>
        </group>
      )}
      <Text
        position={[0, 0.17, 0]}
        font={LAB_FONT}
        fontSize={0.009}
        color="#465867"
        anchorX="center"
        outlineWidth={0.0006}
        outlineColor="#f2f5f7"
      >
        {run.temperature} °C · {run.catalyst === 'none' ? 'no catalyst' : run.catalystForm}
      </Text>
    </group>
  )
}

function DeliveryTube() {
  return (
    <group>
      <mesh position={[FLASK_X, 0.158, 0]}>
        <cylinderGeometry args={[0.0034, 0.0034, 0.065, 10]} />
        <GlassMaterial opacity={0.34} />
      </mesh>
      <mesh
        position={[(FLASK_X + SYRINGE_X - BARREL_LEN / 2) / 2, 0.19, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.0034, 0.0034, SYRINGE_X - BARREL_LEN / 2 - FLASK_X, 10]} />
        <GlassMaterial opacity={0.34} />
      </mesh>
      <mesh position={[SYRINGE_X - BARREL_LEN / 2, (0.19 + SYRINGE_Y) / 2, 0]}>
        <cylinderGeometry args={[0.0034, 0.0034, 0.19 - SYRINGE_Y, 10]} />
        <GlassMaterial opacity={0.34} />
      </mesh>
    </group>
  )
}

function GasSyringe({ volume }) {
  const plunger = useRef()
  const shown = useRef(0)
  useFrame(() => {
    shown.current += (volume - shown.current) * 0.1
    if (plunger.current) {
      plunger.current.position.x = (shown.current / 100) * (BARREL_LEN - 0.02)
    }
  })
  return (
    <group position={[SYRINGE_X, SYRINGE_Y, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[BARREL_R, BARREL_R, BARREL_LEN, 24, 1, true]} />
        <GlassMaterial opacity={0.18} />
      </mesh>
      <mesh position={[-BARREL_LEN / 2 - 0.008, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.016, 10]} />
        <GlassMaterial opacity={0.36} />
      </mesh>
      <Instances limit={11}>
        <boxGeometry args={[0.0008, 1, 0.0007]} />
        <meshBasicMaterial color="#536676" />
        {Array.from({ length: 11 }, (_, i) => (
          <Instance
            key={i}
            position={[-BARREL_LEN / 2 + 0.01 + (i / 10) * (BARREL_LEN - 0.02), 0, BARREL_R]}
            scale={[1, i % 2 ? 0.007 : 0.012, 1]}
          />
        ))}
      </Instances>
      {Array.from({ length: 6 }, (_, j) => (
        <Text
          key={j}
          position={[-BARREL_LEN / 2 + 0.01 + (j / 5) * (BARREL_LEN - 0.02), -0.032, 0]}
          font={LAB_FONT}
          fontSize={0.0065}
          color="#71889b"
          anchorX="center"
        >
          {j * 20}
        </Text>
      ))}
      <group ref={plunger}>
        <mesh position={[-BARREL_LEN / 2 + 0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[BARREL_R - 0.0015, BARREL_R - 0.0015, 0.008, 20]} />
          <meshStandardMaterial color="#8f9ba7" roughness={0.45} />
        </mesh>
        <mesh position={[-0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.22, 12]} />
          <meshStandardMaterial color="#c5d3df" emissive="#17202a" emissiveIntensity={0.08} roughness={0.3} metalness={0.22} />
        </mesh>
        <mesh position={[0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.017, 0.017, 0.006, 20]} />
          <meshStandardMaterial color="#c5d3df" emissive="#17202a" emissiveIntensity={0.08} roughness={0.3} metalness={0.22} />
        </mesh>
      </group>
      {[-0.075, 0.075].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.085, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.17, 12]} />
            <meshStandardMaterial color="#7c8995" roughness={0.35} metalness={0.65} />
          </mesh>
          <mesh position={[x, -0.17, 0]}>
            <boxGeometry args={[0.055, 0.008, 0.05]} />
            <meshStandardMaterial color="#434b53" roughness={0.5} metalness={0.55} />
          </mesh>
          <mesh position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[BARREL_R + 0.0025, 0.0022, 10, 24]} />
            <meshStandardMaterial color="#7c8995" roughness={0.35} metalness={0.65} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function PeroxideScene() {
  const { peroxide, peroxideTick } = useLabStore()
  const run = peroxideRun(peroxide.runId)
  const running = peroxide.phase === 'running'
  useFrame((_, delta) => {
    if (running) peroxideTick(clampSimDelta(delta) * PEROXIDE_TIME_SCALE)
  })
  const volume = peroxide.phase === 'setup' ? 0 : oxygenVolumeAt(peroxide.runId, peroxide.timeSec)
  return (
    <group>
      <LabRoom />
      <group position={[FLASK_X, 0, 0]}><BlobShadow r={0.1} /></group>
      <group position={[SYRINGE_X, 0, 0]}><BlobShadow r={0.08} /></group>
      <ReactionFlask running={running} started={peroxide.phase !== 'setup'} run={run} />
      <DeliveryTube />
      <GasSyringe volume={volume} />
    </group>
  )
}
