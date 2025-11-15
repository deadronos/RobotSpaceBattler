import { useFrame } from '@react-three/fiber';
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D, Vector3 } from 'three';

import { ProjectileEntity } from '../../ecs/world';
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

  if (bulletCapacity === 0 && rocketCapacity === 0) {
    return null;
  }

  const bulletMeshRef = useRef<InstancedMesh | null>(null);
  const rocketMeshRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const velocity = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color('#000000'), []);
  const bulletSeen = useMemo(() => new Set<number>(), []);
  const rocketSeen = useMemo(() => new Set<number>(), []);

  useResizeInstanceCount(bulletMeshRef, bulletCapacity);
  useResizeInstanceCount(rocketMeshRef, rocketCapacity);

  useFrame(() => {
    const bulletMesh = bulletMeshRef.current;
    const rocketMesh = rocketMeshRef.current;
    if (!bulletMesh && !rocketMesh) {
      return;
    }

    bulletSeen.clear();
    rocketSeen.clear();

    projectiles.forEach((projectile) => {
      if (projectile.weapon === 'laser') {
        return;
      }

      const category = projectile.weapon === 'rocket' ? 'rockets' : 'bullets';
      const mesh = category === 'rockets' ? rocketMesh : bulletMesh;
      if (!mesh) {
        return;
      }

      const capacity = category === 'rockets' ? rocketCapacity : bulletCapacity;
      if (capacity === 0) {
        return;
      }

      const index = projectile.instanceIndex ?? instanceManager.getIndex(category, projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        return;
      }

      const seen = category === 'rockets' ? rocketSeen : bulletSeen;
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
    });

    if (bulletMesh) {
      for (let i = 0; i < bulletCapacity; i += 1) {
        if (!bulletSeen.has(i)) {
          dummy.position.set(0, -512, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          bulletMesh.setMatrixAt(i, dummy.matrix);
          bulletMesh.setColorAt(i, hiddenColor);
        }
      }
      bulletMesh.instanceMatrix.needsUpdate = true;
      if (bulletMesh.instanceColor) {
        bulletMesh.instanceColor.needsUpdate = true;
      }
    }

    if (rocketMesh) {
      for (let i = 0; i < rocketCapacity; i += 1) {
        if (!rocketSeen.has(i)) {
          dummy.position.set(0, -512, 0);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(0.001, 0.001, 0.001);
          dummy.updateMatrix();
          rocketMesh.setMatrixAt(i, dummy.matrix);
          rocketMesh.setColorAt(i, hiddenColor);
        }
      }
      rocketMesh.instanceMatrix.needsUpdate = true;
      if (rocketMesh.instanceColor) {
        rocketMesh.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {bulletCapacity > 0 ? (
        <instancedMesh ref={bulletMeshRef} args={[undefined, undefined, bulletCapacity]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial vertexColors emissiveIntensity={1.05} toneMapped={false} />
        </instancedMesh>
      ) : null}
      {rocketCapacity > 0 ? (
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
