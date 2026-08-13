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

/**
 * Additive fresnel rim — the trick that makes fake glass read as real.
 * View-grazing edges glow faintly; face-on surfaces stay invisible.
 * Plain ShaderMaterial (no lights, no textures) so it costs almost nothing
 * on SwiftShader / weak mobile GPUs where `transmission` is banned.
 */
const RIM_SHADER = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uPower;
    uniform float uIntensity;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
      gl_FragColor = vec4(uColor, 1.0) * fres * uIntensity;
    }`,
}

export function FresnelRim({ geometry, color = '#cfe4ff', power = 2.5, intensity = 0.55, scale = 1.002 }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    ...RIM_SHADER,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [color, power, intensity])
  return <mesh geometry={geometry} material={material} scale={scale} />
}

function lathe(points, segments = 48) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments)
}

/** 250 cm³ ISO 1773-style Erlenmeyer, origin at base centre.
 * Reference envelope: H≈0.145 m, base OD≈0.085 m, neck ID≈0.034 m. */
export function ConicalFlaskGlass({ liquidColor = '#e8f4fb', liquidOpacity = 0.7, fill = 0.35, children }) {
  const glassGeo = useMemo(() => lathe([
    [0.0, 0.0], [0.028, 0.0], [0.0405, 0.003], [0.0425, 0.008],
    [0.0415, 0.028], [0.034, 0.058], [0.024, 0.088], [0.0175, 0.106],
    [0.017, 0.112], [0.017, 0.138], [0.0185, 0.141], [0.019, 0.145],
  ]), [])
  // liquid follows the cone: radius at height h
  const liquidGeo = useMemo(() => {
    const h = 0.008 + fill * 0.09
    const rAt = (y) => {
      if (y <= 0.010) return 0.040
      if (y >= 0.106) return 0.016
      // interpolate the wall slope
      const t = (y - 0.010) / 0.096
      return 0.040 * (1 - t) + 0.016 * t
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
      <FresnelRim geometry={glassGeo} />
      {/* Reinforced rolled lip and restrained enamel capacity markings. */}
      <mesh position={[0, 0.143, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.018, 0.0016, 8, 32]} />
        <GlassMaterial opacity={0.38} />
      </mesh>
      {[0.045, 0.064, 0.083].map((y, index) => {
        const t = (y - 0.010) / 0.096
        const wallR = 0.040 * (1 - t) + 0.016 * t
        return (
          <mesh key={y} position={[wallR + 0.0008, y, 0]} rotation={[0, 0, -0.1]}>
            <boxGeometry args={[0.006 + index * 0.001, 0.0008, 0.001]} />
            <meshStandardMaterial color="#e9eef3" roughness={0.7} />
          </mesh>
        )
      })}
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
  const liquidH = 0.003 + fill * (h - 0.01)
  return (
    <group>
      <mesh geometry={glassGeo} castShadow>
        <GlassMaterial />
      </mesh>
      <FresnelRim geometry={glassGeo} />
      {fill > 0 && (
        <>
          <mesh position={[0, 0.003 + (fill * (h - 0.01)) / 2, 0]}>
            <cylinderGeometry args={[r - 0.004, r - 0.004, fill * (h - 0.01), 28]} />
            <LiquidMaterial color={liquidColor} opacity={liquidOpacity} />
          </mesh>
          {/* glossy surface disc — sells the liquid at a glance */}
          <mesh position={[0, liquidH + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[r - 0.004, 28]} />
            <meshStandardMaterial
              color={liquidColor}
              transparent
              opacity={Math.min(liquidOpacity + 0.15, 0.95)}
              roughness={0.05}
              envMapIntensity={1.8}
            />
          </mesh>
        </>
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
export function RetortStand({
  height = 0.85,
  clampY = 0.62,
  rodOffset = [-0.1, -0.09],
  clampOpen = false,
  showClamp = true,
}) {
  const [rx, rz] = rodOffset
  return (
    <group>
      {/* cast-iron base — centred under the rod */}
      <mesh position={[rx, 0.008, rz]} castShadow>
        <boxGeometry args={[0.24, 0.016, 0.15]} />
        <meshStandardMaterial color="#333940" roughness={0.7} metalness={0.15} />
      </mesh>
      {/* rod at rear of base */}
      <mesh position={[rx, height / 2 + 0.016, rz]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, height, 16]} />
        <meshStandardMaterial color="#c3cad2" roughness={0.25} metalness={0.85} />
      </mesh>
      {showClamp && (
        <>
          {/* boss head */}
          <mesh position={[rx, clampY, rz]}>
            <boxGeometry args={[0.03, 0.035, 0.024]} />
            <meshStandardMaterial color="#4d5560" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[rx - 0.021, clampY, rz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.025, 16]} />
            <meshStandardMaterial color="#262d35" roughness={0.65} metalness={0.25} />
          </mesh>
          {/* clamp arm toward origin (burette axis at x=0,z=0) */}
          <mesh position={[rx / 2, clampY, rz / 2]} rotation={[Math.PI / 2, 0, Math.atan2(-rx, rz)]}>
            <cylinderGeometry args={[0.0045, 0.0045, Math.hypot(rx, rz) + 0.02, 12]} />
            <meshStandardMaterial color="#aab2bb" roughness={0.3} metalness={0.8} />
          </mesh>
          {/* jaws with dark protective sleeves, not bare metal on glass */}
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * (clampOpen ? 0.020 : 0.010), clampY, 0]}
              rotation={[0, 0, side * (clampOpen ? 0.24 : 0.05)]}
            >
              <mesh>
                <boxGeometry args={[0.008, 0.026, 0.022]} />
                <meshStandardMaterial color="#aeb7c1" roughness={0.38} metalness={0.55} />
              </mesh>
              <mesh position={[-side * 0.0046, 0, 0]}>
                <boxGeometry args={[0.002, 0.020, 0.017]} />
                <meshStandardMaterial color="#25303a" roughness={0.9} />
              </mesh>
            </group>
          ))}
        </>
      )}
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
