import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore, CLOCK_TIME_SCALE, clockEndpointSec } from '../store.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { BeakerGlass, GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'

function LabeledBeaker({ position, label, liquidColor, fill = 0.55 }) {
  return (
    <group position={position}>
      <BeakerGlass r={0.032} h={0.09} liquidColor={liquidColor} fill={fill} />
      <Text
        font={LAB_FONT}
        position={[0, 0.115, 0]}
        fontSize={0.016}
        color="#3b4855"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.0012}
        outlineColor="#f5f7fa"
      >
        {label}
      </Text>
    </group>
  )
}

/** White paper with the printed cross, fading as turbidity rises. */
function CrossPaper({ crossOpacity }) {
  return (
    <group position={[0, 0.004, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[0.17, 0.006, 0.17]} />
        <meshStandardMaterial color="#f7f9fa" roughness={0.55} />
      </mesh>
      {[[0.1, 0.018], [0.018, 0.1]].map(([w, d], i) => (
        <mesh key={i} position={[0, 0.0038, 0]}>
          <boxGeometry args={[w, 0.0008, d]} />
          <meshStandardMaterial color="#101418" transparent opacity={crossOpacity} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 100 cm³ Griffin beaker used as the reaction vessel (per the S23 paper the
 * mixture is in a conical flask on the cross; a beaker shows the cross from
 * above better). Liquid turns turbid: transparent blue → milky yellow-white.
 */
function ReactionFlask({ turbidity }) {
  const glassGeo = useMemo(() => new THREE.LatheGeometry(
    [[0, 0], [0.05, 0], [0.055, 0.004], [0.055, 0.1], [0.058, 0.105]]
      .map(([x, y]) => new THREE.Vector2(x, y)), 40), [])
  const liquid = useMemo(() => {
    const clear = new THREE.Color('#dceff8')
    const milky = new THREE.Color('#f3f0d8')
    return `#${clear.clone().lerp(milky, turbidity).getHexString()}`
  }, [turbidity])
  return (
    <group>
      <mesh geometry={glassGeo} castShadow>
        <GlassMaterial opacity={0.2} />
      </mesh>
      <mesh position={[0, 0.032, 0]}>
        <cylinderGeometry args={[0.051, 0.048, 0.056, 32]} />
        <LiquidMaterial color={liquid} opacity={0.35 + turbidity * 0.63} />
      </mesh>
    </group>
  )
}

/** Slow magnetic-stirrer style swirl on the liquid while running. */
function Swirler({ children, active }) {
  const ref = useRef()
  useFrame(({ clock: c }) => {
    if (ref.current) ref.current.rotation.y = active ? c.getElapsedTime() * 0.8 : 0
  })
  return <group ref={ref}>{children}</group>
}

export default function ClockScene() {
  const { clock, clockTick, clockStop } = useLabStore()

  const endpointMs = clockEndpointSec(clock.currentConc) * 1000

  useFrame((_, delta) => {
    if (clock.phase !== 'running') return
    clockTick(delta * 1000 * CLOCK_TIME_SCALE)
    if (clock.timerMs >= endpointMs) clockStop(endpointMs)
  })

  // Sulfur precipitate builds non-linearly: slow start, accelerating haze —
  // matches the classic "suddenly the cross is gone" experience.
  const progress = clock.phase === 'running'
    ? Math.min(1, clock.timerMs / endpointMs)
    : (clock.phase === 'complete' ? 1 : 0)
  const turbidity = Math.pow(progress, 1.8)
  const crossOpacity = Math.max(0.02, 1 - Math.pow(progress, 2.6))

  const BENCH_Y = -0.015

  return (
    <group>
      <LabRoom />
      <group position={[0, BENCH_Y, 0.05]}>
        <CrossPaper crossOpacity={crossOpacity} />
        <group position={[0, 0.007, 0]}>
          <Swirler active={clock.phase === 'running'}>
            <ReactionFlask turbidity={turbidity} />
          </Swirler>
        </group>
      </group>
      <LabeledBeaker
        position={[-0.28, BENCH_Y, -0.06]}
        label="Na₂S₂O₃"
        liquidColor="#d8ecf8"
      />
      <LabeledBeaker
        position={[0.26, BENCH_Y, -0.09]}
        label="HCl 2.00 mol dm⁻³"
        liquidColor="#e9f3ec"
        fill={0.4}
      />
    </group>
  )
}
