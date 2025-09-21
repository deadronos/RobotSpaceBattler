import { useFrame } from "@react-three/fiber";
import { BallCollider, RigidBody } from "@react-three/rapier";
import React, { useCallback, useEffect, useRef } from "react";
import { Mesh, Quaternion, Vector3 } from "three";

import type { Entity } from "../ecs/miniplexStore";
import type { ProjectileComponent } from "../ecs/weapons";

type RigidBodyHandle = {
  translation?: () => { x: number; y: number; z: number };
  linvel?: () => { x: number; y: number; z: number };
  setLinvel?: (
    velocity: { x: number; y: number; z: number },
    wake: boolean,
  ) => void;
};

interface ProjectileEntity extends Entity {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
  render?: unknown;
}

export function Projectile({ entity }: { entity: ProjectileEntity }) {
  const bodyRef = useRef<RigidBodyHandle | null>(null);
  const meshRef = useRef<Mesh>(null);
  const streakRef = useRef<Mesh>(null);
  // Reusable math objects
  const up = useRef(new Vector3(0, 1, 0));
  const dir = useRef(new Vector3());
  const rot = useRef(new Quaternion());
  const offset = useRef(new Vector3());

  const setBodyRef = useCallback(
    (body: RigidBodyHandle | null) => {
      bodyRef.current = body;
      entity.rigid = body as unknown;
    },
    [entity],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      entity.render = mesh as unknown;
    }
    return () => {
      if (entity.render === mesh) {
        entity.render = null;
      }
      if (entity.rigid === bodyRef.current) {
        entity.rigid = null;
      }
    };
  }, [entity]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body || !entity.velocity) return;
    const [vx, vy, vz] = entity.velocity;
    body.setLinvel?.({ x: vx, y: vy, z: vz }, true);
  }, [entity]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    const translation = body.translation?.();
    if (translation) {
      entity.position = [translation.x, translation.y, translation.z];
    }

    if (entity.velocity && body.linvel && body.setLinvel) {
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

    // Update inexpensive instantaneous motion streak (thin cylinder)
    const streak = streakRef.current;
    if (streak && entity.velocity) {
      const [vx, vy, vz] = entity.velocity;
      dir.current.set(vx, vy, vz);
      const speed = dir.current.length();
      if (speed > 0.05) {
        dir.current.normalize();
        // streak length scales with speed, clamped
        const length = Math.min(2.0, Math.max(0.25, speed * 0.03));
        // rotate from Y-up to velocity direction
        rot.current.setFromUnitVectors(up.current, dir.current);
        streak.setRotationFromQuaternion(rot.current);
        // scale: cylinder default height = 1 on Y; scale Y to length
        const width = 0.06;
        streak.scale.set(width, length, width);
        // position a bit behind the bullet in local space
        offset.current.copy(dir.current).multiplyScalar(-length * 0.5);
        streak.position.copy(offset.current);
        streak.visible = true;
      } else {
        streak.visible = false;
      }
    }
  });

  return (
    <RigidBody
      ref={setBodyRef}
      type="dynamic"
      colliders={false}
      ccd
      linearDamping={0}
      angularDamping={0}
      gravityScale={0}
      canSleep={false}
      position={entity.position as unknown as [number, number, number]}
    >
      <mesh ref={meshRef} castShadow={false} frustumCulled={false} name="ProjectileMesh">
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial
          color={entity.team === "red" ? "#ffb199" : "#b3d9ff"}
        />
      </mesh>
      {/* Instantaneous streak for motion clarity (cheap) */}
      <mesh ref={streakRef} frustumCulled={false} castShadow={false} name="ProjectileStreak">
        <cylinderGeometry args={[0.5, 0.5, 1, 6, 1, true]} />
        <meshBasicMaterial
          color={entity.team === "red" ? "#ffd6cc" : "#d9ecff"}
          transparent
          opacity={0.7}
        />
      </mesh>
      <BallCollider args={[0.2]} />
    </RigidBody>
  );
}
