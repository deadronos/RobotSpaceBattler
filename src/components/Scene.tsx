import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ReactNode, Suspense } from 'react';

interface SceneProps {
  children?: ReactNode;
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 18, 32], fov: 45 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#020310']} />
      <ambientLight intensity={0.35} color="#3a3f66" />
      <hemisphereLight
        groundColor="#0a0b18"
        intensity={0.25}
        color="#6a7dff"
        position={[0, 30, 0]}
      />
      <directionalLight
        position={[25, 32, 18]}
        intensity={1.15}
        color="#f3f0ff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0008}
      />
      <spotLight
        position={[-30, 22, -20]}
        angle={0.6}
        penumbra={0.4}
        intensity={0.85}
        color="#88aaff"
        castShadow
        distance={120}
      />
      <Stars radius={80} depth={50} count={1500} factor={3} saturation={0.5} />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} interpolate={false}>
          {children}
        </Physics>
      </Suspense>
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
