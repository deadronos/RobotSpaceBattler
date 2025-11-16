import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';

import { ProjectileEntity, RobotEntity } from '../../ecs/world';
import { perfMarkEnd, perfMarkStart } from '../../lib/perf';
import { VisualInstanceManager } from '../../visuals/VisualInstanceManager';

interface LaserBatchRendererProps {
  projectiles: ProjectileEntity[];
  robotsById: Map<string, RobotEntity>;
  instanceManager: VisualInstanceManager;
}

export function LaserBatchRenderer({ projectiles, robotsById, instanceManager }: LaserBatchRendererProps) {
  const capacity = instanceManager.getCapacity('lasers');
  const geometry = useMemo(() => new BufferGeometry(), []);
  const material = useMemo(
    () =>
      new LineBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        transparent: true,
        opacity: 0.92,
      }),
    [],
  );
  const positions = useMemo(() => new Float32Array(Math.max(1, capacity) * 6), [capacity]);
  const colors = useMemo(() => new Float32Array(Math.max(1, capacity) * 6), [capacity]);
  const color = useMemo(() => new Color(), []);
  const dummyStart = useMemo(() => new Vector3(), []);
  const dummyEnd = useMemo(() => new Vector3(), []);
  const tempVelocity = useMemo(() => new Vector3(), []);
  const activeIndicesRef = useRef<Set<number>>(new Set());
  const previousIndicesRef = useRef<Set<number>>(new Set());
  const lineRef = useRef<LineSegments | null>(null);

  useEffect(() => {
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.setDrawRange(0, Math.max(1, capacity) * 2);
    return () => {
      geometry.dispose();
    };
  }, [geometry, positions, colors, capacity]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(() => {
    perfMarkStart('LaserBatchRenderer.useFrame');
    const line = lineRef.current;
    if (!line) {
      perfMarkEnd('LaserBatchRenderer.useFrame');
      return;
    }

    const positionAttr = geometry.getAttribute('position');
    const colorAttr = geometry.getAttribute('color');
    if (!positionAttr || !colorAttr) {
      perfMarkEnd('LaserBatchRenderer.useFrame');
      return;
    }

    const activeIndices = activeIndicesRef.current;
    const previousIndices = previousIndicesRef.current;
    activeIndices.clear();
    let positionsDirty = false;
    let colorsDirty = false;

    projectiles.forEach((projectile) => {
      if (projectile.weapon !== 'laser') {
        return;
      }

      if (capacity === 0) {
        return;
      }

      const index = projectile.instanceIndex ?? instanceManager.getIndex('lasers', projectile.id);
      if (index === null || index === undefined || index >= capacity) {
        return;
      }

      activeIndices.add(index);

      const shooter = robotsById.get(projectile.shooterId);
      const target = projectile.targetId ? robotsById.get(projectile.targetId) : undefined;

      if (shooter) {
        dummyStart.set(shooter.position.x, shooter.position.y + 0.8, shooter.position.z);
      } else {
        dummyStart.set(projectile.position.x, projectile.position.y, projectile.position.z);
      }

      if (target) {
        dummyEnd.set(target.position.x, target.position.y + 0.8, target.position.z);
      } else {
        tempVelocity.set(projectile.velocity.x, projectile.velocity.y, projectile.velocity.z);
        if (tempVelocity.lengthSq() > 1e-6) {
          tempVelocity.normalize().multiplyScalar(3);
        }
        dummyEnd.copy(dummyStart).add(tempVelocity);
      }

      const offset = index * 6;
      positions[offset] = dummyStart.x;
      positions[offset + 1] = dummyStart.y;
      positions[offset + 2] = dummyStart.z;
      positions[offset + 3] = dummyEnd.x;
      positions[offset + 4] = dummyEnd.y;
      positions[offset + 5] = dummyEnd.z;

      const beamColor = projectile.projectileColor ?? '#7fffd4';
      color.set(beamColor);
      color.toArray(colors, offset);
      color.multiplyScalar(0.7).toArray(colors, offset + 3);
      positionsDirty = true;
      colorsDirty = true;
    });

    const hidden = -512;
    previousIndices.forEach((index) => {
      if (!activeIndices.has(index)) {
        const offset = index * 6;
        positions[offset] = hidden;
        positions[offset + 1] = hidden;
        positions[offset + 2] = hidden;
        positions[offset + 3] = hidden;
        positions[offset + 4] = hidden;
        positions[offset + 5] = hidden;
        colors[offset] = 0;
        colors[offset + 1] = 0;
        colors[offset + 2] = 0;
        colors[offset + 3] = 0;
        colors[offset + 4] = 0;
        colors[offset + 5] = 0;
        positionsDirty = true;
        colorsDirty = true;
      }
    });

    if (positionsDirty) {
      positionAttr.needsUpdate = true;
    }
    if (colorsDirty) {
      colorAttr.needsUpdate = true;
    }

    previousIndicesRef.current = activeIndices;
    activeIndicesRef.current = previousIndices;

    perfMarkEnd('LaserBatchRenderer.useFrame');
  });

  if (capacity === 0) {
    return null;
  }

  return <lineSegments ref={lineRef} args={[geometry, material]} frustumCulled={false} />;
}
