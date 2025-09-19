import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import { Mesh, Quaternion, Vector3 } from 'three';

import type { Entity } from '../ecs/miniplexStore';
import type { BeamComponent } from '../ecs/weapons';

interface BeamEntity extends Entity {
  beam: BeamComponent;
  render?: unknown;
}

export function Beam({ entity }: { entity: BeamEntity }) {
  const meshRef = useRef<Mesh>(null);
  const origin = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const midpoint = useMemo(() => new Vector3(), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const rotation = useMemo(() => new Quaternion(), []);
  const { invalidate } = useThree();

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      entity.render = mesh as unknown;
    }
    return () => {
      if (entity.render === mesh) {
        entity.render = null;
      }
    };
  }, [entity]);

  useFrame(() => {
    const mesh = meshRef.current;
    const beam = entity.beam;
    if (!mesh || !beam) return;

    origin.set(beam.origin[0], beam.origin[1], beam.origin[2]);
    direction.set(beam.direction[0], beam.direction[1], beam.direction[2]).normalize();

    midpoint.copy(origin).addScaledVector(direction, beam.length / 2);
    mesh.position.copy(midpoint);

    rotation.setFromUnitVectors(up, direction);
    mesh.setRotationFromQuaternion(rotation);

    const width = beam.width ?? 0.1;
    mesh.scale.set(width, beam.length, width);
    
    // Invalidate to ensure beam updates are visible
    invalidate();
  });

  const color = entity.team === 'red' ? '#ff6b6b' : '#6bc6ff';

  return (
    <mesh ref={meshRef} frustumCulled={false} castShadow={false} receiveShadow={false}>
      <cylinderGeometry args={[0.5, 0.5, 1, 12, 1, true]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} transparent opacity={0.6} />
    </mesh>
  );
}
