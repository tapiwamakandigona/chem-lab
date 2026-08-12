import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { IODINE_TIME_SCALE } from '../lib/iodineRate.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import {
  BeakerGlass,
  ConicalFlaskGlass,
  GlassMaterial,
  LiquidMaterial,
  RetortStand,
  WhiteTile,
} from './scene/glassware.jsx'
import { BlobShadow, ReagentBottle } from './scene/props.jsx'
import { clampSimDelta } from '../lib/simClock.js'

const APPEARANCE_COLORS = {
  brown: '#6f3512',
  amber: '#c27b16',
  'pale-yellow': '#f2ce55',
  'blue-black': '#11142f',
  colourless: '#d9edf8',
}

function Label({ children, position, size = 0.008, color = '#405463' }) {
  return (
    <Text
      position={position}
      font={LAB_FONT}
      fontSize={size}
      color={color}
      anchorX="center"
      outlineWidth={0.0005}
      outlineColor="#eef3f6"
    >
      {children}
    </Text>
  )
}

function Timer({ value, active }) {
  return (
    <group position={[-0.21, 0.033, 0.13]} rotation={[-0.17, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.105, 0.056, 0.022]} />
        <meshStandardMaterial color="#25313b" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.002, 0.012]}>
        <planeGeometry args={[0.086, 0.035]} />
        <meshBasicMaterial color={active ? '#071a1a' : '#111820'} />
      </mesh>
      <Text
        position={[0, 0.002, 0.013]}
        font={LAB_FONT}
        fontSize={0.016}
        color={active ? '#71f3c0' : '#71818d'}
        anchorX="center"
        anchorY="middle"
      >
        {value.toFixed(1)}
      </Text>
    </group>
  )
}

function Effervescence({ active }) {
  const refs = useRef([])
  const seeds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        x: ((index * 17) % 11 - 5) * 0.004,
        z: ((index * 23) % 9 - 4) * 0.004,
        phase: (index * 0.173) % 1,
        speed: 0.42 + (index % 5) * 0.09,
      })),
    [],
  )
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime()
    refs.current.forEach((bubble, index) => {
      if (!bubble) return
      const seed = seeds[index]
      const fraction = (now * seed.speed + seed.phase) % 1
      bubble.position.set(seed.x, 0.026 + fraction * 0.07, seed.z)
      bubble.material.opacity = active ? (1 - fraction) * 0.9 : 0
      bubble.scale.setScalar(0.7 + fraction * 1.15)
    })
  })
  return seeds.map((seed, index) => (
    <mesh
      key={index}
      ref={(node) => {
        refs.current[index] = node
      }}
      position={[seed.x, 0.03, seed.z]}
    >
      <sphereGeometry args={[0.0034, 8, 6]} />
      <meshBasicMaterial transparent opacity={0} color="#f3fbff" depthWrite={false} />
    </mesh>
  ))
}

function PreparationStage({ state }) {
  const active = ['setup', 'timing', 'quenched'].includes(state.phase)
  const effervescing = state.phase === 'quenched'
  const opacity = active ? 1 : 0.5
  return (
    <group position={[-0.20, -0.013, 0.035]}>
      <WhiteTile size={[0.25, 0.2]} />
      <BlobShadow r={0.09} opacity={0.25} />
      <group position={[-0.035, 0.007, 0]}>
        <ConicalFlaskGlass liquidColor="#713914" liquidOpacity={0.78} fill={0.45}>
          <Effervescence active={effervescing} />
        </ConicalFlaskGlass>
      </group>
      {effervescing && (
        <Text
          position={[-0.035, 0.205, 0.018]}
          font={LAB_FONT}
          fontSize={0.008}
          color="#167c9f"
          anchorX="center"
          outlineWidth={0.0006}
          outlineColor="#edf5f7"
        >
          CO₂ ↑ · ACID QUENCHED
        </Text>
      )}
      <group position={[0.09, 0.007, 0.025]} scale={0.8}>
        <BeakerGlass
          r={0.032}
          h={0.085}
          fill={state.phase === 'timing' ? 0.55 : effervescing ? 0.05 : 0.35}
          liquidColor="#d8edf8"
          liquidOpacity={0.65}
        />
      </group>
      <group position={[-0.13, 0.008, 0.04]} scale={0.72}>
        <ReagentBottle h={0.14} r={0.033} body="#835019" cap="#1a2229" opacity={opacity} />
      </group>
      <Label position={[-0.13, 0.062, 0.07]} size={0.0065}>I₂ MIXTURE</Label>
      <Label position={[0.09, 0.088, 0.055]} size={0.0065}>NaHCO₃</Label>
      <Label position={[-0.035, 0.172, 0]} color={active ? '#2d647f' : '#82919c'}>
        1 · TIME + QUENCH
      </Label>
    </group>
  )
}

