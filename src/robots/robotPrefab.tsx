import { CuboidCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useRef } from 'react';

import type { Entity } from '../ecs/miniplexStore';

export function Robot({ entity }: { entity: Entity }) {
  const rbRef = useRef<unknown>(null);

  useEffect(() => {
    // Attach rigid body api to entity for systems to use
    entity.rigid = rbRef.current;
    return () => {
      if (entity) {
        entity.rigid = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RigidBody
      ref={(r) => {
        // store in ref and on entity
        rbRef.current = r as unknown;
      }}
      position={entity.position as unknown as [number, number, number]}
      colliders={false}
      canSleep={false}
    >
      <mesh castShadow>
        <boxGeometry args={[0.8, 1.2, 0.8]} />
        <meshStandardMaterial color={entity.team === 'red' ? '#b04646' : '#4976d1'} />
      </mesh>
      <CuboidCollider args={[0.4, 0.6, 0.4]} />
    </RigidBody>
  );
}
