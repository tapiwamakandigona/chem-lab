import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import { setControls } from '../lib/controls.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import {
  GlassMaterial, LiquidMaterial, ConicalFlaskGlass, PipetteLying,
  RetortStand, WhiteTile,
} from './scene/glassware.jsx'
import { BlobShadow } from './scene/props.jsx'

/**
 * 50 cm³ Class B burette, origin at TOP of the graduated tube, tube along -y.
 * Graduated length 0.56 m (0 at top → 50 at bottom), stopcock + tip below.
 */
const TUBE_LEN = 0.56
const TUBE_R = 0.0065

/** Continuous dispense rate while the stopcock is held open (cm3/s). Fast
 *  enough to feel like a real tap; overshoot near the endpoint is possible —
 *  that is the point. The UI buttons remain for dropwise control. */
const TAP_RATE = 1.4

function Burette({ reading, open, onTapDown, onTapUp }) {
  const liquidRef = useRef()
  const level = 1 - reading / 50 // 1 = full (reading 0.00)

  useFrame(() => {
    if (!liquidRef.current) return
    const l = Math.max(0.002, level)
    liquidRef.current.scale.y = l
    liquidRef.current.position.y = -TUBE_LEN + (l * TUBE_LEN) / 2
  })

  const marks = useMemo(() => {
    const out = []
    for (let v = 0; v <= 50; v += 1) {
      out.push({ v, y: -(v / 50) * TUBE_LEN, major: v % 10 === 0, mid: v % 5 === 0 })
    }
    return out
  }, [])

  return (
    <group>
      {/* glass tube */}
      <mesh position={[0, -TUBE_LEN / 2, 0]}>
        <cylinderGeometry args={[TUBE_R, TUBE_R, TUBE_LEN, 24, 1, true]} />
        <GlassMaterial opacity={0.25} />
      </mesh>
      {/* titrant column */}
      <group ref={liquidRef} position={[0, -TUBE_LEN / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[TUBE_R - 0.0015, TUBE_R - 0.0015, TUBE_LEN, 16]} />
          <LiquidMaterial color="#d6ecfa" opacity={0.85} />
        </mesh>
      </group>
      {/* graduations — thin boxes, cheap and crisp */}
      {marks.map(({ v, y, major, mid }) => (
        <group key={v} position={[0, y, 0]}>
          <mesh position={[TUBE_R + (major ? 0.004 : mid ? 0.003 : 0.002), 0, 0]}>
            <boxGeometry args={[major ? 0.008 : mid ? 0.006 : 0.004, 0.0007, 0.0007]} />
            <meshBasicMaterial color="#3b4855" />
          </mesh>
          {major && (
            <Text
              font={LAB_FONT}
              position={[TUBE_R + 0.012, 0, 0]}
              fontSize={0.011}
              color="#26313c"
              anchorX="left"
              anchorY="middle"
            >
              {String(v)}
            </Text>
          )}
        </group>
      ))}
      {/* stopcock body */}
      <group position={[0, -TUBE_LEN - 0.018, 0]}>
        <mesh>
          <cylinderGeometry args={[TUBE_R, TUBE_R * 0.85, 0.036, 16]} />
          <GlassMaterial opacity={0.3} />
        </mesh>
        <StopcockKey open={open} onTapDown={onTapDown} onTapUp={onTapUp} />
      </group>
      {/* jet tip */}
      <mesh position={[0, -TUBE_LEN - 0.062, 0]}>
        <cylinderGeometry args={[0.0018, TUBE_R * 0.8, 0.052, 12]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
    </group>
  )
}

/** PTFE key + handle. Press and hold to open the tap (handle swings 90deg,
 *  titrant streams); release to close. Generous invisible grab cylinder so
 *  the ~10 px handle is actually clickable (and probe-able). */
function StopcockKey({ open, onTapDown, onTapUp }) {
  const keyRef = useRef()
  const [hover, setHover] = useState(false)
  const three = useThree((s) => s.get)

  useFrame((_, dt) => {
    if (!keyRef.current) return
    const targetRot = open ? -Math.PI / 2 : 0
    const k = 1 - Math.exp(-dt * 14)
    keyRef.current.rotation.z += (targetRot - keyRef.current.rotation.z) * k
  })

  return (
    <group>
      <group ref={keyRef}>
        {/* PTFE key barrel */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.005, 0.026, 14]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* key handle */}
        <mesh position={[0, 0, 0.017]}>
          <boxGeometry args={[0.026, 0.006, 0.008]} />
          <meshStandardMaterial
            color={hover || open ? '#63a9e8' : '#3d84c6'}
            emissive={hover && !open ? '#1d4b78' : '#000000'}
            roughness={0.5}
          />
        </mesh>
      </group>
      {/* invisible grab volume */}
      <mesh
        visible={false}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = 'auto' }}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.target.setPointerCapture?.(e.pointerId)
          setControls(three, false)
          onTapDown()
        }}
        onPointerUp={(e) => {
          e.target.releasePointerCapture?.(e.pointerId)
          setControls(three, true)
          onTapUp()
        }}
        onPointerCancel={() => { setControls(three, true); onTapUp() }}
      >
        <sphereGeometry args={[0.042, 12, 10]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}

