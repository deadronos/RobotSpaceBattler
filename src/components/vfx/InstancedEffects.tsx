import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D, SphereGeometry } from "three";

import { EffectEntity } from "../../ecs/world";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import {
  applyHiddenInstance,
  clampHDRColor,
  ensureGeometryHasVertexColors,
  markInstanceBuffersDirty,
} from "../../visuals/instanceColorUtils";
import { VisualInstanceManager } from "../../visuals/VisualInstanceManager";
import {
  ensureInstancedMeshReady,
  forEachInactiveInstance,
  swapActiveInstanceSets,
  useInstancedMeshLifecycle,
} from "./useInstancedMeshLifecycle";

interface InstancedEffectsProps {
  effects: EffectEntity[];
  instanceManager: VisualInstanceManager;
  currentTimeMs: number;
}

/**
 * Renders multiple visual effects using hardware instancing for performance.
 * Optimized for high-volume effects like particles and explosions.
 */
export function InstancedEffects({
  effects,
  instanceManager,
  currentTimeMs,
}: InstancedEffectsProps) {
  const capacity = instanceManager.getCapacity("effects");
  const { meshRef, activeRef, previousActiveRef, dirtyRef, initStateRef } =
    useInstancedMeshLifecycle(capacity);
  const dummy = useMemo(() => new Object3D(), []);
  const sphereGeometry = useMemo(() => {
    const geometry = new SphereGeometry(0.9, 16, 16);
    ensureGeometryHasVertexColors(geometry);
    return geometry;
  }, []);

  useEffect(() => {
    return () => {
      sphereGeometry.dispose();
    };
  }, [sphereGeometry]);

  useEffect(() => {
    const win = (window as unknown) as { __instancedRefs?: Record<string, InstancedMesh | null> };
    win.__instancedRefs = win.__instancedRefs || {};
    win.__instancedRefs.effects = meshRef.current;
  }, [meshRef]);
  const color = useMemo(() => new Color(), []);
  const hiddenColor = useMemo(() => new Color("#000000"), []);
  const timeRef = useRef(currentTimeMs);

  useEffect(() => {
    timeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  useFrame(() => {
    perfMarkStart("InstancedEffects.useFrame");
    const mesh = meshRef.current;
    if (!mesh) {
      perfMarkEnd("InstancedEffects.useFrame");
      return;
    }

    ensureInstancedMeshReady(mesh, capacity, initStateRef);

    const activeIndices = activeRef.current;
    const previousIndices = previousActiveRef.current;
    const dirtyIndices = dirtyRef.current;

    activeIndices.clear();
    dirtyIndices.clear();
    const now = timeRef.current;

    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      const index =
        effect.instanceIndex ?? instanceManager.getIndex("effects", effect.id);
      if (index === null || index === undefined || index >= capacity) {
        continue;
      }

      activeIndices.add(index);

      const elapsed = Math.max(0, now - effect.createdAt);
      const progress =
        effect.duration > 0 ? Math.min(1, elapsed / effect.duration) : 1;
      const baseScale = Math.max(0.1, effect.radius || 0.6);
      const fade = Math.max(0.05, 1 - progress * 0.85);

      dummy.position.set(
        effect.position.x,
        effect.position.y,
        effect.position.z,
      );
      if (effect.effectType === "explosion") {
        dummy.scale.setScalar(baseScale * (0.6 + 0.6 * progress));
      } else if (effect.effectType === "laser-impact") {
        dummy.scale.setScalar(baseScale * (0.4 + 0.5 * progress));
      } else {
        dummy.scale.setScalar(baseScale * (0.5 + 0.4 * progress));
      }

      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);

      const tint = effect.secondaryColor ?? effect.color;
      color.set(tint).multiplyScalar(Math.max(0.1, fade));
      clampHDRColor(color, 2.0);
      mesh.setColorAt(index, color);

      dirtyIndices.add(index);
    }

    forEachInactiveInstance(activeIndices, previousIndices, (index) => {
      applyHiddenInstance(mesh, index, dummy, hiddenColor);
      dirtyIndices.add(index);
    });

    markInstanceBuffersDirty(mesh, { dirtyIndices });
    swapActiveInstanceSets(activeRef, previousActiveRef);

    perfMarkEnd("InstancedEffects.useFrame");
  });

  if (capacity === 0) {
    return null;
  }

  return (
    <instancedMesh
      name="instanced-effects"
      ref={meshRef}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
    >
      <primitive object={sphereGeometry} attach="geometry" />
      <meshBasicMaterial
        transparent
        opacity={0.85}
        toneMapped={false}
        vertexColors
      />
    </instancedMesh>
  );
}
