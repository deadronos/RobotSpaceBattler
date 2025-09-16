import { CuboidCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useRef } from 'react';

import type { Entity } from '../ecs/miniplexStore';

export function Robot({ entity }: { entity: Entity }) {
  const rbRef = useRef<unknown>(null);
  const colliderRef = useRef<unknown>(null);

  useEffect(() => {
    // Attach rigid body api to entity for systems to use
    entity.rigid = rbRef.current;
    // Also attach entity id to the rigid and collider wrappers where possible so
    // Rapier raycast hits can be mapped back to entity ids via collider.userData or entityId.
    try {
      if (rbRef.current && typeof rbRef.current === 'object') {
        try {
          (rbRef.current as Record<string, unknown>)['__entityId'] = entity.id;
        } catch {
          // ignore
        }
      }
      if (colliderRef.current && typeof colliderRef.current === 'object') {
        try {
          // Some Rapier wrapper hit results include collider.userData; set it here.
          (colliderRef.current as Record<string, unknown>)['userData'] = { id: entity.id };
          // Also set entityId directly if wrapper exposes it
          (colliderRef.current as Record<string, unknown>)['entityId'] = entity.id;
        } catch {
          // ignore any non-writable shapes
        }
      }
    } catch {
      // defensive
    }
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
      <CuboidCollider ref={(c) => { colliderRef.current = c as unknown; }} args={[0.4, 0.6, 0.4]} />
    </RigidBody>
  );
}
