import { useFrame } from '@react-three/fiber';
import { BallCollider, RigidBody, type RigidBodyApi } from '@react-three/rapier';
import React, { useEffect, useRef } from 'react';
import type { Mesh } from 'three';

import type { Entity } from '../ecs/miniplexStore';
import type { ProjectileComponent } from '../ecs/weapons';

interface ProjectileEntity extends Entity {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
}

export function Projectile({ entity }: { entity: ProjectileEntity }) {
  const bodyRef = useRef<RigidBodyApi | null>(null);
  const meshRef = useRef<Mesh>(null);

  useEffect(() => {
    const body = bodyRef.current;
    const mesh = meshRef.current;

    if (body) {
      entity.rigid = body as unknown;
    }
    if (mesh) {
      entity.render = mesh as unknown;
    }

    return () => {
      if (entity.rigid === body) {
        entity.rigid = null;
      }
      if (entity.render === mesh) {
        entity.render = null;
      }
    };
  }, [entity]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !entity.velocity) return;
    const [vx, vy, vz] = entity.velocity;
    body.setLinvel({ x: vx, y: vy, z: vz }, true);
  }, [entity]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const translation = body.translation();
    if (entity.position) {
      entity.position[0] = translation.x;
      entity.position[1] = translation.y;
      entity.position[2] = translation.z;
    }

    if (entity.velocity) {
      const [vx, vy, vz] = entity.velocity;
      const current = body.linvel();
      if (
        Math.abs(current.x - vx) > 0.0001 ||
        Math.abs(current.y - vy) > 0.0001 ||
        Math.abs(current.z - vz) > 0.0001
      ) {
        body.setLinvel({ x: vx, y: vy, z: vz }, true);
      }
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders={false}
      ccd
      linearDamping={0}
      angularDamping={0}
      gravityScale={0}
      canSleep={false}
      position={entity.position as unknown as [number, number, number]}
    >
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={entity.team === 'red' ? '#ff7f50' : '#7fbfff'}
          emissive={entity.team === 'red' ? '#ff9966' : '#7fbfff'}
          emissiveIntensity={0.6}
        />
      </mesh>
      <BallCollider args={[0.2]} />
    </RigidBody>
  );
}