/** Continuous titrant stream while the stopcock is open. */
function TapStream({ open, tipY, surfaceY }) {
  const len = tipY - surfaceY
  if (!open) return null
  return (
    <mesh position={[0, surfaceY + len / 2, 0]}>
      <cylinderGeometry args={[0.0022, 0.0015, len, 10]} />
      <meshStandardMaterial color="#cfe6f7" transparent opacity={0.8} roughness={0.1} />
    </mesh>
  )
}

function Drop({ active, tipY, surfaceY }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (!active) { ref.current.visible = false; return }
    ref.current.visible = true
    const t = (clock.getElapsedTime() * 2.2) % 1
    ref.current.position.y = tipY - t * (tipY - surfaceY)
    ref.current.scale.setScalar(t < 0.08 ? t / 0.08 : 1)
  })
  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[0.0035, 10, 8]} />
      <meshStandardMaterial color="#cfe6f7" transparent opacity={0.9} roughness={0.1} />
    </mesh>
  )
}

/** Endpoint colour-swirl: pink wisps spiral through the liquid while the
 *  bulk colour lerps in over ~1.6 s — the classic permanent-pink moment. */
function EndpointSwirl({ active }) {
  const ref = useRef()
  const startRef = useRef(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (!active) { startRef.current = null; ref.current.visible = false; return }
    if (startRef.current === null) startRef.current = clock.getElapsedTime()
    const t = clock.getElapsedTime() - startRef.current
    const life = Math.min(t / 1.6, 1)
    ref.current.visible = life < 1
    ref.current.rotation.y = t * 2.4
    ref.current.children.forEach((m, i) => {
      m.material.opacity = 0.55 * (1 - life)
      m.position.y = 0.02 + 0.05 * life + i * 0.008
      m.scale.setScalar(0.6 + life * 0.9 + i * 0.12)
    })
  })
  return (
    <group ref={ref} visible={false}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, (i * Math.PI * 2) / 3]} position={[0, 0.02, 0]}>
          <torusGeometry args={[0.018, 0.005, 8, 24, Math.PI * 1.2]} />
          <meshBasicMaterial color="#f26bb0" transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Swirl: gentle rotation of the flask liquid while titrating. */
function useSwirl(groupRef, active) {
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()
    groupRef.current.rotation.z = active ? Math.sin(t * 6) * 0.02 : 0
    groupRef.current.rotation.x = active ? Math.cos(t * 5.3) * 0.015 : 0
  })
}

