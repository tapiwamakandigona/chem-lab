import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useLabStore } from '../store.js'
import { CHROMA_UNKNOWNS, DYES, chromaReadings } from '../lib/chroma.js'
import { LAB_FONT } from '../lib/labFont.js'
import LabRoom from './scene/LabRoom.jsx'
import { GlassMaterial, LiquidMaterial } from './scene/glassware.jsx'
import { BlobShadow, LabNotebook } from './scene/props.jsx'

// Development takes ~14 s real — slow enough to watch spots separate,
// fast enough for the classroom. Front rises with an eased profile
// (capillary flow decelerates as the paper wets).
const DEVELOP_SEC = 14

// Tank + paper dimensions (m). Paper hangs from a glass rod across the
// tank mouth; baseline sits just above the solvent pool.
const TANK_R = 0.055
const TANK_H = 0.15
const SOLVENT_H = 0.014
const PAPER_W = 0.036
const PAPER_H = 0.135
const PAPER_BOTTOM = 0.004        // paper dips into the solvent
const BASELINE_Y = PAPER_BOTTOM + 0.022
const FRONT_MAX_Y = BASELINE_Y + 0.095 // baseline -> final solvent front
const PAPER_Z = 0.0               // paper plane through tank centre
const SPOT_R = 0.0038

function easeOut(t) {
  return 1 - Math.pow(1 - t, 2.2)
}

/** Filter-paper strip with baseline, migrating dye spots and wet front. */
function PaperStrip({ unknown, progress, phase }) {
  const eased = phase === 'complete' ? 1 : easeOut(progress)
  const frontY = BASELINE_Y + (FRONT_MAX_Y - BASELINE_Y) * eased
  const wetH = Math.max(0.0001, frontY - PAPER_BOTTOM + 0.004)
  const readings = chromaReadings(unknown)
  return (
    <group>
      {/* dry paper */}
      <mesh position={[0, PAPER_BOTTOM + PAPER_H / 2, PAPER_Z]}>
        <boxGeometry args={[PAPER_W, PAPER_H, 0.0008]} />
        <meshStandardMaterial color="#f6f3ea" roughness={0.95} />
      </mesh>
      {/* wet region up to the solvent front (slightly darker, both faces) */}
      <mesh position={[0, PAPER_BOTTOM + wetH / 2 - 0.002, PAPER_Z + 0.0006]}>
        <planeGeometry args={[PAPER_W * 0.99, wetH]} />
        <meshStandardMaterial color="#e4dfd0" roughness={0.95} transparent opacity={0.9} />
      </mesh>
      {/* solvent-front pencil-thin line */}
      {eased > 0.01 && (
        <mesh position={[0, frontY, PAPER_Z + 0.0012]}>
          <planeGeometry args={[PAPER_W * 0.96, 0.0009]} />
          <meshBasicMaterial color="#b7b0a0" />
        </mesh>
      )}
      {/* baseline (pencil, insoluble) */}
      <mesh position={[0, BASELINE_Y, PAPER_Z + 0.0012]}>
        <planeGeometry args={[PAPER_W * 0.9, 0.0007]} />
        <meshBasicMaterial color="#8f8878" />
      </mesh>
      {/* origin spot fades as the dyes leave the baseline */}
      <mesh position={[0, BASELINE_Y, PAPER_Z + 0.0013]}>
        <circleGeometry args={[SPOT_R, 20]} />
        <meshBasicMaterial color="#6b5a4a" transparent opacity={Math.max(0, 0.85 - eased * 1.4)} />
      </mesh>
      {/* migrating dye spots: y = baseline + Rf * front-travel */}
      {readings.map((r, i) => {
        const rf = r.dist / 8.0
        const y = BASELINE_Y + rf * (frontY - BASELINE_Y)
        const show = eased > 0.06
        // spots elongate slightly while running, settle round when done
        const stretch = phase === 'developing' ? 1.35 : 1
        return (
          show && (
            <mesh key={r.dye} position={[0, y, PAPER_Z + 0.0014 + i * 0.0001]} scale={[1, stretch, 1]}>
              <circleGeometry args={[SPOT_R, 20]} />
              <meshBasicMaterial color={r.color} transparent opacity={Math.min(0.95, eased * 1.6)} />
            </mesh>
          )
        )
      })}
    </group>
  )
}

