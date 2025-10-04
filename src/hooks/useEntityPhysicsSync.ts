import { useFrame } from "@react-three/fiber";
import { type MutableRefObject, useCallback, useEffect, useRef } from "react";

import type { Entity } from "../ecs/miniplexStore";
import { notifyEntityChanged } from "../ecs/miniplexStore";

export type RigidBodyHandle = {
  translation?: () => { x: number; y: number; z: number };
  linvel?: () => { x: number; y: number; z: number };
  setLinvel?: (
    velocity: { x: number; y: number; z: number },
    wake: boolean,
  ) => void;
};

export interface PhysicsEntity extends Entity {
  position: [number, number, number];
  velocity?: [number, number, number];
  rigid?: unknown;
}

export interface PhysicsSyncOptions {
  /** Whether to write rigid-body translation back into the ECS entity */
  updatePosition?: boolean;
  /** Whether to keep rigid-body linear velocity in sync with the ECS entity */
  syncVelocity?: boolean;
  /** Wake the rigid body when applying velocity (default true) */
  wake?: boolean;
  /** Epsilon used when detecting velocity drift */
  velocityEpsilon?: number;
}

export interface PhysicsSyncResult {
  setRigidBody: (body: RigidBodyHandle | null) => void;
  rigidBodyRef: MutableRefObject<RigidBodyHandle | null>;
}

const DEFAULT_OPTIONS: Required<
  Pick<PhysicsSyncOptions, "updatePosition" | "syncVelocity" | "wake">
> = {
  updatePosition: true,
  syncVelocity: true,
  wake: true,
};

const DEFAULT_EPSILON = 0.0001;

export function useEntityPhysicsSync<E extends PhysicsEntity>(
  entity: E,
  options: PhysicsSyncOptions = {},
): PhysicsSyncResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const velocityEpsilon = options.velocityEpsilon ?? DEFAULT_EPSILON;
  const bodyRef = useRef<RigidBodyHandle | null>(null);

  const setRigidBody = useCallback(
    (body: RigidBodyHandle | null) => {
      if (body) {
        entity.rigid = body as unknown;
      } else if (entity.rigid === bodyRef.current) {
        entity.rigid = null;
      }
      bodyRef.current = body;
    },
    [entity],
  );

  useEffect(() => {
    return () => {
      if (entity.rigid === bodyRef.current) {
        entity.rigid = null;
      }
      bodyRef.current = null;
    };
  }, [entity]);

  useEffect(() => {
    if (!opts.syncVelocity) return;
    const body = bodyRef.current;
    if (!body || !entity.velocity || !body.setLinvel) return;
    const [vx, vy, vz] = entity.velocity;
    body.setLinvel({ x: vx, y: vy, z: vz }, opts.wake);
  }, [entity, opts.syncVelocity, opts.wake]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;

    let positionChanged = false;

    if (opts.updatePosition) {
      const translation = body.translation?.();
      if (translation) {
        const oldX = entity.position[0];
        const oldY = entity.position[1];
        const oldZ = entity.position[2];
        
        entity.position[0] = translation.x;
        entity.position[1] = translation.y;
        entity.position[2] = translation.z;
        
        // Check if position actually changed
        const threshold = 0.0001;
        if (
          Math.abs(oldX - translation.x) > threshold ||
          Math.abs(oldY - translation.y) > threshold ||
          Math.abs(oldZ - translation.z) > threshold
        ) {
          positionChanged = true;
        }
      }
    }

    if (opts.syncVelocity && entity.velocity && body.linvel && body.setLinvel) {
      const [vx, vy, vz] = entity.velocity;
      const current = body.linvel();
      if (!current) return;
      if (
        Math.abs(current.x - vx) > velocityEpsilon ||
        Math.abs(current.y - vy) > velocityEpsilon ||
        Math.abs(current.z - vz) > velocityEpsilon
      ) {
        body.setLinvel({ x: vx, y: vy, z: vz }, opts.wake);
      }
    }

    // Notify React components if position changed
    if (positionChanged) {
      notifyEntityChanged(entity as Entity);
    }
  });

  return { setRigidBody, rigidBodyRef: bodyRef };
}
