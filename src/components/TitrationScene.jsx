import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../store.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import {
  GlassMaterial, LiquidMaterial, ConicalFlaskGlass, PipetteLying,
  RetortStand, WhiteTile,
} from './scene/glassware.jsx'

/**
 * 50 cm³ Class B burette, origin at TOP of the graduated tube, tube along -y.
 * Graduated length 0.56 m (0 at top → 50 at bottom), stopcock + tip below.
 */
const TUBE_LEN = 0.56
const TUBE_R = 0.0065

function Burette({ reading }) {
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
        {/* PTFE key barrel */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.005, 0.026, 14]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        {/* key handle */}
        <mesh position={[0, 0, 0.017]}>
          <boxGeometry args={[0.026, 0.006, 0.008]} />
          <meshStandardMaterial color="#3d84c6" roughness={0.5} />
        </mesh>
      </group>
      {/* jet tip */}
      <mesh position={[0, -TUBE_LEN - 0.062, 0]}>
        <cylinderGeometry args={[0.0018, TUBE_R * 0.8, 0.052, 12]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
    </group>
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
  const { titration } = useLabStore()
  const isRunning = titration.phase === 'running'
  const flaskRef = useRef()
  useSwirl(flaskRef, isRunning)

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
        </group>
        {/* endpoint glow cue */}
        {titration.endpointReached && (
          <pointLight position={[0, 0.1, 0.08]} intensity={0.08} distance={0.22} color="#ff9ecb" />
        )}
      </group>
      {/* stand grips the burette directly above the flask */}
      <group position={[0, BENCH_Y, 0]}>
        <RetortStand height={1.05} clampY={BUR_TOP - 0.1 - BENCH_Y} rodOffset={[0.16, -0.11]} />
      </group>
      <group position={[0, BUR_TOP, 0]}>
        <Burette reading={titration.buretteReading} />
      </group>
      <Drop active={isRunning} tipY={tipY} surfaceY={BENCH_Y + 0.06} />
      {/* pipette resting on bench front-left */}
      <group position={[-0.42, BENCH_Y + 0.012, 0.32]} rotation={[0, 0.5, 0]}>
        <PipetteLying />
      </group>
    </group>
  )
}
