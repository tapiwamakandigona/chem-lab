import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { GlassMaterial, LiquidMaterial } from './glassware.jsx'
import { LAB_FONT } from '../../lib/labFont.js'
import { makeEpoxyTexture } from './surfaces.js'

/**
 * Set-dressing props + grounding helpers (F5 look pass).
 * Everything here is primitives + one CanvasTexture — SwiftShader-safe,
 * no extra render passes, no network.
 */

/** Soft radial contact shadow — works at every quality level (real
 *  shadow-mapping only runs on HIGH), so apparatus never floats. */
export function BlobShadow({ r = 0.09, opacity = 0.32, y = 0.0008 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64)
    grad.addColorStop(0, 'rgba(10,14,18,1)')
    grad.addColorStop(0.55, 'rgba(10,14,18,0.45)')
    grad.addColorStop(1, 'rgba(10,14,18,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
    const t = new THREE.CanvasTexture(c)
    return t
  }, [])
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
      <planeGeometry args={[r * 2, r * 2]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

/** Reagent bottle: body + shoulder + cap + paper label. */
export function ReagentBottle({
  h = 0.16,
  r = 0.035,
  body = '#8a5a1f',
  cap = '#111418',
  label = true,
  labelText = '',
  opacity = 1,
}) {
  return (
    <group>
      <mesh position={[0, h * 0.42, 0]} castShadow>
        <cylinderGeometry args={[r, r, h * 0.84, 18]} />
        <meshStandardMaterial color={body} roughness={0.25} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[0, h * 0.87, 0]}>
        <cylinderGeometry args={[r * 0.45, r * 0.95, h * 0.12, 18]} />
        <meshStandardMaterial color={body} roughness={0.25} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      <mesh position={[0, h * 0.97, 0]}>
        <cylinderGeometry args={[r * 0.46, r * 0.46, h * 0.1, 14]} />
        <meshStandardMaterial color={cap} roughness={0.5} />
      </mesh>
      {label && (
        <group position={[0, h * 0.42, r * 0.99]}>
          <mesh>
            <planeGeometry args={[r * 1.55, h * 0.44]} />
            <meshStandardMaterial color="#f2f0e8" roughness={0.9} />
          </mesh>
          {labelText && (
            <Text
              font={LAB_FONT}
              position={[0, 0, 0.001]}
              fontSize={Math.min(r * 0.34, h * 0.07)}
              color="#27313a"
              anchorX="center"
              anchorY="middle"
            >
              {labelText}
            </Text>
          )}
        </group>
      )}
    </group>
  )
}

const SHELF_BOTTLES = [
  { body: '#7a4d15', h: 0.17, labelText: 'HCl' },
  { body: '#cfe3ee', h: 0.13, opacity: 0.55, labelText: 'NaOH' },
  { body: '#274a68', h: 0.19, labelText: 'CuSO₄' },
  { body: '#7a4d15', h: 0.14, labelText: 'HNO₃' },
  { body: '#4d6e3a', h: 0.16, labelText: 'Fe²⁺' },
  { body: '#cfe3ee', h: 0.18, opacity: 0.55, labelText: 'NH₃' },
  { body: '#7a4d15', h: 0.2, labelText: 'I₂' },
  { body: '#8b3a3a', h: 0.13, labelText: 'KMnO₄' },
  { body: '#cfe3ee', h: 0.15, opacity: 0.55, labelText: 'AgNO₃' },
  { body: '#274a68', h: 0.14, labelText: 'CoCl₂' },
]

/** Real shelves are lumpy: bottles cluster in pairs, gaps vary, nothing lines
 *  up in depth. Deterministic offsets (not Math.random) keep renders stable
 *  for screenshot comparison. Units: fraction of the even-spacing slot (dx)
 *  and metres (dz). */
const SHELF_JITTER = [
  { dx: 0.0, dz: 0.012 }, { dx: 0.22, dz: -0.018 }, { dx: -0.1, dz: 0.02 },
  { dx: 0.3, dz: 0.004 }, { dx: -0.26, dz: -0.012 }, { dx: 0.08, dz: 0.022 },
  { dx: -0.18, dz: -0.02 }, { dx: 0.26, dz: 0.014 }, { dx: -0.06, dz: -0.006 },
  { dx: 0.12, dz: 0.018 },
]

/** Wall shelf with a row of reagent bottles. width along x. */
/** Per-bottle placement math shared by the merged meshes and the labels.
 *  Deterministic — must stay byte-identical to the old per-bottle layout. */
