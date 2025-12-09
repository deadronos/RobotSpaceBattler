import { RigidBody } from '@react-three/rapier';
import { memo } from 'react';
import { Color } from 'three';

/**
 * Props for the RobotPlaceholder component.
 */
interface RobotPlaceholderProps {
  /** The primary color of the robot (hex string). */
  color?: string;
  /** Initial position of the robot in the world. */
  position?: [number, number, number];
}

/**
 * A simple visual representation of a robot in the 3D scene.
 * Uses a cylinder for the body and a sphere for the head.
 * Includes a kinematic rigid body for physics interactions.
 */
export const RobotPlaceholder = memo(function RobotPlaceholder({
  color = '#ff4d5a',
  position = [0, 0.8, 0],
}: RobotPlaceholderProps) {
  const emissivePrimary = new Color(color).multiplyScalar(0.2);
  const emissiveSecondary = new Color(color).multiplyScalar(0.25);

  return (
    <RigidBody type="fixed" colliders="hull" position={position}>
      <group>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 1, 2.2, 16]} />
          <meshStandardMaterial
            color={color}
            metalness={0.25}
            roughness={0.35}
            emissive={emissivePrimary}
          />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <sphereGeometry args={[0.7, 16, 16]} />
          <meshStandardMaterial
            color={color}
            metalness={0.15}
            roughness={0.45}
            emissive={emissiveSecondary}
          />
        </mesh>
      </group>
    </RigidBody>
  );
});
