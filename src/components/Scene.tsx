import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { ReactNode, Suspense } from 'react';

interface SceneProps {
  children?: ReactNode;
}

export function Scene({ children }: SceneProps) {
  return (
    <Canvas camera={{ position: [0, 18, 32], fov: 45 }}>
      <color attach="background" args={['#020310']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 24, 12]} intensity={1.0} />
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
