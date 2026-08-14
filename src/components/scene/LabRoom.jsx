import { useMemo } from 'react'
import { RoundedBox } from '@react-three/drei'
import { ReagentShelf, WallCabinets, BackCounter, CeilingLights, WashBottle, LabNotebook, AccentBeaker, BlobShadow } from './props.jsx'
import { makeEpoxyTexture, makeEpoxyRoughness, makeVinylFloorTexture, makePlasterTexture } from './surfaces.js'

/**
 * Shared lab room: epoxy-top bench, steel frame, floor, back wall.
 * Bright modern teaching-lab look (Labster reference) — the dark UI panels
 * sit on top of a light viewport, like a 3D editor.
 */
export default function LabRoom() {
  // Seeded procedural surfaces (F5 rule: no large surface is one flat colour).
  // Created once per mount; ClampToEdge single-cover means no tiling period.
  const tex = useMemo(() => ({
    bench: makeEpoxyTexture({ seed: 7, statKey: 'bench' }),
    benchRough: makeEpoxyRoughness({ seed: 8 }),
    floor: makeVinylFloorTexture({ seed: 21, statKey: 'floor' }),
    backWall: makePlasterTexture({ seed: 40, base: '#e3e9f0', statKey: 'backWall' }),
    sideL: makePlasterTexture({ seed: 41, base: '#dde4ec' }),
    sideR: makePlasterTexture({ seed: 42, base: '#dde4ec' }),
    front: makePlasterTexture({ seed: 43, base: '#e0e6ee' }),
  }), [])
  return (
    <group>
      {/* Bench top — black epoxy resin, the classic chem bench */}
      <group position={[0, -0.05, 0]}>
        <RoundedBox args={[3.4, 0.07, 1.5]} radius={0.015} receiveShadow>
          <meshStandardMaterial map={tex.bench} roughnessMap={tex.benchRough} roughness={1} metalness={0.05} />
        </RoundedBox>
        {/* Light maple apron under the top */}
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[3.3, 0.12, 1.42]} />
          <meshStandardMaterial color="#b9987a" roughness={0.65} />
        </mesh>
        {/* Steel legs */}
        {[[-1.55, -0.45, -0.62], [1.55, -0.45, -0.62], [-1.55, -0.45, 0.62], [1.55, -0.45, 0.62]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <boxGeometry args={[0.05, 0.62, 0.05]} />
            <meshStandardMaterial color="#9aa2ab" roughness={0.35} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Floor */}
      <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial map={tex.floor} roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.6, -2.6]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial map={tex.backWall} roughness={1} />
      </mesh>
      {/* Room envelope — side/front walls + ceiling. The orbit envelope
          (maxDistance 3.4) stays inside these, so no reachable camera angle
          can see past the room. fog + matching scene background catch the rest. */}
      <mesh position={[-5.2, 1.55, 1.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5.2]} />
        <meshStandardMaterial map={tex.sideL} roughness={1} />
      </mesh>
      <mesh position={[5.2, 1.55, 1.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5.2]} />
        <meshStandardMaterial map={tex.sideR} roughness={1} />
      </mesh>
      <mesh position={[0, 1.6, 5.4]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial map={tex.front} roughness={1} />
      </mesh>
      <mesh position={[0, 4.1, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 12]} />
        <meshStandardMaterial color="#eef1f5" roughness={1} />
      </mesh>
      {/* Skirting stripe, kept below bench line so it never crosses apparatus */}
      <mesh position={[0, -0.55, -2.59]}>
        <planeGeometry args={[14, 0.35]} />
        <meshStandardMaterial color="#3d7a99" roughness={1} />
      </mesh>

      {/* Ground the furniture: soft floor shadows under bench + back counter,
          so neither reads as a slab floating over the floor from high angles. */}
      <group position={[0, -0.848, 0]}>
        <group scale={[2.6, 1, 1.15]}>
          <BlobShadow r={0.8} opacity={0.3} />
        </group>
        <group position={[0, 0, -2.3]} scale={[3.1, 1, 0.5]}>
          <BlobShadow r={0.8} opacity={0.32} />
        </group>
      </group>

      {/* Depth layers: back counter -> reagent shelf -> wall cabinets */}
      <group position={[0, -0.85, 0]}>
        <BackCounter />
      </group>
      <ReagentShelf y={0.55} />
      <WallCabinets />
      <CeilingLights />

      {/* Bench dressing, kept clear of the working area (x=0) */}
      <group position={[0.62, -0.015, -0.42]}>
        <WashBottle />
      </group>
      <group position={[-0.72, -0.015, 0.18]} rotation={[0, -0.3, 0]}>
        <LabNotebook />
      </group>
      <group position={[0.88, -0.015, 0.1]}>
        <AccentBeaker />
      </group>
    </group>
  )
}
