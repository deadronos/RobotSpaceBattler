import { CuboidCollider, RigidBody } from "@react-three/rapier";
import React, { useEffect, useRef, useCallback } from "react";

import type { Entity } from "../ecs/miniplexStore";

export function Robot({ entity }: { entity: Entity }) {
  const rbRef = useRef<unknown>(null);
  const colliderRef = useRef<unknown>(null);

  // Set entity.rigid immediately when ref is assigned
  const setRbRef = useCallback((r: unknown) => {
    rbRef.current = r;
    if (r) {
      entity.rigid = r;

      // Set initial position from entity ONLY on first mount
      if (entity.position) {
        try {
          const rb = r as {
            translation: () => { x: number; y: number; z: number };
            setTranslation: (pos: { x: number; y: number; z: number }, wake: boolean) => void;
          };
          const translation = rb.translation();
          // Only set if the rigid body is at origin (hasn't been positioned yet)
          if (translation.x === 0 && translation.y === 0 && translation.z === 0) {
            rb.setTranslation(
              { x: entity.position[0], y: entity.position[1], z: entity.position[2] },
              true
            );
          }
        } catch {
          // ignore if API not available
        }
      }

      // Set entity id tracking
      try {
        if (typeof r === "object") {
          (r as Record<string, unknown>)["__entityId"] = entity.id;
        }
      } catch {
        // ignore
      }
    } else if (entity.rigid === rbRef.current) {
      entity.rigid = null;
    }
  }, [entity]);

  const setColliderRef = useCallback((c: unknown) => {
    colliderRef.current = c;
    if (c && typeof c === "object") {
      try {
        (c as Record<string, unknown>)["userData"] = { id: entity.id };
        (c as Record<string, unknown>)["entityId"] = entity.id;
      } catch {
        // ignore
      }
    }
  }, [entity.id]);

  useEffect(() => {
    return () => {
      if (entity.rigid === rbRef.current) {
        entity.rigid = null;
      }
    };
  }, [entity]);

  // dev-only mount counter removed

  return (
    <RigidBody
      ref={setRbRef}
      colliders={false}
      canSleep={false}
    >
      <mesh castShadow frustumCulled={false} name="RobotMesh">
        <boxGeometry args={[0.8, 1.2, 0.8]} />
        <meshStandardMaterial
          color={entity.team === "red" ? "#b04646" : "#4976d1"}
        />
      </mesh>
      <CuboidCollider
        ref={setColliderRef}
        args={[0.4, 0.6, 0.4]}
      />
    </RigidBody>
  );
}
