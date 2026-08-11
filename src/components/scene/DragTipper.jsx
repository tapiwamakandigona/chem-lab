import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Imperative escape hatch: OrbitControls must not fight the drag. Kept
// outside the component so the lint immutability rule sees a plain helper.
function setControls(getThree, on) {
  const c = getThree().controls
  if (c) c.enabled = on
}

const DEFAULT_STREAM = {
  dx: 0.095, topDy: -0.002, bottomDy: 0.1,
  r1: 0.0032, r2: 0.0022, color: '#d8ecf8', opacity: 0.75, roughness: 0.1,
}
const DEFAULT_RING = { r1: 0.075, r2: 0.09, y: 0.012 }
const DEFAULT_GRAB = { r: 0.055, h: 0.14, y: 0.05 }

/**
 * Generic drag-to-tip interaction. Pick the child object up (pointer drag on
 * a horizontal plane `lift` above its home), drop it within `dropRadius` of
 * `target` (x/z) to play an anchored tilt + falling stream and fire onPour
 * once; drop anywhere else and it springs home. Animation state lives in
 * refs (no re-renders at 60 fps); only stream/ring visibility uses state.
 *
 * Used by the clock reagent beaker and the enthalpy weighing boat — keep
 * behaviour changes here so every experiment's pour feels identical.
 */
export default function DragTipper({
  home, target, enabled, onPour, onModeChange,
  dropRadius = 0.11, tilt = -1.25, lift = 0.05,
  anchorOffset = [-0.085, 0.19, 0],
  stream = DEFAULT_STREAM, ring = DEFAULT_RING, grab = DEFAULT_GRAB,
  clampX = [-0.45, 0.45], clampZ = [-0.3, 0.35],
  tiltDelay = 0.25, tiltDur = 0.4, pourHold = 1.5,
  children,
}) {
  const grp = useRef()
  const anim = useRef({ mode: 'idle', t: 0, fired: false })
  const [dragging, setDragging] = useState(false)
  const [streamOn, setStreamOn] = useState(false)
  const three = useThree((s) => s.get)
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(home[1] + lift)),
    [home, lift],
  )
  const hit = useMemo(() => new THREE.Vector3(), [])
  // Drop test happens on a plane at target height: with a lifted drag plane
  // a position-based test fails from parallax (the object that LOOKS over
  // the target is offset toward the camera in x/z). The pointer ray at
  // target height matches what the user sees.
  const dropPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), -target[1]),
    [target],
  )
  const dropHit = useMemo(() => new THREE.Vector3(), [])
  const anchor = useMemo(
    () => new THREE.Vector3(target[0] + anchorOffset[0], target[1] + anchorOffset[1], target[2] + anchorOffset[2]),
    [target, anchorOffset],
  )
  const homeV = useMemo(() => new THREE.Vector3(...home), [home])

  const setMode = (mode) => {
    anim.current = { mode, t: 0, fired: anim.current.fired }
    onModeChange?.(mode)
  }

  const down = (e) => {
    if (!enabled || anim.current.mode === 'pour') return
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    setControls(three, false)
    anim.current.fired = false
    setMode('drag')
    setDragging(true)
  }
  const move = (e) => {
    if (anim.current.mode !== 'drag') return
    e.ray.intersectPlane(plane, hit)
    if (!hit) return
    grp.current.position.set(
      THREE.MathUtils.clamp(hit.x, clampX[0], clampX[1]),
      home[1] + lift,
      THREE.MathUtils.clamp(hit.z, clampZ[0], clampZ[1]),
    )
  }
  const up = (e) => {
    if (anim.current.mode !== 'drag') return
    e.target.releasePointerCapture(e.pointerId)
    setControls(three, true)
    setDragging(false)
    const p = e.ray.intersectPlane(dropPlane, dropHit) || grp.current.position
    const near = Math.hypot(p.x - target[0], p.z - target[2]) < dropRadius
    setMode(near && enabled ? 'pour' : 'return')
  }

  useFrame((_, delta) => {
    const a = anim.current
    const g = grp.current
    if (!g || a.mode === 'idle' || a.mode === 'drag') return
    a.t += delta
    if (a.mode === 'pour') {
      g.position.lerp(anchor, Math.min(1, delta * 8))
      const k = THREE.MathUtils.clamp((a.t - tiltDelay) / tiltDur, 0, 1)
      g.rotation.z = tilt * k
      if (k >= 1 && !a.fired) {
        a.fired = true
        setStreamOn(true)
        onPour()
      }
      if (a.t > pourHold) {
        setStreamOn(false)
        setMode('return')
      }
    } else if (a.mode === 'return') {
      g.position.lerp(homeV, Math.min(1, delta * 6))
      g.rotation.z *= Math.max(0, 1 - delta * 8)
      if (g.position.distanceTo(homeV) < 0.004) {
        g.position.copy(homeV)
        g.rotation.z = 0
        setMode('idle')
      }
    }
  })

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
        <mesh position={[0, grab.y, 0]} visible={false}>
          <cylinderGeometry args={[grab.r, grab.r, grab.h, 12]} />
        </mesh>
        {children}
      </group>
      {/* falling stream: tipped lip -> target */}
      {streamOn && (
        <mesh
          position={[anchor.x + stream.dx, (anchor.y + stream.topDy + target[1] + stream.bottomDy) / 2, anchor.z]}
          scale={[1, anchor.y + stream.topDy - target[1] - stream.bottomDy, 1]}
        >
          <cylinderGeometry args={[stream.r1, stream.r2, 1, 8]} />
          <meshStandardMaterial color={stream.color} transparent opacity={stream.opacity} roughness={stream.roughness} />
        </mesh>
      )}
      {/* drop-zone ring while dragging */}
      {dragging && (
        <mesh position={[target[0], target[1] + ring.y, target[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring.r1, ring.r2, 40]} />
          <meshBasicMaterial color="#39a8f0" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}
    </>
  )
}
