import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

import type { Robot as RobotEntity } from '../ecs/entities/Robot';
import type { Quaternion, Vector3 } from '../types';
import { lerpVector } from '../utils/math';

export interface RobotProps {
  robot: RobotEntity;
  /**
   * Interpolation factor applied during useFrame updates to smooth positional changes.
   * Defaults to 0.2 which provides a responsive yet stable interpolation.
   */
  interpolationAlpha?: number;
}

const TEAM_COLORS = {
  red: '#ff5f57',
  blue: '#4a90e2',
} as const;

const MIN_HEALTH_SCALE = 0.01;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerpQuaternion(from: Quaternion, to: Quaternion, t: number): Quaternion {
  const lerped = {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
    w: from.w + (to.w - from.w) * t,
  };

  const length = Math.hypot(lerped.x, lerped.y, lerped.z, lerped.w) || 1;

  return {
    x: lerped.x / length,
    y: lerped.y / length,
    z: lerped.z / length,
    w: lerped.w / length,
  };
}

function getHealthColor(percentage: number): string {
  if (percentage > 0.6) {
    return '#4ade80';
  }

  if (percentage > 0.3) {
    return '#facc15';
  }

  return '#f87171';
}

export function Robot({ robot, interpolationAlpha = 0.2 }: RobotProps) {
  const groupRef = useRef<Group>(null);
  const previousPosition = useRef<Vector3>({ ...robot.position });
  const previousRotation = useRef<Quaternion>({ ...robot.rotation });

  const teamColor = TEAM_COLORS[robot.team];

  const healthPercentage = useMemo(() => {
    if (robot.maxHealth <= 0) {
      return 0;
    }

    return clamp(robot.health / robot.maxHealth, 0, 1);
  }, [robot.health, robot.maxHealth]);

  const healthColor = useMemo(
    () => getHealthColor(healthPercentage),
    [healthPercentage]
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }

    const nextPosition = lerpVector(previousPosition.current, robot.position, interpolationAlpha);
    previousPosition.current = nextPosition;
    group.position.set(nextPosition.x, nextPosition.y, nextPosition.z);

    const nextRotation = lerpQuaternion(previousRotation.current, robot.rotation, interpolationAlpha);
    previousRotation.current = nextRotation;
    group.quaternion.set(nextRotation.x, nextRotation.y, nextRotation.z, nextRotation.w);
  });

  return (
    <group
      ref={groupRef}
      name={`robot-${robot.id}`}
      position={[robot.position.x, robot.position.y, robot.position.z]}
      quaternion={[robot.rotation.x, robot.rotation.y, robot.rotation.z, robot.rotation.w]}
    >
      <mesh name="robot-body" castShadow receiveShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial
          color={teamColor}
          emissive={robot.isCaptain ? '#ffd966' : '#000000'}
          emissiveIntensity={robot.isCaptain ? 0.6 : 0}
        />
      </mesh>

      {robot.isCaptain ? (
        <mesh name="captain-indicator" position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#ffd966" />
        </mesh>
      ) : null}

      <group name="health-bar" position={[0, 1.4, 0]}>
        <mesh name="health-bar-background">
          <planeGeometry args={[1.2, 0.15]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
        <mesh
          name="health-bar-fill"
          position={[(healthPercentage - 1) / 2, 0, 0.01]}
          scale={[Math.max(healthPercentage, MIN_HEALTH_SCALE), 1, 1]}
        >
          <planeGeometry args={[1, 0.1]} />
          <meshBasicMaterial color={healthColor} />
        </mesh>
      </group>
    </group>
  );
}

export default Robot;
