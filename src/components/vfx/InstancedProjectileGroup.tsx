import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferGeometry, Color, InstancedMesh, Object3D, Vector3 } from "three";

import { ProjectileEntity } from "../../ecs/world";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import {
  applyHiddenInstance,
  markInstanceBuffersDirty,
  normalizeHDRForInstance,
} from "../../visuals/instanceColorUtils";
import { VisualInstanceManager } from "../../visuals/VisualInstanceManager";
import {
  ensureInstancedMeshReady,
  forEachInactiveInstance,
  swapActiveInstanceSets,
  useInstancedMeshLifecycle,
} from "./useInstancedMeshLifecycle";

export interface InstancedProjectileGroupProps {
  projectiles: ProjectileEntity[];
  instanceManager: VisualInstanceManager;
  category: "bullets" | "rockets";
  geometry: BufferGeometry;
  baseColorHex: string;
  intensity: number;
  updateInstance: (
    projectile: ProjectileEntity,
    dummy: Object3D,
    speed: number
  ) => void;
  isMatch: (projectile: ProjectileEntity) => boolean;
}

export function InstancedProjectileGroup({
  projectiles,
  instanceManager,
  category,
  geometry,
  baseColorHex,
  intensity,
  updateInstance,
  isMatch,
}: InstancedProjectileGroupProps) {
  const capacity = instanceManager.getCapacity(category);
  const { meshRef, activeRef, previousActiveRef, dirtyRef, initStateRef } =
    useInstancedMeshLifecycle(capacity);

  // Expose refs for end-to-end debug inspection (Playwright / devtools)
  useEffect(() => {
    // Avoid using `any` in lint rules while still allowing debug plumbing.
    const win = window as unknown as {
      __instancedRefs?: Record<string, InstancedMesh | null>;
    };
    win.__instancedRefs = win.__instancedRefs || {};
    win.__instancedRefs[category] = meshRef.current;
  }, [category, meshRef]);

  const dummy = useMemo(() => new Object3D(), []);
  const velocity = useMemo(() => new Vector3(), []);
  const upVector = useMemo(() => new Vector3(0, 1, 0), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color("#000000"), []);

  useFrame(() => {
    perfMarkStart(`InstancedProjectileGroup.${category}`);
    const mesh = meshRef.current;
    if (!mesh || capacity === 0) {
      perfMarkEnd(`InstancedProjectileGroup.${category}`);
      return;
    }

    // Safety check in case layout effect missed it or context was lost.
    ensureInstancedMeshReady(mesh, capacity, initStateRef);

    const currentActive = activeRef.current;
    const lastActive = previousActiveRef.current;
    const currentDirty = dirtyRef.current;

    currentActive.clear();
    currentDirty.clear();

    let matrixDirty = false;
    let colorsDirty = false;

    for (let i = 0; i < projectiles.length; i += 1) {
      const projectile = projectiles[i];
      if (!isMatch(projectile)) {
        continue;
      }

      const index =
        projectile.instanceIndex ??
        instanceManager.getIndex(category, projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        continue;
      }

      currentActive.add(index);

      dummy.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z,
      );
      velocity.set(
        projectile.velocity.x,
        projectile.velocity.y,
        projectile.velocity.z,
      );
      const speed = velocity.length();

      if (speed > 1e-6) {
        velocity.normalize();
        dummy.quaternion.setFromUnitVectors(upVector, velocity);
      } else {
        dummy.quaternion.identity();
      }

      updateInstance(projectile, dummy, speed);

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      matrixDirty = true;

      const colorHex = projectile.projectileColor ?? baseColorHex;
      // Boost intensity so projectiles read well under postprocessing.
      color.set(colorHex).multiplyScalar(intensity);
      // Normalize HDR values for display: clamp peaks + Reinhard tone mapping.
      normalizeHDRForInstance(color, { exposure: 1.0, maxChannel: 3.0 });
      mesh.setColorAt(index, color);
      colorsDirty = true;

      currentDirty.add(index);
    }

    // Handle deactivation
    forEachInactiveInstance(currentActive, lastActive, (index) => {
      applyHiddenInstance(mesh, index, dummy, hiddenColor);
      currentDirty.add(index);
      matrixDirty = true;
      colorsDirty = true;
    });

    markInstanceBuffersDirty(mesh, {
      matrix: matrixDirty,
      color: colorsDirty,
      dirtyIndices: currentDirty,
    });

    swapActiveInstanceSets(activeRef, previousActiveRef);

    perfMarkEnd(`InstancedProjectileGroup.${category}`);
  });

  if (capacity <= 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
      name={`instanced-${category}`}
    >
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial
        color="#ffffff"
        toneMapped={false}
        transparent
        opacity={0.95}
        blending={AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </instancedMesh>
  );
}
