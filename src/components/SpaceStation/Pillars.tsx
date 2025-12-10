import { RigidBody } from "@react-three/rapier";

import {
  CollisionGroup,
  interactionGroups,
} from "../../lib/physics/collisionGroups";

const PILLAR_POSITIONS: [number, number, number][] = [
  [-30, 1.5, -30],
  [30, 1.5, -30],
  [-30, 1.5, 30],
  [30, 1.5, 30],
];

/**
 * Renders the set of static pillars in the arena.
 * Handles both visual representation and physics bodies.
 */
export function Pillars() {
  return (
    <>
      {PILLAR_POSITIONS.map((position, index) => (
        <Pillar key={`pillar-${index}`} position={position} />
      ))}
    </>
  );
}

interface PillarProps {
  position: [number, number, number];
}

/**
 * A single cylindrical pillar.
 */
function Pillar({ position }: PillarProps) {
  return (
    <RigidBody
      type="fixed"
      colliders="hull"
      collisionGroups={interactionGroups(
        CollisionGroup.PILLAR,
        CollisionGroup.ROBOT | CollisionGroup.PROJECTILE,
      )}
    >
      <mesh position={position} receiveShadow castShadow>
        <cylinderGeometry args={[1.2, 1.2, 3, 6]} />
        <meshPhysicalMaterial color="#3a4560" metalness={0.5} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
}