function shelfBottlePlacements(width) {
  const slot = (width - 0.36) / (SHELF_BOTTLES.length - 1)
  return SHELF_BOTTLES.map((b, i) => {
    const j = SHELF_JITTER[i % SHELF_JITTER.length]
    return {
      ...b,
      r: 0.032 + ((i * 13) % 3) * 0.004,
      x: -width / 2 + 0.18 + (i + j.dx * 0.45) * slot,
      z: 0.02 + j.dz,
      rot: ((i * 37) % 7) * 0.22 - 0.55,
    }
  })
}

export function ReagentShelf({ width = 2.6, y = 0, z = -2.45 }) {
  const bottles = useMemo(() => shelfBottlePlacements(width), [width])
  // The shelf is pure static decor drawn in every scene (except when a tight
  // camera frustum-culls it). Merging 10 bottles x 4 meshes into 3 static
  // meshes (opaque parts / translucent bottles / label papers) drops ~37 draw
  // calls per wide-camera scene. Troika label Texts stay as-is.
  const merged = useMemo(() => {
    const opaque = []
    const clear = []
    const labels = []
    const mat = new THREE.Matrix4()
    const quat = new THREE.Quaternion()
    const pos = new THREE.Vector3()
    const one = new THREE.Vector3(1, 1, 1)
    const addPart = (geo, color, b, px, py, pz, list) => {
      quat.setFromEuler(new THREE.Euler(0, b.rot, 0))
      mat.compose(pos.set(b.x, 0.018, b.z), quat, one)
      geo.translate(px, py, pz)
      geo.applyMatrix4(mat)
      geo.deleteAttribute('uv')
      if (color) {
        const n = geo.attributes.position.count
        const c = new THREE.Color(color)
        const arr = new Float32Array(n * 3)
        for (let k = 0; k < n; k += 1) {
          arr[k * 3] = c.r
          arr[k * 3 + 1] = c.g
          arr[k * 3 + 2] = c.b
        }
        geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
      }
      list.push(geo)
    }
    bottles.forEach((b) => {
      const bodyList = b.opacity !== undefined && b.opacity < 1 ? clear : opaque
      addPart(new THREE.CylinderGeometry(b.r, b.r, b.h * 0.84, 18), b.body, b, 0, b.h * 0.42, 0, bodyList)
      addPart(new THREE.CylinderGeometry(b.r * 0.45, b.r * 0.95, b.h * 0.12, 18), b.body, b, 0, b.h * 0.87, 0, bodyList)
      addPart(new THREE.CylinderGeometry(b.r * 0.46, b.r * 0.46, b.h * 0.1, 14), '#111418', b, 0, b.h * 0.97, 0, opaque)
      addPart(new THREE.PlaneGeometry(b.r * 1.55, b.h * 0.44), null, b, 0, b.h * 0.42, b.r * 0.99, labels)
    })
    return {
      opaque: mergeGeometries(opaque),
      clear: mergeGeometries(clear),
      labels: mergeGeometries(labels),
    }
  }, [bottles])
  return (
    <group position={[0, y, z]}>
      <mesh>
        <boxGeometry args={[width, 0.035, 0.24]} />
        <meshStandardMaterial color="#a8896b" roughness={0.6} />
      </mesh>
      {/* brackets — kept between bottle slots so a dark bracket never sits
          directly beneath a dark bottle and reads as one object through the
          board (screenshot tell, iter-56) */}
      {[-width / 2 + 0.42, width / 2 - 0.58].map((x, i) => (
        <mesh key={i} position={[x, -0.07, -0.06]}>
          <boxGeometry args={[0.025, 0.11, 0.1]} />
          <meshStandardMaterial color="#8b949e" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      <mesh geometry={merged.opaque} castShadow>
        <meshStandardMaterial vertexColors roughness={0.3} />
      </mesh>
      <mesh geometry={merged.clear} castShadow>
        <meshStandardMaterial vertexColors transparent opacity={0.55} roughness={0.25} />
      </mesh>
      <mesh geometry={merged.labels}>
        <meshStandardMaterial color="#f2f0e8" roughness={0.9} />
      </mesh>
      {bottles.map((b, i) =>
        b.labelText ? (
          <group key={i} position={[b.x, 0.018, b.z]} rotation={[0, b.rot, 0]}>
            <Text
              font={LAB_FONT}
              position={[0, b.h * 0.42, b.r * 0.99 + 0.001]}
              fontSize={Math.min(b.r * 0.34, b.h * 0.07)}
              color="#27313a"
              anchorX="center"
              anchorY="middle"
            >
              {b.labelText}
            </Text>
          </group>
        ) : null
      )}
    </group>
  )
}

/** Upper wall cabinets — simple band with door seams + handles. */
export function WallCabinets({ width = 3.2, y = 1.9, z = -2.56 }) {
  const doors = 4
  return (
    <group position={[0, y, z]}>
      <mesh>
        <boxGeometry args={[width, 0.85, 0.08]} />
        <meshStandardMaterial color="#dfe5eb" roughness={0.7} />
      </mesh>
      {Array.from({ length: doors }, (_, i) => {
        const w = width / doors
        const x = -width / 2 + w / 2 + i * w
        return (
          <group key={i}>
            <mesh position={[x, 0, 0.045]}>
              <boxGeometry args={[w - 0.03, 0.79, 0.012]} />
              <meshStandardMaterial color="#eef2f6" roughness={0.6} />
            </mesh>
            <mesh position={[x + w / 2 - 0.07, -0.3, 0.058]}>
              <boxGeometry args={[0.06, 0.012, 0.012]} />
              <meshStandardMaterial color="#8b949e" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** Back counter under the shelf — anchors the wall, adds depth layer. */
export function BackCounter({ width = 4.2, z = -2.3 }) {
  // Own seed + base so the counter never repeats the bench-top pattern.
  const top = useMemo(() => makeEpoxyTexture({ seed: 91, base: '#2b2e33', w: 1024, h: 256, statKey: 'counter' }), [])
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width, 0.05, 0.55]} />
        <meshStandardMaterial map={top} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <boxGeometry args={[width - 0.06, 0.84, 0.5]} />
        <meshStandardMaterial color="#c8cfd6" roughness={0.75} />
      </mesh>
      {/* drawer seams */}
      {[-1.4, -0.5, 0.5, 1.4].map((x, i) => (
        <mesh key={i} position={[x, -0.38, 0.253]}>
          <boxGeometry args={[0.78, 0.8, 0.01]} />
          <meshStandardMaterial color="#d4dae0" roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Squeeze wash bottle (polyethylene) with angled delivery tube. */
export function WashBottle() {
  return (
    <group>
      <mesh position={[0, 0.055, 0]} castShadow>
        <cylinderGeometry args={[0.028, 0.03, 0.11, 18]} />
        <meshStandardMaterial color="#e8f0f4" transparent opacity={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.026, 0.028, 0.07, 16]} />
        <LiquidMaterial color="#dceef8" opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.122, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.025, 12]} />
        <meshStandardMaterial color="#c23b3b" roughness={0.5} />
      </mesh>
      <mesh position={[0.02, 0.15, 0]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.075, 8]} />
        <meshStandardMaterial color="#c23b3b" roughness={0.5} />
      </mesh>
      <BlobShadow r={0.045} opacity={0.25} />
    </group>
  )
}

/** Lab notebook + pen on the bench. */
export function LabNotebook() {
  return (
    <group>
      <mesh position={[0, 0.004, 0]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[0.19, 0.008, 0.25]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
      </mesh>
      <mesh position={[-0.098, 0.004, 0]} rotation={[0, 0.12, 0]}>
        <boxGeometry args={[0.012, 0.01, 0.25]} />
        <meshStandardMaterial color="#31536b" roughness={0.7} />
      </mesh>
      <mesh position={[0.06, 0.01, 0.05]} rotation={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.14, 8]} />
        <meshStandardMaterial color="#1d5f8a" roughness={0.4} />
      </mesh>
      <BlobShadow r={0.13} opacity={0.18} />
    </group>
  )
}

/** Spare beaker with blue solution — colour accent (Labster trick). */
export function AccentBeaker({ color = '#6db3d9' }) {
  return (
    <group>
      <mesh position={[0, 0.045, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.09, 20, 1, true]} />
        <GlassMaterial opacity={0.22} />
      </mesh>
      <mesh position={[0, 0.028, 0]}>
        <cylinderGeometry args={[0.027, 0.027, 0.05, 18]} />
        <LiquidMaterial color={color} opacity={0.8} />
      </mesh>
      <BlobShadow r={0.045} opacity={0.25} />
    </group>
  )
}

/** Ceiling light strips — bright emissive bars that read as a lit lab. */
export function CeilingLights() {
  return (
    <group>
      {[-1.1, 0.4, 1.9].map((z, i) => (
        <mesh key={i} position={[0, 2.75, z]}>
          <boxGeometry args={[2.6, 0.02, 0.16]} />
          <meshStandardMaterial color="#ffffff" emissive="#f4f7fb" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  )
}
