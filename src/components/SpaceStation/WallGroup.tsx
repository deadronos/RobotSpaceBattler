import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";

import {
  CollisionGroup,
  interactionGroups,
} from "../../lib/physics/collisionGroups";

type WallConfig = {
  pos: [number, number, number];
  dim: [number, number, number];
};

const WALL_GROUP: WallConfig[] = [
  { pos: [0, 2.5, -50], dim: [100, 5, 2] },
  { pos: [0, 2.5, 50], dim: [100, 5, 2] },
  { pos: [50, 2.5, 0], dim: [2, 5, 100] },
  { pos: [-50, 2.5, 0], dim: [2, 5, 100] },
  { pos: [0, 2.5, -20], dim: [40, 5, 1.5] },
  { pos: [0, 2.5, 20], dim: [40, 5, 1.5] },
  { pos: [-20, 2.5, 0], dim: [1.5, 5, 30] },
  { pos: [20, 2.5, 0], dim: [1.5, 5, 30] },
  { pos: [0, 2.5, 0], dim: [6, 5, 6] },
  { pos: [-35, 2.5, -35], dim: [6, 5, 6] },
  { pos: [35, 2.5, -35], dim: [6, 5, 6] },
  { pos: [-35, 2.5, 35], dim: [6, 5, 6] },
  { pos: [35, 2.5, 35], dim: [6, 5, 6] },
];

/**
 * Renders the static walls of the arena.
 * Handles both visual representation and physics bodies.
 */
export function WallGroup() {
  const walls = useMemo(() => WALL_GROUP, []);

  return (
    <>
      {walls.map((wall, index) => {
        // Reduce collider size to 99% for <1cm clearance tolerance
        const colliderDim: [number, number, number] = [
          wall.dim[0] * 0.99,
          wall.dim[1] * 0.99,
          wall.dim[2] * 0.99,
        ];
        return (
          <RigidBody
            key={index}
            type="fixed"
            position={wall.pos}
            colliders={false}
            collisionGroups={interactionGroups(
              CollisionGroup.WALL,
              CollisionGroup.ROBOT | CollisionGroup.PROJECTILE,
            )}
          >
            <CuboidCollider args={[colliderDim[0] / 2, colliderDim[1] / 2, colliderDim[2] / 2]} />
            <mesh receiveShadow castShadow>
              <boxGeometry args={wall.dim} />
              <meshPhysicalMaterial
                color="#313c60"
                metalness={0.55}
                roughness={0.45}
              />
            </mesh>
          </RigidBody>
        );
      })}
    </>
  );
}
