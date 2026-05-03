import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { useLabStore } from '../../store/labStore'

// Burette: 50 cm³, reads to 0.05 cm³
// Scale: 1 unit ≈ 1 cm for apparatus sizing
export function Burette({ position = [0, 0, 0] }) {
  const dripsRef = useRef([])
  const nextDripRef = useRef(0)
  const dripGroupRef = useRef()
  const { titration, tickDispense, setDripping } = useLabStore()

  // Tick animation frame for dispense
  useFrame((_, delta) => {
    if (titration.dripping && !titration.endpointReached) {
      tickDispense(delta)
    }
    // Animate drips
    if (dripGroupRef.current) {
      dripGroupRef.current.children.forEach(d => {
        d.position.y -= delta * 6
        if (d.position.y < -4) d.position.y = 0
      })
    }
  })

  const fillHeight = (titration.buretteVolume / 50) * 8  // 8 units tall

  return (
    <group position={position}>
      {/* Glass tube */}
      <mesh>
        <cylinderGeometry args={[0.18, 0.18, 10, 16, 1, true]} />
        <meshPhysicalMaterial
          color="#a8d8ea"
          transparent
          opacity={0.18}
          roughness={0}
          transmission={0.8}
          thickness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Liquid inside */}
      <mesh position={[0, (fillHeight / 2) - 4.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, fillHeight, 12]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.65} />
      </mesh>
      {/* Stopcock */}
      <mesh position={[0, -5.1, 0]}>
        <boxGeometry args={[0.5, 0.25, 0.3]} />
        <meshStandardMaterial color={titration.dripping ? '#22c55e' : '#94a3b8'} />
      </mesh>
      {/* Tip */}
      <mesh position={[0, -5.5, 0]}>
        <cylinderGeometry args={[0.04, 0.02, 0.8, 8]} />
        <meshPhysicalMaterial color="#a8d8ea" transparent opacity={0.3} />
      </mesh>

      {/* Volume markings (every 10 cm³) */}
      {[0, 10, 20, 30, 40, 50].map(v => {
        const y = 4 - (v / 50) * 8
        return (
          <Text
            key={v}
            position={[0.32, y, 0]}
            fontSize={0.22}
            color="#94a3b8"
            anchorX="left"
          >
            {v}
          </Text>
        )
      })}

      {/* Live reading label */}
      <Text
        position={[0, 5.6, 0]}
        fontSize={0.28}
        color="#4ade80"
        anchorX="center"
        font="https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD3oKE.woff2"
      >
        {`${titration.buretteVolume.toFixed(2)} cm³`}
      </Text>

      {/* Drips */}
      {titration.dripping && (
        <group ref={dripGroupRef} position={[0, -5.9, 0]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[0, -i * 0.4, 0]}>
              <sphereGeometry args={[0.045, 6, 6]} />
              <meshStandardMaterial color="#3b82f6" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
