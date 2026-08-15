import { useMemo, useRef } from 'react'
import { Object3D, DynamicDrawUsage } from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { ORGANIC_UNKNOWNS } from '../lib/organic.js'
import { patchInstanceOpacityMaterial } from '../lib/instancedOpacity.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow, WashBottle, LabNotebook } from './scene/props.jsx'

const TUBE_R = 0.011
const TUBE_H = 0.115

// Water-bath steam wisps — one InstancedMesh instead of 5 meshes.
const WISP_COUNT = 5
const WISP_SEEDS = Array.from({ length: WISP_COUNT }, (_, i) => ({
  phase: i * 1.3,
  x: (i % 3 - 1) * 0.012,
  speed: 0.25 + (i % 3) * 0.08,
}))
const WISP_DUMMY = new Object3D()
const WISP_OPACITIES = new Float32Array(WISP_COUNT)

/** Glass test tube; mirror coats the wall silver, ppt/bubbles as in qual. */
function OrganicTube({ position, liquidColor = '#dcecf7', fill = 0.5, ppt = null, bubbles = false, mirror = false, label }) {
  const bubbleRefs = useRef([])
  const seeds = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({ phase: i * 0.9, x: (i % 3 - 1) * 0.004, speed: 0.5 + (i % 4) * 0.12 })),
    [],
  )
  useFrame(({ clock }) => {
    if (!bubbles) return
    const t = clock.getElapsedTime()
    bubbleRefs.current.forEach((m, i) => {
      if (!m) return
      const s = seeds[i]
      const f = ((t * s.speed + s.phase) % 1)
      m.position.y = 0.012 + f * (fill * TUBE_H - 0.018)
      m.scale.setScalar(0.5 + f * 0.8)
    })
  })
  const liquidH = fill * TUBE_H
  return (
    <group position={position}>
      {/* glass wall — silvered inside when a Tollens' mirror has formed */}
      <mesh position={[0, TUBE_H / 2, 0]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, TUBE_H, 20, 1, true]} />
        {mirror
          ? <meshStandardMaterial color="#e4e8ec" roughness={0.18} metalness={0.45} emissive="#9aa2ab" emissiveIntensity={0.25} side={2} />
          : <GlassMaterial opacity={0.18} />}
      </mesh>
      <mesh>
        <sphereGeometry args={[TUBE_R, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {mirror
          ? <meshStandardMaterial color="#e4e8ec" roughness={0.18} metalness={0.45} emissive="#9aa2ab" emissiveIntensity={0.25} side={2} />
          : <GlassMaterial opacity={0.18} />}
      </mesh>
      <mesh position={[0, liquidH / 2 + 0.002, 0]}>
        <cylinderGeometry args={[TUBE_R * 0.86, TUBE_R * 0.86, liquidH, 16]} />
        <LiquidMaterial color={liquidColor} opacity={0.7} />
      </mesh>
      {ppt && (
        <>
          <mesh position={[0, liquidH * 0.45, 0]}>
            <cylinderGeometry args={[TUBE_R * 0.8, TUBE_R * 0.8, liquidH * 0.55, 14]} />
            <meshStandardMaterial color={ppt} transparent opacity={0.55} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.007, 0]}>
            <cylinderGeometry args={[TUBE_R * 0.84, TUBE_R * 0.7, 0.012, 14]} />
            <meshStandardMaterial color={ppt} roughness={0.95} />
          </mesh>
        </>
      )}
      {bubbles && seeds.map((_, i) => (
        <mesh key={i} ref={(el) => { bubbleRefs.current[i] = el }} position={[seeds[i].x, 0.02, 0]}>
          <sphereGeometry args={[0.0014, 8, 6]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.85} roughness={0.2} />
        </mesh>
      ))}
      {label && (
        <Text
          font={LAB_FONT}
          position={[0, TUBE_H + 0.018, 0]}
          fontSize={0.011}
          color="#3b4855"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.001}
          outlineColor="#f5f7fa"
        >
          {label}
        </Text>
      )}
    </group>
  )
}

