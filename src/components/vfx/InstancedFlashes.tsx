import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, Object3D, SphereGeometry } from "three";

import type { RobotEntity, Store } from "../../ecs/worldTypes";
import {
  applyHiddenInstance,
  clampHDRColor,
  ensureGeometryHasVertexColors,
  markInstanceBuffersDirty,
} from "../../visuals/instanceColorUtils";
import {
  hitFlashIntensity,
  muzzleFlashIntensity,
} from "../../visuals/robots/robotFeedback";
import {
  ROBOT_CENTER_Y,
  ROBOT_HIT_FLASH_RADIUS,
  ROBOT_MUZZLE_OFFSETS,
} from "../../visuals/robots/robotLayout";
import type { VisualInstanceManager } from "../../visuals/VisualInstanceManager";
import {
  ensureInstancedMeshReady,
  forEachInactiveInstance,
  swapActiveInstanceSets,
  useInstancedMeshLifecycle,
} from "./useInstancedMeshLifecycle";

type FlashKind = "hit" | "muzzle";

interface ActiveFlash {
  kind: FlashKind;
  robot: RobotEntity;
}

const HIT_COLOR = new Color("#ffb070");
const MUZZLE_COLOR = new Color("#ffe6a8");

/**
 * Hit flashes and muzzle flashes as one instanced additive mesh (#168).
 *
 * Both triggers come from fields the simulation already maintains
 * (`lastDamageTimestamp`, `fireCooldown`/`fireRate`), so no simulation state is
 * added and no React component mounts per shot. Slots are allocated through the
 * shared `VisualInstanceManager` (`flashes` category), the same path projectiles
 * and effects use, and released when the flash expires.
 */
export function InstancedFlashes({
  robots,
  instanceManager,
  getTimeMs,
}: {
  robots: Store<RobotEntity>;
  instanceManager: VisualInstanceManager;
  getTimeMs: () => number;
}) {
  const capacity = instanceManager.getCapacity("flashes");
  const { meshRef, activeRef, previousActiveRef, dirtyRef, initStateRef } =
    useInstancedMeshLifecycle(capacity);
  const active = useRef(new Map<string, ActiveFlash>());
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color("#000000"), []);
  const geometry = useMemo(() => {
    const sphere = new SphereGeometry(1, 12, 8);
    ensureGeometryHasVertexColors(sphere);
    return sphere;
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    const manager = instanceManager;
    const flashes = active.current;
    return () => {
      for (const key of flashes.keys()) {
        manager.releaseIndex("flashes", key);
      }
      flashes.clear();
    };
  }, [instanceManager]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || capacity === 0) {
      return;
    }
    ensureInstancedMeshReady(mesh, capacity, initStateRef);

    const now = getTimeMs();
    const flashes = active.current;
    const list = robots.entities;

    // Register newly started flashes. Allocation happens once per flash, not
    // per frame.
    for (let i = 0; i < list.length; i += 1) {
      const robot = list[i];
      if (robot.health <= 0) {
        continue;
      }
      if (hitFlashIntensity(now, robot.lastDamageTimestamp) > 0) {
        const key = `hit:${robot.id}`;
        if (!flashes.has(key)) {
          if (instanceManager.allocateIndex("flashes", key) === null) {
            continue;
          }
          flashes.set(key, { kind: "hit", robot });
        }
      }
      if (muzzleFlashIntensity(robot.fireCooldown, robot.fireRate) > 0) {
        const key = `muzzle:${robot.id}`;
        if (!flashes.has(key)) {
          if (instanceManager.allocateIndex("flashes", key) === null) {
            continue;
          }
          flashes.set(key, { kind: "muzzle", robot });
        }
      }
    }

    // Expire and write.
    const activeIndices = activeRef.current;
    const previousIndices = previousActiveRef.current;
    const dirtyIndices = dirtyRef.current;
    activeIndices.clear();
    dirtyIndices.clear();

    for (const [key, flash] of flashes) {
      const intensity = flashIntensity(flash, now);
      if (intensity <= 0) {
        instanceManager.releaseIndex("flashes", key);
        flashes.delete(key);
        continue;
      }

      const index = instanceManager.getIndex("flashes", key);
      if (index === null || index >= capacity) {
        continue;
      }

      const robot = flash.robot;
      const offset = ROBOT_MUZZLE_OFFSETS[robot.role];
      if (flash.kind === "hit") {
        dummy.position.set(
          robot.position.x,
          ROBOT_CENTER_Y + 0.15,
          robot.position.z,
        );
        dummy.scale.setScalar(
          ROBOT_HIT_FLASH_RADIUS[robot.role] * (1 + 0.2 * (1 - intensity)),
        );
        color.copy(HIT_COLOR).multiplyScalar(0.1 + 0.5 * intensity);
      } else {
        const sin = Math.sin(robot.orientation);
        const cos = Math.cos(robot.orientation);
        dummy.position.set(
          robot.position.x + sin * offset.forward,
          ROBOT_CENTER_Y + offset.y,
          robot.position.z + cos * offset.forward,
        );
        dummy.scale.setScalar(0.28 + 0.18 * (1 - intensity));
        color.copy(MUZZLE_COLOR).multiplyScalar(0.5 + 1.5 * intensity);
      }
      dummy.quaternion.copy(camera.quaternion);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      clampHDRColor(color, 1.1);
      mesh.setColorAt(index, color);
      activeIndices.add(index);
      dirtyIndices.add(index);
    }

    forEachInactiveInstance(activeIndices, previousIndices, (index) => {
      applyHiddenInstance(mesh, index, dummy, hiddenColor);
      dirtyIndices.add(index);
    });

    markInstanceBuffersDirty(mesh, { dirtyIndices });
    swapActiveInstanceSets(activeRef, previousActiveRef);
  });

  if (capacity === 0) {
    return null;
  }

  return (
    <instancedMesh
      name="instanced-robot-flashes"
      ref={meshRef}
      args={[geometry, undefined, capacity]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        transparent
        opacity={0.9}
        depthWrite={false}
        toneMapped={false}
        vertexColors
        blending={AdditiveBlending}
      />
    </instancedMesh>
  );
}

function flashIntensity(flash: ActiveFlash, nowMs: number): number {
  if (flash.kind === "hit") {
    return hitFlashIntensity(nowMs, flash.robot.lastDamageTimestamp);
  }
  return muzzleFlashIntensity(flash.robot.fireCooldown, flash.robot.fireRate);
}
