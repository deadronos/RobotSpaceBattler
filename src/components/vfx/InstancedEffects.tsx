import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';

import { EffectEntity } from '../../ecs/world';
import { VisualInstanceManager } from '../../visuals/VisualInstanceManager';

interface InstancedEffectsProps {
  effects: EffectEntity[];
  instanceManager: VisualInstanceManager;
  currentTimeMs: number;
}

export function InstancedEffects({ effects, instanceManager, currentTimeMs }: InstancedEffectsProps) {
  const capacity = instanceManager.getCapacity('effects');
  const meshRef = useRef<InstancedMesh | null>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color('#000000'), []);
  const seen = useMemo(() => new Set<number>(), []);
  const timeRef = useRef(currentTimeMs);

  useEffect(() => {
    timeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.count = capacity;
    }
  }, [capacity]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    seen.clear();
    const now = timeRef.current;

    effects.forEach((effect) => {
      const index = effect.instanceIndex ?? instanceManager.getIndex('effects', effect.id);
      if (index === null || index === undefined || index >= capacity) {
        return;
      }

      seen.add(index);

      const elapsed = Math.max(0, now - effect.createdAt);
      const progress = effect.duration > 0 ? Math.min(1, elapsed / effect.duration) : 1;
      const baseScale = Math.max(0.1, effect.radius || 0.6);
      const fade = Math.max(0.05, 1 - progress * 0.85);

      dummy.position.set(effect.position.x, effect.position.y, effect.position.z);
      if (effect.effectType === 'explosion') {
        dummy.scale.setScalar(baseScale * (0.6 + 0.6 * progress));
      } else if (effect.effectType === 'laser-impact') {
        dummy.scale.setScalar(baseScale * (0.4 + 0.5 * progress));
      } else {
        dummy.scale.setScalar(baseScale * (0.5 + 0.4 * progress));
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      const tint = effect.secondaryColor ?? effect.color;
      color.set(tint).multiplyScalar(Math.max(0.1, fade));
      mesh.setColorAt(index, color);
    });

    for (let i = 0; i < capacity; i += 1) {
      if (!seen.has(i)) {
        dummy.position.set(0, -512, 0);
        dummy.scale.set(0.001, 0.001, 0.001);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, hiddenColor);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  if (capacity === 0) {
    return null;
  }

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, capacity]} frustumCulled={false}>
      <sphereGeometry args={[0.9, 16, 16]} />
      <meshStandardMaterial
        vertexColors
        emissiveIntensity={1.0}
        transparent
        opacity={0.85}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