export default function TitrationScene() {
  const { titration, titrationDispense } = useLabStore()
  const isRunning = titration.phase === 'running'
  const flaskRef = useRef()
  useSwirl(flaskRef, isRunning)

  // --- stopcock press-and-hold dispensing ---
  const [tapOpen, setTapOpen] = useState(false)
  const tapRef = useRef(false)
  const accRef = useRef(0)
  const canDispense = !titration.endpointReached && titration.buretteReading < 50
  useFrame((_, dt) => {
    if (!tapRef.current) return
    const t = useLabStore.getState().titration
    if (t.endpointReached || t.buretteReading >= 50) return
    // Accumulate smooth flow, commit to the store in 0.05 cm3 quanta so the
    // reading always lands on a real graduation.
    accRef.current += Math.min(dt, 0.1) * TAP_RATE
    if (accRef.current >= 0.05) {
      const step = Math.floor(accRef.current / 0.05) * 0.05
      accRef.current -= step
      titrationDispense(step)
    }
  })
  const tapDown = () => { tapRef.current = true; accRef.current = 0; setTapOpen(true) }
  const tapUp = () => { tapRef.current = false; setTapOpen(false) }

  // A closed stopcock must NOT drip. A drop falls only for ~1 s after
  // titrant actually left the tip (reading changed), as the tip drains.
  const [dropActive, setDropActive] = useState(false)
  const prevReadingRef = useRef(titration.buretteReading)
  const lastFlowRef = useRef(-10)
  const dropActiveRef = useRef(false)
  useFrame(({ clock }) => {
    const t = useLabStore.getState().titration
    const now = clock.getElapsedTime()
    if (t.buretteReading !== prevReadingRef.current) {
      prevReadingRef.current = t.buretteReading
      lastFlowRef.current = now
    }
    const act = !tapRef.current && now - lastFlowRef.current < 1.0
    if (act !== dropActiveRef.current) {
      dropActiveRef.current = act
      setDropActive(act)
      useLabStore.getState().setDripping(act)
    }
  })

  const [r, g, b, a] = titration.indicatorColor
  // Near-white "colourless" state must render as water, not milk.
  const isColourless = r > 0.9 && g > 0.9 && b > 0.9
  const liquidColor = useMemo(() => {
    if (isColourless) return '#d9edf8'
    const c = new THREE.Color(r, g, b)
    return `#${c.getHexString()}`
  }, [r, g, b, isColourless])
  const liquidOpacity = isColourless ? 0.4 : Math.max(0.55, a)

  // Layout: flask sits on tile at bench top (y=0 => bench surface ~ -0.015)
  const BENCH_Y = -0.015
  const FLASK_X = 0
  // burette: tip ~. Frame: flask height .145, tip 0.05 above neck
  const BUR_TOP = 0.95
  const tipY = BUR_TOP - TUBE_LEN - 0.088

  return (
    <group>
      <LabRoom />
      <group position={[FLASK_X, BENCH_Y, 0]}>
        <WhiteTile size={[0.16, 0.16]} />
        <group ref={flaskRef} position={[0, 0.007, 0]}>
          <ConicalFlaskGlass
            liquidColor={liquidColor}
            liquidOpacity={liquidOpacity}
            fill={0.4}
          />
          <EndpointSwirl active={titration.endpointReached} />
        </group>
        <BlobShadow r={0.085} opacity={0.3} y={0.009} />
        {/* endpoint glow cue */}
        {titration.endpointReached && (
          <pointLight position={[0, 0.1, 0.08]} intensity={0.08} distance={0.22} color="#ff9ecb" />
        )}
      </group>
      {/* stand grips the burette directly above the flask */}
      <group position={[0, BENCH_Y, 0]}>
        <RetortStand height={1.05} clampY={BUR_TOP - 0.1 - BENCH_Y} rodOffset={[0.16, -0.11]} />
        <group position={[0.16, 0, -0.11]}>
          <BlobShadow r={0.16} opacity={0.28} />
        </group>
      </group>
      <group position={[0, BUR_TOP, 0]}>
        <Burette
          reading={titration.buretteReading}
          open={tapOpen && canDispense}
          onTapDown={tapDown}
          onTapUp={tapUp}
        />
      </group>
      <TapStream open={tapOpen && canDispense} tipY={tipY} surfaceY={BENCH_Y + 0.06} />
      <Drop active={dropActive} tipY={tipY} surfaceY={BENCH_Y + 0.06} />
      {/* pipette resting on bench front-left */}
      <group position={[-0.42, BENCH_Y + 0.012, 0.32]} rotation={[0, 0.5, 0]}>
        <PipetteLying />
      </group>
    </group>
  )
}