/** Ruler standing beside the tank once the run is complete. */
function Ruler({ visible }) {
  if (!visible) return null
  // 1 "cm" on the ruler = the paper's real front travel / 8 cm, so the
  // solvent front lines up with the 8 mark exactly.
  const CM = 0.095 / 8
  const marks = []
  for (let cm = 0; cm <= 8; cm++) marks.push(cm)
  return (
    <group position={[0.085, 0, 0.02]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, BASELINE_Y + 0.048, 0]}>
        <boxGeometry args={[0.016, 0.12, 0.0015]} />
        <meshStandardMaterial color="#e9d9a8" roughness={0.8} />
      </mesh>
      {marks.map((cm) => (
        <group key={cm} position={[0, BASELINE_Y + cm * CM, 0.001]}>
          <mesh position={[-0.004, 0, 0]}>
            <planeGeometry args={[0.006, 0.0005]} />
            <meshBasicMaterial color="#5a4f38" />
          </mesh>
          <Text
            font={LAB_FONT}
            position={[0.003, 0, 0]}
            fontSize={0.0038}
            color="#5a4f38"
            anchorX="left"
            anchorY="middle"
          >
            {String(cm)}
          </Text>
        </group>
      ))}
    </group>
  )
}

export default function ChromaScene() {
  const { chroma, chromaTick } = useLabStore()

  useFrame((_, delta) => {
    if (chroma.phase !== 'developing') return
    chromaTick(delta / DEVELOP_SEC)
  })

  const BENCH_Y = -0.015
  const u = CHROMA_UNKNOWNS[chroma.unknown]

  return (
    <group>
      <LabRoom />
      <group position={[-0.02, BENCH_Y, 0]}>
        {/* chromatography tank */}
        <mesh position={[0, TANK_H / 2, 0]}>
          <cylinderGeometry args={[TANK_R, TANK_R * 0.97, TANK_H, 28, 1, true]} />
          <GlassMaterial opacity={0.14} />
        </mesh>
        <mesh position={[0, 0.0015, 0]}>
          <cylinderGeometry args={[TANK_R * 0.97, TANK_R * 0.97, 0.003, 28]} />
          <GlassMaterial opacity={0.22} />
        </mesh>
        {/* solvent pool */}
        <mesh position={[0, SOLVENT_H / 2 + 0.002, 0]}>
          <cylinderGeometry args={[TANK_R * 0.93, TANK_R * 0.9, SOLVENT_H, 24]} />
          <LiquidMaterial color="#dcebf5" opacity={0.5} />
        </mesh>
        {/* watch-glass lid (stops solvent evaporating) */}
        <mesh position={[0, TANK_H + 0.004, 0]} rotation={[0, 0, 0.02]}>
          <cylinderGeometry args={[TANK_R * 1.12, TANK_R * 1.12, 0.0025, 28]} />
          <GlassMaterial opacity={0.2} />
        </mesh>
        {/* glass rod carrying the paper */}
        <mesh position={[0, TANK_H - 0.006, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.003, 0.003, TANK_R * 2.3, 12]} />
          <GlassMaterial opacity={0.3} />
        </mesh>
        <PaperStrip unknown={chroma.unknown} progress={chroma.progress} phase={chroma.phase} />
        <BlobShadow r={TANK_R * 1.15} />
        {/* unknown vial on the bench */}
        <group position={[-0.115, 0, 0.05]}>
          <mesh position={[0, 0.016, 0]}>
            <cylinderGeometry args={[0.009, 0.009, 0.032, 16]} />
            <GlassMaterial opacity={0.2} />
          </mesh>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.0078, 0.0075, 0.016, 14]} />
            <LiquidMaterial color={DYES[u.dyes[0]].color} opacity={0.85} />
          </mesh>
          <Text
            font={LAB_FONT}
            position={[0, -0.008, 0.012]}
            fontSize={0.0085}
            color="#3b4855"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.0008}
            outlineColor="#f5f7fa"
          >
            {u.label}
          </Text>
          <BlobShadow r={0.012} />
        </group>
        <Ruler visible={chroma.phase === 'complete'} />
      </group>
      <group position={[0.16, BENCH_Y, 0.14]}>
        <LabNotebook />
      </group>
    </group>
  )
}
