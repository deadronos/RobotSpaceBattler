import { useFrame } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';

import { ProjectileEntity } from '../../ecs/world';
import { perfMarkEnd, perfMarkStart } from '../../lib/perf';
import { VisualInstanceManager } from '../../visuals/VisualInstanceManager';

interface InstancedProjectilesProps {
  projectiles: ProjectileEntity[];
  instanceManager: VisualInstanceManager;
}

function useResizeInstanceCount(ref: MutableRefObject<InstancedMesh | null>, capacity: number) {
  useEffect(() => {
    if (ref.current) {
      ref.current.count = capacity;
    }
  }, [capacity, ref]);
}

export function InstancedProjectiles({ projectiles, instanceManager }: InstancedProjectilesProps) {
  const bulletCapacity = instanceManager.getCapacity('bullets');
  const rocketCapacity = instanceManager.getCapacity('rockets');
  const shouldRenderBullets = bulletCapacity > 0;
  const shouldRenderRockets = rocketCapacity > 0;

  const bulletMeshRef = useRef<InstancedMesh | null>(null);
  const rocketMeshRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const velocity = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color('#000000'), []);
  const bulletActiveRef = useRef<Set<number>>(new Set());
  const rocketActiveRef = useRef<Set<number>>(new Set());
  const previousBulletActiveRef = useRef<Set<number>>(new Set());
  const previousRocketActiveRef = useRef<Set<number>>(new Set());
  const bulletDirtyRef = useRef<Set<number>>(new Set());
  const rocketDirtyRef = useRef<Set<number>>(new Set());

  useResizeInstanceCount(bulletMeshRef, bulletCapacity);
  useResizeInstanceCount(rocketMeshRef, rocketCapacity);

  useFrame(() => {
    perfMarkStart('InstancedProjectiles.useFrame');
    const bulletMesh = bulletMeshRef.current;
    const rocketMesh = rocketMeshRef.current;
    if (!bulletMesh && !rocketMesh) {
      perfMarkEnd('InstancedProjectiles.useFrame');
      return;
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
      if (projectile.weapon === 'laser') {
        continue;
      }

      const category = projectile.weapon === 'rocket' ? 'rockets' : 'bullets';
      const mesh = category === 'rockets' ? rocketMesh : bulletMesh;
      if (!mesh) {
        continue;
      }

      const capacity = category === 'rockets' ? rocketCapacity : bulletCapacity;
      if (capacity === 0) {
        continue;
      }

      const index = projectile.instanceIndex ?? instanceManager.getIndex(category, projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        continue;
      }

      const seen = category === 'rockets' ? currentRocketActive : currentBulletActive;
      const dirty = category === 'rockets' ? currentRocketDirty : currentBulletDirty;
      seen.add(index);

      dummy.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
      const scale = Math.max(0.05, projectile.projectileSize ?? 0.14);
      if (category === 'rockets') {
        velocity.set(projectile.velocity.x, projectile.velocity.y, projectile.velocity.z);
        if (velocity.lengthSq() > 1e-6) {
          lookTarget.copy(dummy.position).add(velocity);
          dummy.lookAt(lookTarget);
        }
        dummy.scale.set(scale * 0.6, scale * 0.6, scale * 2.8);
      } else {
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(scale * 0.6, scale * 0.6, scale * 0.6);
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      const colorHex = projectile.projectileColor ?? (category === 'rockets' ? '#ff955c' : '#ffe08a');
      color.set(colorHex);
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

    perfMarkEnd('InstancedProjectiles.useFrame');
  });

  if (!shouldRenderBullets && !shouldRenderRockets) {
    return null;
  }

  return (
    <group>
      {shouldRenderBullets ? (
        <instancedMesh ref={bulletMeshRef} args={[undefined, undefined, bulletCapacity]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial vertexColors emissiveIntensity={1.05} toneMapped={false} />
        </instancedMesh>
      ) : null}
      {shouldRenderRockets ? (
        <instancedMesh ref={rocketMeshRef} args={[undefined, undefined, rocketCapacity]}>
          <cylinderGeometry args={[0.08, 0.12, 0.9, 10]} />
          <meshStandardMaterial vertexColors emissiveIntensity={1.1} toneMapped={false} />
        </instancedMesh>
      ) : null}
    </group>
  );
}

export function InstancedProjectilesDemo({ projectiles }: { projectiles: ProjectileEntity[] }) {
  // Simple passthrough demo component for storybook/dev harness compatibility.
  const manager = useMemo(
    () =>
      new VisualInstanceManager({
        maxInstances: { bullets: 64, rockets: 32, lasers: 0, effects: 0 },
      }),
    [],
  );
  return <InstancedProjectiles projectiles={projectiles} instanceManager={manager} />;
}
