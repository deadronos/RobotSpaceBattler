import { useFrame } from "@react-three/fiber";
import { memo, useRef } from "react";
import {
  Color,
  CylinderGeometry,
  Group,
  Material,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";

import type { RobotEntity } from "../ecs/worldTypes";

/** Height of the robot centre above the arena floor. */
export const ROBOT_CENTER_Y = 0.8;

/** Shared by every robot: one geometry per shape, never per instance. */
const BODY_GEOMETRY = new CylinderGeometry(0.9, 1, 2.2, 16);
const HEAD_GEOMETRY = new SphereGeometry(0.7, 16, 16);

const bodyMaterials = new Map<string, MeshStandardMaterial>();
const headMaterials = new Map<string, MeshStandardMaterial>();

function sharedMaterial(
  cache: Map<string, MeshStandardMaterial>,
  color: string,
  params: { metalness: number; roughness: number; emissiveScale: number },
): Material {
  let material = cache.get(color);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      metalness: params.metalness,
      roughness: params.roughness,
      emissive: new Color(color).multiplyScalar(params.emissiveScale),
    });
    cache.set(color, material);
  }
  return material;
}

/**
 * Writes the ECS position of a robot onto a scene object.
 *
 * The ECS is the single owner of robot positions; the scene graph is a pure
 * projection of it. There is no Rapier body for robots to keep in sync.
 */
export function applyRobotTransform(
  target: { position: { set(x: number, y: number, z: number): unknown } },
  robot: Pick<RobotEntity, "position">,
): void {
  target.position.set(robot.position.x, ROBOT_CENTER_Y, robot.position.z);
}

interface RobotPlaceholderProps {
  /** The ECS entity this mesh mirrors. */
  robot: RobotEntity;
  /** Team colour (hex string), selects the shared materials. */
  color: string;
}

/**
 * Visual representation of a robot: a cylinder body plus a sphere head.
 *
 * Rendering is ref-driven: the component renders once per robot lifetime and
 * `useFrame` copies the ECS position onto the group, so React never has to
 * re-render to move a robot. Geometries and materials are shared module-level
 * objects (never disposed by R3F, since they are passed as props, not owned).
 *
 * Physics ownership: robots deliberately have no Rapier RigidBody/collider.
 * The only Rapier queries in the game are static-geometry raycasts filtered
 * to walls and pillars, so robot colliders were never hit and only cost
 * broadphase work. See docs/contributing/architecture.md.
 */
export const RobotPlaceholder = memo(function RobotPlaceholder({
  robot,
  color,
}: RobotPlaceholderProps) {
  const groupRef = useRef<Group>(null);
  const bodyMaterial = sharedMaterial(bodyMaterials, color, {
    metalness: 0.25,
    roughness: 0.35,
    emissiveScale: 0.2,
  });
  const headMaterial = sharedMaterial(headMaterials, color, {
    metalness: 0.15,
    roughness: 0.45,
    emissiveScale: 0.25,
  });

  useFrame(() => {
    if (groupRef.current) applyRobotTransform(groupRef.current, robot);
  });

  return (
    <group
      ref={groupRef}
      position={[robot.position.x, ROBOT_CENTER_Y, robot.position.z]}
    >
      <mesh
        geometry={BODY_GEOMETRY}
        material={bodyMaterial}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={HEAD_GEOMETRY}
        material={headMaterial}
        position={[0, 1.4, 0]}
        castShadow
      />
    </group>
  );
});
