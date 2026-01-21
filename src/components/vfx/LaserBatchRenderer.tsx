import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";

import { ProjectileEntity, RobotEntity } from "../../ecs/world";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import {
  applyHiddenInstanceMatrix,
  ensureGeometryHasVertexColors,
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

interface LaserBatchRendererProps {
  projectiles: ProjectileEntity[];
  robotsById: Map<string, RobotEntity>;
  instanceManager: VisualInstanceManager;
}

/**
 * Renders multiple laser beams in a single draw call using Three.js LineSegments.
 * Optimized for performance by reusing geometry buffers.
 */
export function LaserBatchRenderer({
  projectiles,
  robotsById,
  instanceManager,
}: LaserBatchRendererProps) {
  const capacity = instanceManager.getCapacity("lasers");
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color(0x000000), []);
  const dummyStart = useMemo(() => new Vector3(), []);
  const dummyEnd = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const midpoint = useMemo(() => new Vector3(), []);
  const scale = useMemo(() => new Vector3(), []);
  const tempMatrix = useMemo(() => new Matrix4(), []);
  const tempQuaternion = useMemo(() => new Quaternion(), []);
  const yAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const tempVelocity = useMemo(() => new Vector3(), []);
  const { meshRef, activeRef, previousActiveRef, initStateRef } =
    useInstancedMeshLifecycle(capacity);

  const laserGeometry = useMemo(() => {
    const geometry = new CylinderGeometry(1, 1, 1, 10);
    ensureGeometryHasVertexColors(geometry);
    return geometry;
  }, []);

  useEffect(() => {
    return () => {
      laserGeometry.dispose();
    };
  }, [laserGeometry]);

  useEffect(() => {
    const win = (window as unknown) as { __instancedRefs?: Record<string, InstancedMesh | null> };
    win.__instancedRefs = win.__instancedRefs || {};
    win.__instancedRefs.lasers = meshRef.current;
  }, [meshRef]);
  const material = useMemo(
    () => ({
      color: "#ffffff",
      toneMapped: false,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      vertexColors: true,
    }),
    [],
  );

  useFrame(() => {
    perfMarkStart("LaserBatchRenderer.useFrame");
    const mesh = meshRef.current;
    if (!mesh) {
      perfMarkEnd("LaserBatchRenderer.useFrame");
      return;
    }

    if (capacity <= 0) {
      perfMarkEnd("LaserBatchRenderer.useFrame");
      return;
    }

    // Ensure slots are hidden/offscreen if initialization was missed.
    ensureInstancedMeshReady(mesh, capacity, initStateRef);

    const activeIndices = activeRef.current;
    const previousIndices = previousActiveRef.current;
    activeIndices.clear();
    let matricesDirty = false;
    let colorsDirty = false;

    for (let i = 0; i < projectiles.length; i += 1) {
      const projectile = projectiles[i];
      if (projectile.weapon !== "laser" || capacity === 0) {
        continue;
      }

      const index =
        projectile.instanceIndex ??
        instanceManager.getIndex("lasers", projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        continue;
      }

      activeIndices.add(index);

      const shooter = robotsById.get(projectile.shooterId);
      const target = projectile.targetId
        ? robotsById.get(projectile.targetId)
        : undefined;

      if (shooter) {
        dummyStart.set(
          shooter.position.x,
          shooter.position.y + 0.8,
          shooter.position.z,
        );
      } else {
        dummyStart.set(
          projectile.position.x,
          projectile.position.y,
          projectile.position.z,
        );
      }

      if (target) {
        dummyEnd.set(
          target.position.x,
          target.position.y + 0.8,
          target.position.z,
        );
      } else {
        tempVelocity.set(
          projectile.velocity.x,
          projectile.velocity.y,
          projectile.velocity.z,
        );
        if (tempVelocity.lengthSq() > 1e-6) {
          tempVelocity.normalize().multiplyScalar(3);
        }
        dummyEnd.copy(dummyStart).add(tempVelocity);
      }

      direction.copy(dummyEnd).sub(dummyStart);
      const length = direction.length();
      if (length <= 1e-4) {
        continue;
      }
      direction.normalize();

      midpoint.copy(dummyStart).add(dummyEnd).multiplyScalar(0.5);
      tempQuaternion.setFromUnitVectors(yAxis, direction);

      const beamWidth = projectile.beamWidth ?? 0.08;
      const thickness = Math.max(0.02, beamWidth) * 0.55;
      scale.set(thickness, length, thickness);
      tempMatrix.compose(midpoint, tempQuaternion, scale);
      mesh.setMatrixAt(index, tempMatrix);
      matricesDirty = true;

      const beamColor = projectile.projectileColor ?? "#7fffd4";
      color.set(beamColor).multiplyScalar(2.2);
      normalizeHDRForInstance(color, { exposure: 1.0, maxChannel: 3.0 });
      mesh.setColorAt(index, color);
      colorsDirty = true;

    }

    forEachInactiveInstance(activeIndices, previousIndices, (index) => {
      applyHiddenInstanceMatrix(
        mesh,
        index,
        tempMatrix,
        dummyStart,
        tempQuaternion,
        scale,
        hiddenColor,
      );
      matricesDirty = true;
      colorsDirty = true;
    });

    markInstanceBuffersDirty(mesh, {
      matrix: matricesDirty,
      color: colorsDirty,
    });

    swapActiveInstanceSets(activeRef, previousActiveRef);

    perfMarkEnd("LaserBatchRenderer.useFrame");
  });

  if (capacity === 0) {
    return null;
  }

  return (
    <instancedMesh
      name="instanced-lasers"
      ref={meshRef}
      args={[undefined as never, undefined as never, capacity]}
      frustumCulled={false}
    >
      <primitive object={laserGeometry} attach="geometry" />
      <meshBasicMaterial {...material} />
    </instancedMesh>
  );
}
