import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";

import type { BattleWorld, RobotEntity, UnitRole } from "../../ecs/worldTypes";
import { teamColor } from "../../lib/teamPalette";
import { hideAllInstances } from "../../visuals/instanceColorUtils";
import { hitFlashIntensity } from "../../visuals/robots/robotFeedback";
import {
  createRobotSlotBuffers,
  fillRobotSlots,
} from "../../visuals/robots/robotInstanceBuffer";
import {
  MAX_ROBOTS_PER_ROLE,
  ROBOT_ROLES,
} from "../../visuals/robots/robotLayout";
import {
  createRobotMaterial,
  createRobotRoleVisuals,
} from "../../visuals/robots/roleVisuals";
import { writeRobotMatrix } from "../../visuals/robots/robotTransform";

/** How far the body colour is pushed towards white during a hit flash. */
const HIT_FLASH_MIX = 0.7;
const WHITE = new Color("#ffffff");
const HIDDEN_Y = -512;

/**
 * Instanced robot bodies and heads, one InstancedMesh per role (#168).
 *
 * The ECS owns robot state; this layer only projects it. Each frame it fills
 * per-role instance slots from `battleWorld.robots.entities`, writes the
 * position/orientation matrices and the team colour as an instance attribute,
 * and brightens the instance colour briefly when the robot has just been hit.
 *
 * Draw calls are constant: four roles × one merged body+head geometry, plus
 * the shadow pass. `count` follows the live robots per role, so dead robots
 * are not vertex-processed in the main or the shadow pass, and adding or
 * removing robots still never changes the draw-call count (#233).
 */
export function RobotInstances({
  battleWorld,
  colorBlindPalette = false,
}: {
  battleWorld: BattleWorld;
  /** Use the colour-blind-safe team palette (#166). */
  colorBlindPalette?: boolean;
}) {
  const visuals = useMemo(() => createRobotRoleVisuals(), []);
  const material = useMemo(() => createRobotMaterial(), []);
  const buffers = useMemo(
    () => createRobotSlotBuffers(MAX_ROBOTS_PER_ROLE),
    [],
  );
  const meshes = useRef<Partial<Record<UnitRole, InstancedMesh | null>>>({});
  const previousCounts = useRef<number[]>(ROBOT_ROLES.map(() => 0));
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const teamColors = useMemo(
    () => ({
      red: new Color(teamColor("red", colorBlindPalette)),
      blue: new Color(teamColor("blue", colorBlindPalette)),
    }),
    [colorBlindPalette],
  );

  useEffect(() => {
    return () => {
      for (const role of ROBOT_ROLES) {
        visuals[role].geometry.dispose();
      }
      material.dispose();
    };
  }, [visuals, material]);

  // Give every instance matrix and colour a defined, hidden starting state
  // before the first render, so the program compiles with instancing colours.
  useLayoutEffect(() => {
    for (const role of ROBOT_ROLES) {
      const mesh = meshes.current[role];
      if (mesh) hideAllInstances(mesh, MAX_ROBOTS_PER_ROLE);
    }
  }, []);

  useFrame(() => {
    const now = battleWorld.state.elapsedMs;
    fillRobotSlots(battleWorld.robots.entities, buffers);

    for (let roleSlot = 0; roleSlot < ROBOT_ROLES.length; roleSlot += 1) {
      const role = ROBOT_ROLES[roleSlot];
      const mesh = meshes.current[role];
      if (!mesh) {
        continue;
      }

      const count = buffers.counts[roleSlot];
      const previous = previousCounts.current[roleSlot];
      const roleSlots = buffers.slots[roleSlot];

      for (let i = 0; i < count; i += 1) {
        const robot = roleSlots[i] as RobotEntity;
        writeRobotMatrix(dummy, robot);
        mesh.setMatrixAt(i, dummy.matrix);

        const flash = hitFlashIntensity(now, robot.lastDamageTimestamp);
        color.copy(teamColors[robot.team]);
        if (flash > 0) {
          color.lerp(WHITE, HIT_FLASH_MIX * flash);
        }
        mesh.setColorAt(i, color);
      }

      // Slots that were used last frame but not this one fall outside the
      // live window; hide them anyway so a later re-use cannot show a stale
      // matrix for one frame.
      for (let i = count; i < previous; i += 1) {
        dummy.position.set(0, HIDDEN_Y, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.001);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }

      previousCounts.current[roleSlot] = count;
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {ROBOT_ROLES.map((role) => (
        <instancedMesh
          key={role}
          ref={(mesh) => {
            meshes.current[role] = mesh;
          }}
          name={`instanced-robots-${role}`}
          args={[visuals[role].geometry, material, MAX_ROBOTS_PER_ROLE]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />
      ))}
    </>
  );
}