/** 250 cm³ beaker of warm water on a stand — the P3 water bath. */
function WaterBath({ position, active }) {
  const steamRef = useRef()
  useFrame(({ clock }) => {
    const mesh = steamRef.current
    if (!mesh) return
    mesh.visible = active
    if (!active) return
    const t = clock.getElapsedTime()
    const opacityAttr = mesh.geometry.attributes.aOpacity
    for (let i = 0; i < WISP_COUNT; i += 1) {
      const s = WISP_SEEDS[i]
      const f = ((t * s.speed + s.phase) % 1)
      WISP_DUMMY.position.set(s.x, 0.075 + f * 0.05, 0)
      WISP_DUMMY.scale.setScalar(0.6 + f * 1.2)
      WISP_DUMMY.updateMatrix()
      mesh.setMatrixAt(i, WISP_DUMMY.matrix)
      opacityAttr.array[i] = 0.16 * (1 - f)
    }
    mesh.instanceMatrix.needsUpdate = true
    opacityAttr.needsUpdate = true
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.037, 0]}>
        <cylinderGeometry args={[0.042, 0.04, 0.075, 24, 1, true]} />
        <GlassMaterial opacity={0.16} />
      </mesh>
      <mesh position={[0, 0.001, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.003, 24]} />
        <GlassMaterial opacity={0.25} />
      </mesh>
      <mesh position={[0, 0.031, 0]}>
        <cylinderGeometry args={[0.038, 0.037, 0.058, 20]} />
        <LiquidMaterial color="#cfe4f2" opacity={0.5} />
      </mesh>
      {/* wisps of steam while a warm test is running — single instanced draw call */}
      <instancedMesh ref={steamRef} args={[undefined, undefined, WISP_COUNT]} frustumCulled={false} visible={false}>
        <sphereGeometry args={[0.006, 8, 6]}>
          <instancedBufferAttribute
            attach="attributes-aOpacity"
            args={[WISP_OPACITIES, 1]}
            usage={DynamicDrawUsage}
          />
        </sphereGeometry>
        <meshBasicMaterial
          transparent
          color="#eef3f8"
          depthWrite={false}
          onBeforeCompile={patchInstanceOpacityMaterial}
        />
      </instancedMesh>
      <BlobShadow r={0.05} />
    </group>
  )
}

/** Wooden test-tube rack (same design language as qual). */
function Rack({ position, slots = 5 }) {
  const w = slots * 0.034 + 0.02
  return (
    <group position={position}>
      <mesh position={[0, 0.006, 0]} castShadow>
        <boxGeometry args={[w, 0.012, 0.06]} />
        <meshStandardMaterial color="#9a713f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.062, 0]}>
        <boxGeometry args={[w, 0.008, 0.06]} />
        <meshStandardMaterial color="#a87c46" roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.006), 0.034, 0]}>
          <boxGeometry args={[0.012, 0.06, 0.06]} />
          <meshStandardMaterial color="#8a6437" roughness={0.85} />
        </mesh>
      ))}
      <BlobShadow r={w * 0.62} />
    </group>
  )
}

/** Dropper animating over the live tube whenever a test runs. */
function Dropper({ target, testCount }) {
  const g = useRef()
  const state = useRef({ seen: testCount, anim: 0 })
  useFrame((_, dt) => {
    if (!g.current) return
    const st = state.current
    if (testCount !== st.seen) {
      st.seen = testCount
      st.anim = 1.6
    }
    if (st.anim > 0) {
      st.anim = Math.max(0, st.anim - dt)
      const f = 1 - st.anim / 1.6
      const dip = Math.sin(Math.min(1, f * 1.6) * Math.PI) * 0.03
      g.current.position.set(target[0], target[1] + 0.19 - dip, target[2])
      g.current.visible = true
    } else {
      g.current.visible = false
    }
  })
  return (
    <group ref={g} visible={false}>
      <mesh>
        <cylinderGeometry args={[0.004, 0.0028, 0.07, 12]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
      <mesh position={[0, 0.045, 0]}>
        <sphereGeometry args={[0.009, 12, 10]} />
        <meshStandardMaterial color="#b33" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.041, 0]}>
        <sphereGeometry args={[0.0016, 8, 6]} />
        <LiquidMaterial color="#f2e3c0" opacity={0.9} />
      </mesh>
    </group>
  )
}

const WARM_TESTS = ['tollens', 'fehling', 'dichromate', 'iodoform']

export default function OrganicScene() {
  const organic = useLabStore((s) => s.organic)
  const unknown = ORGANIC_UNKNOWNS[organic.unknown]
  const v = organic.lastVisual
  const liveColor = v?.solution ?? '#dcecf7'
  const warm = WARM_TESTS.includes(v?.test)
  // during a warm test the live tube sits in the water bath
  const livePos = warm ? [0.12, 0.02, -0.04] : [0, 0.001, -0.02]

  return (
    <group>
      <LabRoom />
      <group position={[0, -0.015, 0.02]}>
        <Rack position={[-0.22, 0, -0.1]} slots={4} />
        {[0, 1, 2, 3].map((i) => (
          <OrganicTube
            key={i}
            position={[-0.22 - 0.051 + i * 0.034, 0.012, -0.1]}
            liquidColor="#eef3e2"
            fill={i === 2 ? 0.4 : 0.5}
          />
        ))}
        <WaterBath position={[0.12, 0, -0.04]} active={warm} />
        <group position={livePos}>
          <OrganicTube
            position={[0, 0.012, 0]}
            liquidColor={liveColor}
            fill={0.5}
            ppt={v?.ppt ?? null}
            bubbles={v?.bubbles ?? false}
            mirror={v?.mirror ?? false}
            label={unknown.label}
          />
          <BlobShadow r={0.03} />
        </group>
        <Dropper target={[livePos[0], livePos[1], livePos[2]]} testCount={organic.tests.length} />
        <group position={[0.42, 0, -0.12]}><WashBottle /></group>
        <group position={[-0.52, 0, 0.1]}><LabNotebook /></group>
      </group>
    </group>
  )
}
