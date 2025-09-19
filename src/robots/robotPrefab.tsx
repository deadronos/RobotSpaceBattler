import { CuboidCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useRef } from 'react';

import type { Entity } from '../ecs/miniplexStore';

export function Robot({ entity }: { entity: Entity }) {
  const rbRef = useRef<unknown>(null);
  const colliderRef = useRef<unknown>(null);

  useEffect(() => {
    // Expose rigid API to systems via ECS entity
    entity.rigid = rbRef.current;
    try {
      if (rbRef.current && typeof rbRef.current === 'object') {
        try {
          (rbRef.current as Record<string, unknown>)['__entityId'] = entity.id;
        } catch {
          /* ignore */
        }
      }
      if (colliderRef.current && typeof colliderRef.current === 'object') {
        try {
          (colliderRef.current as Record<string, unknown>)['userData'] = { id: entity.id };
          (colliderRef.current as Record<string, unknown>)['entityId'] = entity.id;
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* defensive */
    }
    return () => {
      if (entity) entity.rigid = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RigidBody
      ref={(r) => {
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
      <CuboidCollider
        ref={(c) => {
          colliderRef.current = c as unknown;
        }}
        args={[0.4, 0.6, 0.4]}
      />
    </RigidBody>
  );
}
