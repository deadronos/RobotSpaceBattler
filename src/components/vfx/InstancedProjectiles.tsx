import { useFrame } from "@react-three/fiber";
import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, InstancedMesh, Object3D, Vector3 } from "three";

import { ProjectileEntity } from "../../ecs/world";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import { VisualInstanceManager } from "../../visuals/VisualInstanceManager";

interface InstancedProjectilesProps {
  projectiles: ProjectileEntity[];
  instanceManager: VisualInstanceManager;
}

function useResizeInstanceCount(
  ref: MutableRefObject<InstancedMesh | null>,
  capacity: number,
) {
  useEffect(() => {
    if (ref.current) {
      ref.current.count = capacity;
    }
  }, [capacity, ref]);
}

/**
 * Renders bullet and rocket projectiles using instanced rendering.
 * Efficiently handles high projectile counts.
 */
export function InstancedProjectiles({
  projectiles,
  instanceManager,
}: InstancedProjectilesProps) {
  const bulletCapacity = instanceManager.getCapacity("bullets");
  const rocketCapacity = instanceManager.getCapacity("rockets");
  const shouldRenderBullets = bulletCapacity > 0;
  const shouldRenderRockets = rocketCapacity > 0;

  const bulletMeshRef = useRef<InstancedMesh | null>(null);
  const rocketMeshRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const velocity = useMemo(() => new Vector3(), []);
  const upVector = useMemo(() => new Vector3(0, 1, 0), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color("#000000"), []);
  const bulletActiveRef = useRef<Set<number>>(new Set());
  const rocketActiveRef = useRef<Set<number>>(new Set());
  const previousBulletActiveRef = useRef<Set<number>>(new Set());
  const previousRocketActiveRef = useRef<Set<number>>(new Set());
  const bulletDirtyRef = useRef<Set<number>>(new Set());
  const rocketDirtyRef = useRef<Set<number>>(new Set());
  const bulletInitStateRef = useRef({ capacity: -1, ready: false });
  const rocketInitStateRef = useRef({ capacity: -1, ready: false });

  useResizeInstanceCount(bulletMeshRef, bulletCapacity);
  useResizeInstanceCount(rocketMeshRef, rocketCapacity);

  useEffect(() => {
    bulletInitStateRef.current = { capacity: bulletCapacity, ready: false };
  }, [bulletCapacity]);

  useEffect(() => {
    rocketInitStateRef.current = { capacity: rocketCapacity, ready: false };
  }, [rocketCapacity]);

  useFrame(() => {
    perfMarkStart("InstancedProjectiles.useFrame");
    const bulletMesh = bulletMeshRef.current;
    const rocketMesh = rocketMeshRef.current;
    if (!bulletMesh && !rocketMesh) {
      perfMarkEnd("InstancedProjectiles.useFrame");
      return;
    }

    const hideAllInstances = (mesh: InstancedMesh, capacity: number) => {
      if (capacity <= 0) {
        return;
      }

      dummy.position.set(0, -512, 0);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();

      for (let index = 0; index < capacity; index += 1) {
        mesh.setMatrixAt(index, dummy.matrix);
        mesh.setColorAt(index, hiddenColor);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    };

    if (
      bulletMesh &&
      bulletInitStateRef.current.ready === false &&
      bulletInitStateRef.current.capacity === bulletCapacity
    ) {
      hideAllInstances(bulletMesh, bulletCapacity);
      bulletInitStateRef.current.ready = true;
    }

    if (
      rocketMesh &&
      rocketInitStateRef.current.ready === false &&
      rocketInitStateRef.current.capacity === rocketCapacity
    ) {
      hideAllInstances(rocketMesh, rocketCapacity);
      rocketInitStateRef.current.ready = true;
    }

    const currentBulletActive = bulletActiveRef.current;
    const currentRocketActive = rocketActiveRef.current;
    const lastBulletActive = previousBulletActiveRef.current;
    const lastRocketActive = previousRocketActiveRef.current;
    const currentBulletDirty = bulletDirtyRef.current;
    const currentRocketDirty = rocketDirtyRef.current;

    currentBulletActive.clear();
    currentRocketActive.clear();
    currentBulletDirty.clear();
    currentRocketDirty.clear();

    for (let i = 0; i < projectiles.length; i += 1) {
      const projectile = projectiles[i];
      if (projectile.weapon === "laser") {
        continue;
      }

      const category = projectile.weapon === "rocket" ? "rockets" : "bullets";
      const mesh = category === "rockets" ? rocketMesh : bulletMesh;
      if (!mesh) {
        continue;
      }

      const capacity = category === "rockets" ? rocketCapacity : bulletCapacity;
      if (capacity === 0) {
        continue;
      }

      const index =
        projectile.instanceIndex ??
        instanceManager.getIndex(category, projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        continue;
      }

      const seen =
        category === "rockets" ? currentRocketActive : currentBulletActive;
      const dirty =
        category === "rockets" ? currentRocketDirty : currentBulletDirty;
      seen.add(index);

      dummy.position.set(
        projectile.position.x,
        projectile.position.y,
        projectile.position.z,
      );
      const scale = Math.max(0.05, projectile.projectileSize ?? 0.14);
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

      if (category === "rockets") {
        const thickness = Math.max(0.08, scale * 0.55);
        dummy.scale.set(thickness, scale * 2.8, thickness);
      } else {
        const length = Math.min(1.4, Math.max(0.35, speed * 0.04));
        const thickness = Math.max(0.06, scale * 0.55);
        dummy.scale.set(thickness, length, thickness);
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      const colorHex =
        projectile.projectileColor ??
        (category === "rockets" ? "#ff955c" : "#ffe08a");
      // Boost intensity so projectiles read well under postprocessing.
      color.set(colorHex).multiplyScalar(category === "rockets" ? 3.0 : 3.6);
      mesh.setColorAt(index, color);

      dirty.add(index);
    }

    if (bulletMesh) {
      for (const index of lastBulletActive) {
        if (!currentBulletActive.has(index)) {
          dummy.position.set(0, -512, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          bulletMesh.setMatrixAt(index, dummy.matrix);
          bulletMesh.setColorAt(index, hiddenColor);
          currentBulletDirty.add(index);
        }
      }

      if (currentBulletDirty.size > 0) {
        bulletMesh.instanceMatrix.needsUpdate = true;
        if (bulletMesh.instanceColor) {
          bulletMesh.instanceColor.needsUpdate = true;
        }
      }
    }

    if (rocketMesh) {
      for (const index of lastRocketActive) {
        if (!currentRocketActive.has(index)) {
          dummy.position.set(0, -512, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          rocketMesh.setMatrixAt(index, dummy.matrix);
          rocketMesh.setColorAt(index, hiddenColor);
          currentRocketDirty.add(index);
        }
      }

      if (currentRocketDirty.size > 0) {
        rocketMesh.instanceMatrix.needsUpdate = true;
        if (rocketMesh.instanceColor) {
          rocketMesh.instanceColor.needsUpdate = true;
        }
      }
    }

    previousBulletActiveRef.current = currentBulletActive;
    bulletActiveRef.current = lastBulletActive;

    previousRocketActiveRef.current = currentRocketActive;
    rocketActiveRef.current = lastRocketActive;

    perfMarkEnd("InstancedProjectiles.useFrame");
  });

  if (!shouldRenderBullets && !shouldRenderRockets) {
    return null;
  }

  return (
    <group>
      {shouldRenderBullets ? (
        <instancedMesh
          ref={bulletMeshRef}
          args={[undefined, undefined, bulletCapacity]}
          frustumCulled={false}
        >
          <cylinderGeometry args={[1, 1, 1, 10]} />
          <meshStandardMaterial
            color="#ffffff"
            toneMapped={false}
            transparent
            opacity={0.95}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      ) : null}
      {shouldRenderRockets ? (
        <instancedMesh
          ref={rocketMeshRef}
          args={[undefined, undefined, rocketCapacity]}
          frustumCulled={false}
        >
          <cylinderGeometry args={[0.8, 1.2, 1, 10]} />
          <meshStandardMaterial
            color="#ffffff"
            toneMapped={false}
            transparent
            opacity={0.95}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </instancedMesh>
      ) : null}
    </group>
  );
}

/**
 * Demo wrapper for testing InstancedProjectiles independently.
 */
export function InstancedProjectilesDemo({
  projectiles,
}: {
  projectiles: ProjectileEntity[];
}) {
  // Simple passthrough demo component for storybook/dev harness compatibility.
  const manager = useMemo(
    () =>
      new VisualInstanceManager({
        maxInstances: { bullets: 64, rockets: 32, lasers: 0, effects: 0 },
      }),
    [],
  );
  return (
    <InstancedProjectiles projectiles={projectiles} instanceManager={manager} />
  );
}
