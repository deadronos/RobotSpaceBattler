import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { MeshBasicMaterial } from "three";

import { ARENA_FLOOR, ARENA_SOLID } from "../../visuals/arena/arenaConfig";
import {
  buildArenaFloorGeometry,
  buildArenaNeonGroups,
  buildArenaSolidGeometry,
} from "../../visuals/arena/arenaGeometry";
import { neonPulse } from "../../visuals/arena/arenaNeonPulse";

/**
 * The static arena as a handful of merged meshes (#229).
 *
 * Before: one mesh per wall, pillar, lamp housing and neon strip — about 60
 * draw calls and 34 `useFrame` pulse callbacks. Now: the floor, one merged
 * solid (walls + pillars + lamp housings) and one unlit mesh per neon pulse
 * group. The strips stay HDR (vertex colours above 1.0, `toneMapped: false`),
 * so bloom still picks them up, and a single `useFrame` scales the materials of
 * the pulsing groups instead of 34 callbacks writing `emissiveIntensity`.
 */
export function ArenaMeshes() {
  const solidGeometry = useMemo(() => buildArenaSolidGeometry(), []);
  const floorGeometry = useMemo(() => buildArenaFloorGeometry(), []);
  const neonGroups = useMemo(() => buildArenaNeonGroups(), []);
  const neonMaterials = useRef<(MeshBasicMaterial | null)[]>([]);

  useEffect(() => {
    // Read `.current` here: the ref keeps one stable array that the render
    // callbacks fill in.
    const materials = neonMaterials.current;
    return () => {
      solidGeometry.dispose();
      floorGeometry.dispose();
      for (const group of neonGroups) group.geometry.dispose();
      for (const material of materials) material?.dispose();
    };
  }, [solidGeometry, floorGeometry, neonGroups]);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    for (let i = 0; i < neonGroups.length; i += 1) {
      const group = neonGroups[i];
      if (group.flickerSpeed <= 0) {
        continue;
      }
      const material = neonMaterials.current[i];
      if (material) {
        material.color.setScalar(neonPulse(elapsed, group.flickerSpeed));
      }
    }
  });

  return (
    <>
      <mesh name="arena-floor" geometry={floorGeometry} receiveShadow>
        <meshStandardMaterial
          color={ARENA_FLOOR.color}
          emissive={ARENA_FLOOR.emissive}
          emissiveIntensity={ARENA_FLOOR.emissiveIntensity}
          metalness={ARENA_FLOOR.metalness}
          roughness={ARENA_FLOOR.roughness}
        />
      </mesh>
      <mesh
        name="arena-solid"
        geometry={solidGeometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          vertexColors
          metalness={ARENA_SOLID.metalness}
          roughness={ARENA_SOLID.roughness}
        />
      </mesh>
      {neonGroups.map((group, index) => (
        <mesh
          key={group.id}
          name={`arena-neon-${group.id}`}
          geometry={group.geometry}
        >
          <meshBasicMaterial
            ref={(material) => {
              neonMaterials.current[index] = material;
            }}
            vertexColors
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}
