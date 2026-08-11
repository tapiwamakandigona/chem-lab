import { RoundedBox } from '@react-three/drei'

/**
 * Shared lab room: epoxy-top bench, steel frame, floor, back wall.
 * Bright modern teaching-lab look (Labster reference) — the dark UI panels
 * sit on top of a light viewport, like a 3D editor.
 */
export default function LabRoom() {
  return (
    <group>
      {/* Bench top — black epoxy resin, the classic chem bench */}
      <group position={[0, -0.05, 0]}>
        <RoundedBox args={[3.4, 0.07, 1.5]} radius={0.015} receiveShadow>
          <meshStandardMaterial color="#26292e" roughness={0.35} metalness={0.05} />
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
        <meshStandardMaterial color="#c9d2da" roughness={0.9} />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 1.6, -2.6]}>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#e3e9f0" roughness={1} />
      </mesh>
      {/* Skirting stripe, kept below bench line so it never crosses apparatus */}
      <mesh position={[0, -0.55, -2.59]}>
        <planeGeometry args={[14, 0.35]} />
        <meshStandardMaterial color="#3d7a99" roughness={1} />
      </mesh>
    </group>
  )
}
