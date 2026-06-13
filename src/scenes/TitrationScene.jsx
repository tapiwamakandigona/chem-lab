import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { Suspense } from 'react'
import { Burette } from '../components/apparatus/Burette'
import { Pipette } from '../components/apparatus/Pipette'
import { ConicalFlask } from '../components/apparatus/ConicalFlask'
import { useLabStore } from '../store/labStore'

function LabRoom() {
  const { quality } = useLabStore()

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow={quality === 'high'} />
      <pointLight position={[-3, 6, 2]} intensity={0.6} color="#e0f0ff" />

      {/* Environment reflection */}
      {quality !== 'low' && <Environment preset="city" />}

      {/* Lab bench surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.5, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#1e2433" roughness={0.8} />
      </mesh>

      {/* Retort stand / support */}
      <mesh position={[-1.8, -1.5, 0]}>
        <boxGeometry args={[0.08, 10, 0.08]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Horizontal arm */}
      <mesh position={[-0.9, 4.2, 0]}>
        <boxGeometry args={[1.8, 0.07, 0.07]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Burette clamp */}
      <mesh position={[0, 4.0, 0]}>
        <torusGeometry args={[0.22, 0.04, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
      </mesh>

      {/* Apparatus */}
      <Burette position={[0, -0.5, 0]} />
      <Pipette position={[2.6, -1, 0]} />
      <ConicalFlask position={[0, -6.3, 0]} />

      {/* Ground shadow */}
      {quality !== 'low' && (
        <ContactShadows position={[0, -6.48, 0]} scale={12} blur={2} opacity={0.5} />
      )}

      {/* Grid lines on bench */}
      <Grid
        position={[0, -6.49, 0]}
        args={[20, 14]}
        cellColor="#1e2433"
        sectionColor="#263044"
        fadeDistance={18}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </>
  )
}

export default function TitrationScene() {
  const { isMobile } = useLabStore()

  return (
    <Canvas
      camera={{ position: [0, 2, 14], fov: isMobile ? 65 : 52 }}
      gl={{ antialias: true, alpha: false }}
      shadows
      style={{ background: '#0f1117' }}
      performance={{ min: 0.5 }}
    >
      <Suspense fallback={null}>
        <LabRoom />
      </Suspense>
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 1.8}
        enablePan={true}
        touches={{
          ONE: 2,   // rotate with 1 finger
          TWO: 512, // zoom/pan with 2 fingers
        }}
      />
    </Canvas>
  )
}
