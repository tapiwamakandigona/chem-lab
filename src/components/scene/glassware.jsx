import { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Shared glassware for all experiments.
 *
 * Glass material rule (iter-2 lesson): NO `transmission` — it renders as
 * opaque grey under SwiftShader/weak GPUs and is the most expensive material
 * three.js has. Transparent + low opacity + envMap highlights reads as glass
 * everywhere, including a $60 Android phone.
 */
export function GlassMaterial({ opacity = 0.22, color = '#dcecf7' }) {
  return (
    <meshPhysicalMaterial
      color={color}
      transparent
      opacity={opacity}
      roughness={0.06}
      metalness={0}
      clearcoat={1}
      clearcoatRoughness={0.08}
      envMapIntensity={1.6}
      side={THREE.DoubleSide}
      depthWrite={false}
    />
  )
}

export function LiquidMaterial({ color = '#bfe0f5', opacity = 0.75 }) {
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={opacity}
      roughness={0.15}
      metalness={0}
      envMapIntensity={0.8}
    />
  )
}

function lathe(points, segments = 48) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments)
}

/** 250 cm³ Erlenmeyer (conical) flask, origin at base centre. H=0.145. */
export function ConicalFlaskGlass({ liquidColor = '#e8f4fb', liquidOpacity = 0.7, fill = 0.35, children }) {
  const glassGeo = useMemo(() => lathe([
    [0.0, 0.0], [0.030, 0.0], [0.046, 0.004], [0.050, 0.010],
    [0.048, 0.030], [0.038, 0.060], [0.026, 0.088], [0.0175, 0.106],
    [0.0155, 0.112], [0.0155, 0.138], [0.0175, 0.141], [0.0185, 0.145],
  ]), [])
  // liquid follows the cone: radius at height h
  const liquidGeo = useMemo(() => {
    const h = 0.008 + fill * 0.09
    const rAt = (y) => {
      if (y <= 0.010) return 0.046
      if (y >= 0.106) return 0.016
      // interpolate the wall slope
      const t = (y - 0.010) / 0.096
      return 0.046 * (1 - t) + 0.016 * t
    }
    const pts = [[0, 0.004]]
    for (let i = 0; i <= 6; i++) {
      const y = 0.004 + (h - 0.004) * (i / 6)
      pts.push([rAt(y) - 0.003, y])
    }
    pts.push([0, h])
    return lathe(pts, 40)
  }, [fill])
  return (
    <group>
      <mesh geometry={glassGeo} castShadow>
        <GlassMaterial />
      </mesh>
      <mesh geometry={liquidGeo}>
        <LiquidMaterial color={liquidColor} opacity={liquidOpacity} />
      </mesh>
      {children}
    </group>
  )
}

/** Griffin beaker, origin at base centre. */
export function BeakerGlass({ r = 0.032, h = 0.085, liquidColor = '#cfe8f7', fill = 0.55, liquidOpacity = 0.65 }) {
  const glassGeo = useMemo(() => lathe([
    [0, 0], [r - 0.002, 0], [r, 0.003], [r, h - 0.006], [r + 0.003, h],
  ], 36), [r, h])
  return (
    <group>
      <mesh geometry={glassGeo} castShadow>
        <GlassMaterial />
      </mesh>
      {fill > 0 && (
        <mesh position={[0, 0.003 + (fill * (h - 0.01)) / 2, 0]}>
          <cylinderGeometry args={[r - 0.004, r - 0.004, fill * (h - 0.01), 28]} />
          <LiquidMaterial color={liquidColor} opacity={liquidOpacity} />
        </mesh>
      )}
    </group>
  )
}

/** Volumetric pipette lying on the bench (decorative). len along +x. */
export function PipetteLying({ len = 0.42 }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      {/* stem */}
      <mesh>
        <cylinderGeometry args={[0.0045, 0.0045, len, 16]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
      {/* bulb */}
      <mesh scale={[1, 2.6, 1]}>
        <sphereGeometry args={[0.011, 20, 14]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
      {/* tip */}
      <mesh position={[0, -len / 2 - 0.025, 0]}>
        <cylinderGeometry args={[0.0045, 0.0015, 0.05, 12]} />
        <GlassMaterial opacity={0.3} />
      </mesh>
    </group>
  )
}

/** Retort stand: heavy base + rod + clamp jaws gripping at clampY. */
export function RetortStand({ height = 0.85, clampY = 0.62, rodOffset = [-0.1, -0.09] }) {
  const [rx, rz] = rodOffset
  return (
    <group>
      {/* cast-iron base — centred under the rod */}
      <mesh position={[rx, 0.008, rz]} castShadow>
        <boxGeometry args={[0.24, 0.016, 0.15]} />
        <meshStandardMaterial color="#3a3f46" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* rod at rear of base */}
      <mesh position={[rx, height / 2 + 0.016, rz]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, height, 16]} />
        <meshStandardMaterial color="#c3cad2" roughness={0.25} metalness={0.85} />
      </mesh>
      {/* boss head */}
      <mesh position={[rx, clampY, rz]}>
        <boxGeometry args={[0.03, 0.035, 0.024]} />
        <meshStandardMaterial color="#4d5560" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* clamp arm toward origin (burette axis at x=0,z=0) */}
      <mesh position={[rx / 2, clampY, rz / 2]} rotation={[Math.PI / 2, 0, Math.atan2(-rx, rz)]}>
        <cylinderGeometry args={[0.0045, 0.0045, Math.hypot(rx, rz) + 0.02, 12]} />
        <meshStandardMaterial color="#aab2bb" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* jaws */}
      {[-0.011, 0.011].map((dx, i) => (
        <mesh key={i} position={[dx, clampY, 0]}>
          <boxGeometry args={[0.006, 0.02, 0.018]} />
          <meshStandardMaterial color="#e8b64c" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** White drop tile. */
export function WhiteTile({ size = [0.15, 0.15] }) {
  return (
    <mesh position={[0, 0.0035, 0]} receiveShadow>
      <boxGeometry args={[size[0], 0.007, size[1]]} />
      <meshStandardMaterial color="#f5f7f8" roughness={0.35} />
    </mesh>
  )
}
