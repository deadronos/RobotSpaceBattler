import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export interface NeonGeometryProps {
  color: string;
  intensity?: number;
  flickerSpeed?: number;
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

/**
 * A helper component that renders children with a pulsing emissive material.
 * Useful for creating neon strips, glowing rings, etc.
 */
export function NeonGeometry({
  color,
  intensity = 2,
  flickerSpeed = 2,
  children,
  position,
  rotation,
}: NeonGeometryProps) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      const t = clock.getElapsedTime();
      // Smooth pulse between 0.8x and 1.2x intensity
      const pulse = Math.sin(t * flickerSpeed) * 0.2 + 1.0;
      materialRef.current.emissiveIntensity = intensity * pulse;
    }
  });

  return (
    <mesh position={position} rotation={rotation}>
      {children}
      <meshPhysicalMaterial
        ref={materialRef}
        color={color}
        emissive={color}
        emissiveIntensity={intensity}
        toneMapped={false}
        roughness={0.2}
        metalness={0.8}
      />
    </mesh>
  );
}
