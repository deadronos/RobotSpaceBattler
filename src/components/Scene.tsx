import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ReactNode } from 'react';

interface SceneProps {
  children?: ReactNode;
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas camera={{ position: [0, 18, 32], fov: 45 }}>
      <color attach="background" args={['#020310']} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[12, 24, 12]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <Stars radius={80} depth={50} count={4000} factor={4} saturation={0.5} />
      {children}
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
