import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { useLabStore } from '../../store/labStore'

export function ConicalFlask({ position = [0, 0, 0] }) {
  const { titration, getPreset } = useLabStore()
  const colorRef = useRef()
  const preset = getPreset()

  useFrame(() => {
    if (colorRef.current && titration.flaskFilled) {
      colorRef.current.color.set(titration.color)
    }
  })

  // Conical flask shape via lathe
  const points = useMemo(() => {
    const pts = []
    // bottom flat
    pts.push(new THREE.Vector2(0, 0))
    pts.push(new THREE.Vector2(0.7, 0))
    // conical sides
    pts.push(new THREE.Vector2(1.1, 1.0))
    pts.push(new THREE.Vector2(1.3, 1.8))
    pts.push(new THREE.Vector2(1.35, 2.2))
    // shoulder
    pts.push(new THREE.Vector2(1.2, 2.5))
    pts.push(new THREE.Vector2(0.8, 2.8))
    // neck
    pts.push(new THREE.Vector2(0.45, 3.1))
    pts.push(new THREE.Vector2(0.42, 3.6))
    pts.push(new THREE.Vector2(0.44, 3.8))
    return pts
  }, [])

  // Liquid fill level
  const fillY = titration.flaskFilled ? 1.4 : 0

  return (
    <group position={position}>
      {/* Glass outer shell */}
      <mesh>
        <latheGeometry args={[points, 24]} />
        <meshPhysicalMaterial
          color="#b0d8e8"
          transparent opacity={0.15}
          roughness={0} transmission={0.9}
          thickness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Liquid */}
      {titration.flaskFilled && (
        <mesh position={[0, fillY / 2, 0]}>
          <cylinderGeometry args={[1.1, 0.6, fillY, 20]} />
          <meshStandardMaterial
            ref={colorRef}
            color={titration.color}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Volume label */}
      <Text position={[1.8, 1.5, 0]} fontSize={0.24} color="#64748b" anchorX="left">
        250 cm³
      </Text>

      {/* Status line */}
      {titration.endpointReached && (
        <Text position={[0, 4.4, 0]} fontSize={0.28} color="#4ade80" anchorX="center">
          Endpoint ✓
        </Text>
      )}
      {titration.indicatorAdded && !titration.endpointReached && (
        <Text position={[0, 4.4, 0]} fontSize={0.22} color="#fbbf24" anchorX="center">
          {preset?.indicator}
        </Text>
      )}
    </group>
  )
}