function Burette({ reading, open, onDown, onUp }) {
  const fill = Math.max(0, (50 - reading) / 50)
  const liquidLength = 0.42 * fill
  const top = 0.02 + liquidLength / 2
  return (
    <group>
      <mesh position={[0, -0.21, 0]}>
        <cylinderGeometry args={[0.0105, 0.0105, 0.44, 18, 1, true]} />
        <GlassMaterial opacity={0.22} />
      </mesh>
      {fill > 0 && (
        <mesh position={[0, -0.42 + top, 0]}>
          <cylinderGeometry args={[0.0078, 0.0078, liquidLength, 14]} />
          <LiquidMaterial color="#d8edf8" opacity={0.68} />
        </mesh>
      )}
      {Array.from({ length: 11 }, (_, index) => (
        <group key={index} position={[0, -index * 0.042, 0]}>
          <mesh position={[0.012, 0, 0]}>
            <boxGeometry args={[index % 2 ? 0.009 : 0.014, 0.0007, 0.0008]} />
            <meshBasicMaterial color="#425969" />
          </mesh>
          {index % 2 === 0 && (
            <Text
              position={[0.023, 0, 0]}
              font={LAB_FONT}
              fontSize={0.006}
              color="#506776"
              anchorX="left"
              anchorY="middle"
            >
              {index * 5}
            </Text>
          )}
        </group>
      ))}
      <mesh position={[0, -0.445, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.026, 16]} />
        <meshStandardMaterial color="#b9c3cb" emissive="#151d24" emissiveIntensity={0.08} roughness={0.35} metalness={0.25} />
      </mesh>
      <group
        position={[0, -0.445, 0]}
        rotation={[0, open ? 0 : Math.PI / 2, 0]}
        onPointerDown={(event) => {
          event.stopPropagation()
          event.target.setPointerCapture?.(event.pointerId)
          onDown()
        }}
        onPointerUp={(event) => {
          event.stopPropagation()
          event.target.releasePointerCapture?.(event.pointerId)
          onUp()
        }}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      >
        <mesh>
          <boxGeometry args={[0.052, 0.008, 0.012]} />
          <meshStandardMaterial color={open ? '#38bdf8' : '#dbb24d'} roughness={0.48} />
        </mesh>
      </group>
      <mesh position={[0, -0.49, 0]}>
        <cylinderGeometry args={[0.006, 0.0015, 0.07, 12]} />
        <GlassMaterial opacity={0.32} />
      </mesh>
    </group>
  )
}

function TitrationStage({ state }) {
  const { iodineDispense, iodineSetTapOpen } = useLabStore()
  const flowAccumulator = useRef(0)
  const active = ['prepared', 'titrating', 'endpoint'].includes(state.phase)
  useFrame((_, delta) => {
    const current = useLabStore.getState().iodineRate
    if (!current.tapOpen || current.phase !== 'titrating') {
      flowAccumulator.current = 0
      return
    }
    flowAccumulator.current += clampSimDelta(delta) * 1.8
    if (flowAccumulator.current >= 0.05) {
      const amount = Math.floor(flowAccumulator.current / 0.05) * 0.05
      flowAccumulator.current -= amount
      iodineDispense(amount)
    }
  })
  const color = APPEARANCE_COLORS[state.appearance] ?? APPEARANCE_COLORS.brown
  const colourless = state.appearance === 'colourless'
  return (
    <group position={[0.18, -0.013, -0.035]}>
      <WhiteTile size={[0.2, 0.19]} />
      <BlobShadow r={0.085} opacity={0.28} />
      <ConicalFlaskGlass
        liquidColor={color}
        liquidOpacity={colourless ? 0.38 : state.appearance === 'blue-black' ? 0.88 : 0.74}
        fill={0.4}
      />
      <group position={[0, 0.66, 0]}>
        <Burette
          reading={state.buretteReading}
          open={state.tapOpen}
          onDown={() => iodineSetTapOpen(true)}
          onUp={() => iodineSetTapOpen(false)}
        />
      </group>
      <RetortStand height={0.74} clampY={0.57} rodOffset={[0.11, -0.08]} />
      {state.tapOpen && state.phase === 'titrating' && (
        <mesh position={[0, 0.124, 0]}>
          <cylinderGeometry args={[0.0015, 0.0022, 0.10, 8]} />
          <meshBasicMaterial color="#cceaf8" transparent opacity={0.75} />
        </mesh>
      )}
      <group position={[0.11, 0.008, 0.11]} scale={0.65}>
        <ReagentBottle h={0.13} r={0.032} body="#254463" cap="#d9e3ea" opacity={active ? 1 : 0.55} />
      </group>
      <Label position={[0.11, 0.058, 0.105]} size={0.0065}>STARCH</Label>
      <Label position={[0, 0.76, 0]} color={active ? '#2d647f' : '#82919c'}>
        2 · TITRATE I₂
      </Label>
    </group>
  )
}

export default function IodineRateScene() {
  const { iodineRate, iodineTick } = useLabStore()
  useFrame((_, delta) => {
    if (iodineRate.phase === 'timing') {
      // Fast-forward the uneventful first 72 s, then drop to real time so
      // hitting the 80 s quench is a genuine timing action with a fair,
      // device-independent reaction window.
      iodineTick(clampSimDelta(delta) * (iodineRate.timeSec < 72 ? IODINE_TIME_SCALE : 1))
    }
  })
  return (
    <group>
      <LabRoom />
      <PreparationStage state={iodineRate} />
      <Timer value={iodineRate.timeSec} active={iodineRate.phase === 'timing'} />
      <TitrationStage state={iodineRate} />
    </group>
  )
}
