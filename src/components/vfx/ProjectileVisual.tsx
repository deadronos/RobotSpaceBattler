import { Line, Sparkles, Trail } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Group, Vector3 } from 'three';

import { ProjectileEntity, RobotEntity } from '../../ecs/world';

/**
 * Props for the ProjectileVisual component.
 */
interface ProjectileVisualProps {
  /** The projectile entity to render. */
  projectile: ProjectileEntity;
  /** The robot that fired the projectile (optional). */
  shooter?: RobotEntity;
  /** The target robot (optional). */
  target?: RobotEntity;
}

function RocketProjectileVisual({ projectile }: { projectile: ProjectileEntity }) {
  const groupRef = useRef<Group>(null);
  const position = useMemo(() => new Vector3(), []);
  const lookAtTarget = useMemo(() => new Vector3(), []);
  const velocity = useMemo(() => new Vector3(), []);

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    position.set(projectile.position.x, projectile.position.y, projectile.position.z);
    groupRef.current.position.copy(position);

    velocity.set(projectile.velocity.x, projectile.velocity.y, projectile.velocity.z);
    if (velocity.lengthSq() > 1e-6) {
      lookAtTarget.copy(position).add(velocity);
      groupRef.current.lookAt(lookAtTarget);
    }
  });

  const radius = projectile.projectileSize ?? 0.32;
  const trailColor = projectile.trailColor ?? '#ffb347';

  return (
    <Trail width={radius * 0.8} length={6} color={trailColor} attenuation={(t) => (1 - t) ** 2}>
      <group ref={groupRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.35, radius * 0.45, radius * 2, 12]} />
          <meshStandardMaterial
            color={projectile.projectileColor ?? '#ff955c'}
            emissive={projectile.projectileColor ?? '#ff955c'}
            emissiveIntensity={1.3}
          />
        </mesh>
        <mesh position={[0, 0, radius * 1.1]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[radius * 0.55, radius * 1.1, 10]} />
          <meshStandardMaterial color="#fff0d1" emissive="#ffd7a1" emissiveIntensity={1.1} />
        </mesh>
      </group>
    </Trail>
  );
}

function LaserProjectileVisual({
  projectile,
  shooter,
  target,
}: {
  projectile: ProjectileEntity;
  shooter?: RobotEntity;
  target?: RobotEntity;
}) {
  const start: [number, number, number] = shooter
    ? [shooter.position.x, shooter.position.y + 0.8, shooter.position.z]
    : [projectile.position.x, projectile.position.y, projectile.position.z];
  const hitPosition: [number, number, number] = target
    ? [target.position.x, target.position.y + 0.8, target.position.z]
    : [projectile.position.x, projectile.position.y, projectile.position.z];

  const beamWidth = projectile.beamWidth ?? 0.08;
  const color = projectile.projectileColor ?? '#7fffd4';

  const points: [number, number, number][] = [start, hitPosition];

  return (
    <>
      <Line points={points} color={color} lineWidth={beamWidth * 24} toneMapped={false} />
      <mesh position={hitPosition}>
        <sphereGeometry args={[beamWidth * 1.8, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
      </mesh>
      <Sparkles
        position={hitPosition}
        count={14}
        speed={1.6}
        size={beamWidth * 18}
        scale={beamWidth * 28}
        color={color}
      />
    </>
  );
}

function GunProjectileVisual({ projectile }: { projectile: ProjectileEntity }) {
  const start: [number, number, number] = [
    projectile.position.x,
    projectile.position.y,
    projectile.position.z,
  ];
  const direction = new Vector3(
    projectile.velocity.x,
    projectile.velocity.y,
    projectile.velocity.z,
  );
  const length = direction.length() > 0 ? Math.min(1.4, Math.max(0.35, direction.length() * 0.04)) : 0.45;
  if (direction.length() > 0) {
    direction.normalize().multiplyScalar(length);
  }
  const end: [number, number, number] = [
    start[0] - direction.x,
    start[1] - direction.y,
    start[2] - direction.z,
  ];
  const color = projectile.projectileColor ?? '#ffe08a';
  const radius = Math.max(0.08, (projectile.projectileSize ?? 0.14) * 0.9);

  const points: [number, number, number][] = [start, end];

  return (
    <>
      <Line points={points} color={color} lineWidth={2} toneMapped={false} />
      <mesh position={start}>
        <sphereGeometry args={[radius, 10, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
    </>
  );
}

/**
 * Renders a visual representation of a projectile.
 * Chooses the appropriate visual style based on the weapon type.
 */
export function ProjectileVisual({ projectile, shooter, target }: ProjectileVisualProps) {
  if (projectile.weapon === 'rocket') {
    return <RocketProjectileVisual projectile={projectile} />;
  }

  if (projectile.weapon === 'laser') {
    return <LaserProjectileVisual projectile={projectile} shooter={shooter} target={target} />;
  }

  return <GunProjectileVisual projectile={projectile} />;
}
