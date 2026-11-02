import { useMemo } from "react";

import { NeonGeometry } from "../vfx/NeonGeometry";

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
        return (
          <group key={index} position={wall.pos}>
            <mesh receiveShadow castShadow>
              <boxGeometry args={wall.dim} />
              <meshPhysicalMaterial
                color="#313c60"
                metalness={0.55}
                roughness={0.45}
              />
            </mesh>
            {/* Add Neon Strips along the top edges */}
            <NeonGeometry
              color="#00f3ff"
              intensity={2}
              position={[0, wall.dim[1] / 2 - 0.1, 0]}
              flickerSpeed={3}
            >
              <boxGeometry
                args={[wall.dim[0] + 0.1, 0.15, wall.dim[2] + 0.1]}
              />
            </NeonGeometry>
            {/* Add Neon Strips along the bottom edges */}
            <NeonGeometry
              color="#ff00aa"
              intensity={1.5}
              position={[0, -wall.dim[1] / 2 + 0.1, 0]}
              flickerSpeed={2}
            >
              <boxGeometry
                args={[wall.dim[0] + 0.1, 0.15, wall.dim[2] + 0.1]}
              />
            </NeonGeometry>
          </group>
        );
      })}
    </>
  );
}
