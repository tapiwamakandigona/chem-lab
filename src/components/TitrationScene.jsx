import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import { setControls } from '../lib/controls.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import {
  GlassMaterial, LiquidMaterial, ConicalFlaskGlass,
  RetortStand, WhiteTile,
} from './scene/glassware.jsx'
import { BlobShadow } from './scene/props.jsx'
import { clampSimDelta } from '../lib/simClock.js'

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
const SETUP_PARTS = ['stand', 'clamp', 'burette', 'tile', 'flask']

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
    // Half-millilitre marks remain legible in the whole-bench view; the
    // dedicated meniscus close-up renders the actual 0.1 mL subdivisions.
    for (let v = 0; v <= 50; v += 0.5) {
      out.push({
        v,
        y: -(v / 50) * TUBE_LEN,
        major: v % 5 === 0,
        mid: v % 1 === 0,
        label: v % 10 === 0,
      })
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
      {/* ISO-style strengthened bead at the open top. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_R, 0.0015, 8, 28]} />
        <GlassMaterial opacity={0.36} />
      </mesh>
      {/* titrant column */}
      <group ref={liquidRef} position={[0, -TUBE_LEN / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[TUBE_R - 0.0015, TUBE_R - 0.0015, TUBE_LEN, 16]} />
          <LiquidMaterial color="#d6ecfa" opacity={0.85} />
        </mesh>
      </group>
      {/* graduations — thin boxes, cheap and crisp */}
      {marks.map(({ v, y, major, mid, label }) => (
        <group key={v} position={[0, y, 0]}>
          <mesh position={[TUBE_R + (major ? 0.004 : mid ? 0.003 : 0.002), 0, 0]}>
            <boxGeometry args={[major ? 0.008 : mid ? 0.006 : 0.004, 0.0007, 0.0007]} />
            <meshBasicMaterial color="#3b4855" />
          </mesh>
          {label && (
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
  const ringRef = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (!active) {
      ref.current.visible = false
      if (ringRef.current) ringRef.current.visible = false
      return
    }
    ref.current.visible = true
    const t = (clock.getElapsedTime() * 2.2) % 1
    ref.current.position.y = tipY - t * (tipY - surfaceY)
    ref.current.scale.setScalar(t < 0.08 ? t / 0.08 : 1)
    // splash ripple: expanding, fading ring right after the drop lands
    if (ringRef.current) {
      const r = (t + 0.25) % 1 // ring life trails the drop's landing
      const splashing = r < 0.35
      ringRef.current.visible = splashing
      if (splashing) {
        const life = r / 0.35
        ringRef.current.scale.setScalar(0.4 + life * 1.6)
        ringRef.current.material.opacity = 0.5 * (1 - life)
      }
    }
  })
  return (
    <>
      <mesh ref={ref} visible={false}>
        <sphereGeometry args={[0.0035, 10, 8]} />
        <meshStandardMaterial color="#cfe6f7" transparent opacity={0.9} roughness={0.1} />
      </mesh>
      <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, surfaceY + 0.001, 0]}>
        <ringGeometry args={[0.006, 0.008, 24]} />
        <meshBasicMaterial color="#dcecf7" transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </>
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
  const {
    titration,
    titrationDispense,
    titrationSetupMode,
    titrationSetup,
    placeTitrationSetupPart,
    titrationTapOpen,
    setTitrationTapOpen,
  } = useLabStore()
  const setupReady = !titrationSetupMode || SETUP_PARTS.every((part) => titrationSetup[part])
  const isRunning = titration.phase === 'running'
  const flaskRef = useRef()
  useSwirl(flaskRef, isRunning)

  // --- stopcock press-and-hold dispensing ---
  const tapRef = useRef(false)
  const accRef = useRef(0)
  const canDispense = setupReady && !titration.endpointReached && titration.buretteReading < 50
  useFrame((_, dt) => {
    if (!tapRef.current) return
    const t = useLabStore.getState().titration
    if (t.endpointReached || t.buretteReading >= 50) return
    // Accumulate smooth flow, commit to the store in 0.05 cm3 quanta so the
    // reading always lands on a real graduation.
    accRef.current += clampSimDelta(dt) * TAP_RATE
    if (accRef.current >= 0.05) {
      const step = Math.floor(accRef.current / 0.05) * 0.05
      accRef.current -= step
      titrationDispense(step)
    }
  })
  useEffect(() => {
    tapRef.current = titrationTapOpen && canDispense
    if (!tapRef.current) accRef.current = 0
  }, [titrationTapOpen, canDispense])
  const tapDown = () => {
    tapRef.current = true
    accRef.current = 0
    setTitrationTapOpen(true)
  }
  const tapUp = () => {
    tapRef.current = false
    setTitrationTapOpen(false)
  }

  // A closed stopcock must NOT drip. A drop falls only for ~1 sim-second
  // after titrant actually left the tip (reading changed), as the tip drains.
  // Sim-time, not wall-time: on a slow renderer a single frame can exceed a
  // wall window, skipping the drain state entirely (CI 2026-08-12).
  const [dropActive, setDropActive] = useState(false)
  const prevReadingRef = useRef(titration.buretteReading)
  const sinceFlowRef = useRef(10)
  const dropActiveRef = useRef(false)
  useFrame((_, dt) => {
    const t = useLabStore.getState().titration
    sinceFlowRef.current += clampSimDelta(dt)
    if (t.buretteReading !== prevReadingRef.current) {
      // Only an increasing reading means titrant left the tip. Resetting the
      // burette (a decrease to 0.00) must not manufacture a drain animation.
      if (t.buretteReading > prevReadingRef.current) sinceFlowRef.current = 0
      prevReadingRef.current = t.buretteReading
    }
    const act = !tapRef.current && sinceFlowRef.current < 1.0
    if (act !== dropActiveRef.current) {
      dropActiveRef.current = act
      setDropActive(act)
      useLabStore.getState().setDripping(act)
    }
  })
  useEffect(() => () => {
    // The indicator lives in the global store for the UI/gate marker. Never
    // leak an active drain state when this scene unmounts (Menu or practical
    // switch) before its one simulated second has elapsed.
    useLabStore.getState().setDripping(false)
    useLabStore.getState().setTitrationTapOpen(false)
  }, [])

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
  // ISO/manufacturer proportions: a long 50 mL tube, but its jet still sits
  // only ~35 mm above the 145 mm flask neck — not a floating half-flask gap.
  const BUR_TOP = 0.82
  const tipY = BUR_TOP - TUBE_LEN - 0.088
  const liquidSurfaceY = BENCH_Y + 0.035

  return (
    <group>
      <LabRoom />
      {(!titrationSetupMode || titrationSetup.tile) && (
        <group position={[FLASK_X, BENCH_Y, 0]}>
          <WhiteTile size={[0.16, 0.16]} />
          {(!titrationSetupMode || titrationSetup.flask) && (
            <>
              <group ref={flaskRef} position={[0, 0.007, 0]}>
                <ConicalFlaskGlass
                  liquidColor={liquidColor}
                  liquidOpacity={liquidOpacity}
                  fill={0.22}
                />
                <EndpointSwirl active={titration.endpointReached} />
              </group>
              <BlobShadow r={0.085} opacity={0.3} y={0.009} />
            </>
          )}
          {/* endpoint glow cue */}
          {titration.endpointReached && (
            <pointLight position={[0, 0.1, 0.08]} intensity={0.08} distance={0.22} color="#ff9ecb" />
          )}
        </group>
      )}
      {/* stand grips the burette directly above the flask */}
      {(!titrationSetupMode || titrationSetup.stand) && (
        <group position={[0, BENCH_Y, 0]}>
          <RetortStand
            height={0.92}
            clampY={BUR_TOP - 0.1 - BENCH_Y}
            rodOffset={[0.16, -0.19]}
            showClamp={!titrationSetupMode || titrationSetup.clamp}
            clampOpen={titrationSetupMode && !titrationSetup.burette}
          />
          <group position={[0.16, 0, -0.19]}>
            <BlobShadow r={0.16} opacity={0.28} />
          </group>
        </group>
      )}
      {(!titrationSetupMode || titrationSetup.burette) && (
        <group position={[0, BUR_TOP, 0]}>
          <Burette
            reading={titration.buretteReading}
            open={titrationTapOpen && canDispense}
            onTapDown={tapDown}
            onTapUp={tapUp}
          />
        </group>
      )}
      <TapStream open={titrationTapOpen && canDispense} tipY={tipY} surfaceY={liquidSurfaceY} />
      <Drop active={setupReady && dropActive} tipY={tipY} surfaceY={liquidSurfaceY} />
      {titrationSetupMode && !setupReady && (
        <SetupBench
          setup={titrationSetup}
          onPlace={placeTitrationSetupPart}
          benchY={BENCH_Y}
          buretteTop={BUR_TOP}
        />
      )}
    </group>
  )
}

function SetupBench({ setup, onPlace, benchY, buretteTop }) {
  const next = SETUP_PARTS.find((part) => !setup[part])
  const targets = {
    stand: [0.30, benchY + 0.08, 0.25],
    clamp: [0.26, benchY + 0.16, 0.22],
    burette: [0.34, benchY + 0.34, 0.2],
    tile: [-0.30, benchY + 0.012, 0.24],
    flask: [-0.34, benchY + 0.07, 0.24],
  }
  return (
    <group>
      {next && (
        <Text
          font={LAB_FONT}
          position={[0, 0.15, -0.34]}
          fontSize={0.026}
          color="#1e293b"
          anchorX="center"
        >
          {`PLACE ${next.toUpperCase()}`}
        </Text>
      )}
      {next && (
        <SetupPart
          part={next}
          start={targets[next]}
          destination={next === 'burette' ? [0, buretteTop - 0.28, 0] : [0, benchY + 0.04, 0]}
          onPlaced={() => onPlace(next)}
        />
      )}
    </group>
  )
}

function SetupPart({ part, start, destination, onPlaced }) {
  const ref = useRef()
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [snapping, setSnapping] = useState(false)
  const dragPoint = useRef(new THREE.Vector3(...start))
  const home = useMemo(() => new THREE.Vector3(...start), [start])
  const destinationPoint = useMemo(() => new THREE.Vector3(...destination), [destination])
  const three = useThree((state) => state.get)
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -start[1]), [start])
  const reducedMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    []
  )

  useFrame((_, dt) => {
    if (!ref.current) return
    const target = dragging ? dragPoint.current : snapping ? destinationPoint : home
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 18)
    ref.current.position.lerp(target, k)
    ref.current.rotation.y += (hovered ? 0.35 : 0) * dt
    if (snapping && ref.current.position.distanceTo(destinationPoint) < 0.006) onPlaced()
  })

  const move = (event) => {
    if (!dragging) return
    event.stopPropagation()
    const hit = new THREE.Vector3()
    if (event.ray.intersectPlane(plane, hit)) dragPoint.current.copy(hit)
  }
  const release = (event) => {
    event.stopPropagation()
    setDragging(false)
    setControls(three, true)
    const hit = new THREE.Vector3()
    event.ray.intersectPlane(plane, hit)
    const horizontal = hit.clone().setY(destination[1]).distanceTo(destinationPoint)
    if (horizontal < 0.18) setSnapping(true)
  }

  return (
    <group
      ref={ref}
      position={start}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'grab' }}
      onPointerOut={() => { if (!dragging) setHovered(false); document.body.style.cursor = 'auto' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        event.target.setPointerCapture?.(event.pointerId)
        setDragging(true)
        setControls(three, false)
        document.body.style.cursor = 'grabbing'
      }}
      onPointerMove={move}
      onPointerUp={release}
      onPointerCancel={() => { setDragging(false); setControls(three, true) }}
    >
      <mesh>
        {part === 'burette'
          ? <cylinderGeometry args={[0.008, 0.008, 0.42, 16]} />
          : part === 'flask'
            ? <coneGeometry args={[0.05, 0.11, 28]} />
            : part === 'tile'
              ? <boxGeometry args={[0.14, 0.012, 0.14]} />
              : part === 'clamp'
                ? <boxGeometry args={[0.15, 0.035, 0.035]} />
                : <boxGeometry args={[0.18, 0.05, 0.12]} />}
        <meshStandardMaterial
          color={part === 'tile' ? '#f8fafc' : hovered ? '#38bdf8' : '#64748b'}
          roughness={0.45}
          metalness={part === 'stand' || part === 'clamp' ? 0.35 : 0.05}
          emissive={hovered ? '#0c4a6e' : '#000000'}
        />
      </mesh>
    </group>
  )
}
