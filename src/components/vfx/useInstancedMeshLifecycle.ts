import { MutableRefObject, useLayoutEffect, useRef } from "react";
import { InstancedMesh, Material } from "three";
import { hideAllInstances } from "../../visuals/instanceColorUtils";

export function markMaterialNeedsUpdate(material: Material | Material[]) {
  if (Array.isArray(material)) {
    for (let i = 0; i < material.length; i += 1) {
      material[i].needsUpdate = true;
    }
    return;
  }
  material.needsUpdate = true;
}

function useResizeInstanceCount(
  ref: MutableRefObject<InstancedMesh | null>,
  capacity: number,
) {
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.count = capacity;
    }
  }, [capacity, ref]);
}

export function useInstancedMeshLifecycle(capacity: number) {
  const meshRef = useRef<InstancedMesh | null>(null);
  const activeRef = useRef<Set<number>>(new Set());
  const previousActiveRef = useRef<Set<number>>(new Set());
  const dirtyRef = useRef<Set<number>>(new Set());
  const initStateRef = useRef({ capacity: -1, ready: false });

  useResizeInstanceCount(meshRef, capacity);

  useLayoutEffect(() => {
    initStateRef.current = { capacity, ready: false };
  }, [capacity]);

  // Initial hiding when capacity changes
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || capacity <= 0) return;

    const hadInstanceColor = Boolean(mesh.instanceColor);
    hideAllInstances(mesh, capacity);
    initStateRef.current = { capacity, ready: true };

    if (!hadInstanceColor && mesh.instanceColor) {
      markMaterialNeedsUpdate(mesh.material);
    }
  }, [capacity]);

  return {
    meshRef,
    activeRef,
    previousActiveRef,
    dirtyRef,
    initStateRef,
  };
}
