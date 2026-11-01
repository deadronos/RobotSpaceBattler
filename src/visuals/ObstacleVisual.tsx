import { ThreeElements, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Color, Group, MeshStandardMaterial } from "three";

import { ObstacleEntity } from "../ecs/world";

type ObstacleVisualProps = ThreeElements["group"] & {
  obstacle: ObstacleEntity;
};

const barrierColor = new Color("#7dd3ff");
const hazardColor = new Color("#ff8f7a");
const coverColor = new Color("#c7ffc1");

/**
 * Renders one obstacle. Obstacles can move, rotate and toggle `active` in the
 * simulation, and the app no longer re-renders per frame, so the transform and
 * opacity are synced imperatively from the ECS entity in `useFrame`.
 */
export function ObstacleVisual({ obstacle, ...rest }: ObstacleVisualProps) {
  const { shape, obstacleType } = obstacle;
  const isHazard = obstacleType === "hazard";
  const isCover = obstacleType === "destructible";
  const color = isHazard ? hazardColor : isCover ? coverColor : barrierColor;
  const groupRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame(() => {
    const group = groupRef.current;
    if (group) {
      group.position.set(
        obstacle.position?.x ?? 0,
        obstacle.position?.y ?? 0,
        obstacle.position?.z ?? 0,
      );
      if (shape?.kind !== "circle") {
        group.rotation.y = obstacle.orientation ?? 0;
      }
    }
    if (materialRef.current) {
      materialRef.current.opacity = obstacle.active === false ? 0.35 : 0.9;
    }
  });

  const opacity = obstacle.active === false ? 0.35 : 0.9;
  const position = [
    obstacle.position?.x ?? 0,
    obstacle.position?.y ?? 0,
    obstacle.position?.z ?? 0,
  ] as const;

  if (shape?.kind === "circle") {
    return (
      <group {...rest} ref={groupRef} position={position}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[shape.radius, 32]} />
          <meshStandardMaterial
            ref={materialRef}
            color={color}
            transparent
            opacity={opacity}
          />
        </mesh>
      </group>
    );
  }

  const width = (shape?.kind === "box" ? shape.halfWidth * 2 : 2) || 2;
  const depth = (shape?.kind === "box" ? shape.halfDepth * 2 : 2) || 2;

  return (
    <group
      {...rest}
      ref={groupRef}
      position={position}
      rotation={[0, obstacle.orientation ?? 0, 0]}
    >
      <mesh>
        <boxGeometry args={[width, 1, depth]} />
        <meshStandardMaterial
          ref={materialRef}
          color={color}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
