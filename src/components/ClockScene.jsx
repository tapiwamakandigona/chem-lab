import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore, CLOCK_TIME_SCALE, clockEndpointSec } from '../store.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { BeakerGlass, GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow } from './scene/props.jsx'

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

// Imperative escape hatch: OrbitControls must not fight the drag. Kept
// outside the component so the lint immutability rule sees a plain helper.
function setControls(getThree, on) {
  const c = getThree().controls
  if (c) c.enabled = on
}

/**
 * Drag-to-pour beaker. Pick it up (pointer drag on a bench-height plane),
 * drop it near the reaction beaker to tip and pour — same action as the
 * "Mix & start" button. Animation state lives in refs (no re-renders at
 * 60 fps); only stream/ring visibility uses React state.
 */
function PourableBeaker({ home, target, label, liquidColor, enabled, onPour }) {
  const grp = useRef()
  const anim = useRef({ mode: 'idle', t: 0, fired: false })
  const [dragging, setDragging] = useState(false)
  const [streamOn, setStreamOn] = useState(false)
  const three = useThree((s) => s.get)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(home[1] + 0.05)), [home])
  const hit = useMemo(() => new THREE.Vector3(), [])

  // pour anchor: left of target, above rim; tilt clockwise pours toward +x
  const anchor = useMemo(() => new THREE.Vector3(target[0] - 0.085, target[1] + 0.19, target[2]), [target])
  const homeV = useMemo(() => new THREE.Vector3(...home), [home])

  const down = (e) => {
    if (!enabled || anim.current.mode === 'pour') return
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    setControls(three, false)
    anim.current.mode = 'drag'
    setDragging(true)
  }
  const move = (e) => {
    if (anim.current.mode !== 'drag') return
    e.ray.intersectPlane(plane, hit)
    if (!hit) return
    grp.current.position.set(
      THREE.MathUtils.clamp(hit.x, -0.45, 0.45),
      home[1] + 0.05,
      THREE.MathUtils.clamp(hit.z, -0.3, 0.35),
    )
  }
  const up = (e) => {
    if (anim.current.mode !== 'drag') return
    e.target.releasePointerCapture(e.pointerId)
    setControls(three, true)
    setDragging(false)
    const p = grp.current.position
    const near = Math.hypot(p.x - target[0], p.z - target[2]) < 0.11
    anim.current = { mode: near && enabled ? 'pour' : 'return', t: 0, fired: false }
  }

  useFrame((_, delta) => {
    const a = anim.current
    const g = grp.current
    if (!g || a.mode === 'idle' || a.mode === 'drag') return
    a.t += delta
    if (a.mode === 'pour') {
      g.position.lerp(anchor, Math.min(1, delta * 8))
      const tilt = THREE.MathUtils.clamp((a.t - 0.25) / 0.4, 0, 1)
      g.rotation.z = -1.25 * tilt
      if (tilt >= 1 && !a.fired) {
        a.fired = true
        setStreamOn(true)
        onPour()
      }
      if (a.t > 1.5) {
        setStreamOn(false)
        a.mode = 'return'
        a.t = 0
      }
    } else if (a.mode === 'return') {
      g.position.lerp(homeV, Math.min(1, delta * 6))
      g.rotation.z *= Math.max(0, 1 - delta * 8)
      if (g.position.distanceTo(homeV) < 0.004) {
        g.position.copy(homeV)
        g.rotation.z = 0
        a.mode = 'idle'
      }
    }
  })

  const fill = enabled ? 0.55 : 0.18
  return (
    <>
      <group
        ref={grp}
        position={home}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerOver={() => enabled && (document.body.style.cursor = 'grab')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {/* generous invisible grab handle for touch */}
        <mesh position={[0, 0.05, 0]} visible={false}>
          <cylinderGeometry args={[0.055, 0.055, 0.14, 12]} />
        </mesh>
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
      {/* pour stream: beaker lip -> target rim */}
      {streamOn && (
        <mesh
          // lip of a base-pivoted beaker tilted -1.25 rad sits ~(+0.095, -0.002)
          // from the anchor; stream falls from there to the target rim
          position={[anchor.x + 0.095, (anchor.y - 0.002 + target[1] + 0.1) / 2, anchor.z]}
          scale={[1, anchor.y - 0.002 - target[1] - 0.1, 1]}
        >
          <cylinderGeometry args={[0.0032, 0.0022, 1, 8]} />
          <meshStandardMaterial color={liquidColor} transparent opacity={0.75} roughness={0.1} />
        </mesh>
      )}
      {/* drop-zone ring while dragging */}
      {dragging && (
        <mesh position={[target[0], target[1] + 0.012, target[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.075, 0.09, 40]} />
          <meshBasicMaterial color="#39a8f0" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
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
  const { clock, clockTick, clockStop, clockStart } = useLabStore()

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
        {/* beaker shadow ON the tile, tight so it never pokes past the edge */}
        <BlobShadow r={0.048} opacity={0.22} y={0.0076} />
        <group position={[0, 0.007, 0]}>
          <Swirler active={clock.phase === 'running'}>
            <ReactionFlask turbidity={turbidity} />
          </Swirler>
        </group>
      </group>
      <PourableBeaker
        home={[-0.28, BENCH_Y, -0.06]}
        target={[0, BENCH_Y + 0.007, 0.05]}
        label="Na₂S₂O₃"
        liquidColor="#d8ecf8"
        enabled={clock.phase === 'setup'}
        onPour={clockStart}
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
