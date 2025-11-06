import { RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles
 * Physics-enabled with proper Rapier configuration
 */
export function SpaceStation() {
  return (
    <>
      {/* Floor */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -1, 0]} receiveShadow>
          <boxGeometry args={[100, 0.5, 100]} />
          <meshStandardMaterial color="#1a1d2e" metalness={0.4} roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* All walls in one group */}
      <WallGroup />

      {/* Strategic pillars */}
      <Pillar position={[-30, 1.5, -30]} />
      <Pillar position={[30, 1.5, -30]} />
      <Pillar position={[-30, 1.5, 30]} />
      <Pillar position={[30, 1.5, 30]} />

      {/* Lighting */}
      <pointLight position={[0, 10, 0]} intensity={0.4} color="#6699ff" distance={50} />
      <pointLight position={[-25, 5, -25]} intensity={0.2} color="#ff8866" distance={35} />
      <pointLight position={[25, 5, 25]} intensity={0.2} color="#ff8866" distance={35} />
    </>
  );
}

function WallGroup() {
  const walls = useMemo(
    () => [
      // Outer perimeter
      { pos: [0, 2.5, -50] as [number, number, number], dim: [100, 5, 2] as [number, number, number] },
      { pos: [0, 2.5, 50] as [number, number, number], dim: [100, 5, 2] as [number, number, number] },
      { pos: [50, 2.5, 0] as [number, number, number], dim: [2, 5, 100] as [number, number, number] },
      { pos: [-50, 2.5, 0] as [number, number, number], dim: [2, 5, 100] as [number, number, number] },
      // Internal corridors
      { pos: [0, 2.5, -20] as [number, number, number], dim: [40, 5, 1.5] as [number, number, number] },
      { pos: [0, 2.5, 20] as [number, number, number], dim: [40, 5, 1.5] as [number, number, number] },
      { pos: [-20, 2.5, 0] as [number, number, number], dim: [1.5, 5, 30] as [number, number, number] },
      { pos: [20, 2.5, 0] as [number, number, number], dim: [1.5, 5, 30] as [number, number, number] },
      // Central obstacle
      { pos: [0, 2.5, 0] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      // Corner structures
      { pos: [-35, 2.5, -35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [35, 2.5, -35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [-35, 2.5, 35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
      { pos: [35, 2.5, 35] as [number, number, number], dim: [6, 5, 6] as [number, number, number] },
    ],
    [],
  );

  return (
    <>
      {walls.map((wall, i) => (
        <RigidBody key={i} type="fixed" colliders="cuboid">
          <mesh position={wall.pos} receiveShadow>
            <boxGeometry args={wall.dim} />
            <meshStandardMaterial color="#2a3550" metalness={0.6} roughness={0.4} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

interface PillarProps {
  position: [number, number, number];
}

function Pillar({ position }: PillarProps) {
  return (
    <RigidBody type="fixed" colliders="hull">
      <mesh position={position} receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 3, 6]} />
        <meshStandardMaterial color="#3a4560" metalness={0.5} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}
