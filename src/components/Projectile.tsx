import React, { useLayoutEffect, useRef, useEffect } from "react";

import type { RapierApi, Vec3 } from "../ecs/types";
import { extractRapierApi } from "../ecs/types";
import store from "../ecs/miniplexStore";

type Props = {
  id: string;
  team: "red" | "blue";
  position: Vec3;
  velocity: Vec3;
  radius?: number;
  onRigidBodyReady?: (_rb: RapierApi) => void;
  onHit?: (other: unknown) => void;
  physics?: boolean;
  rapierComponents?: {
    RigidBody?: React.ComponentType<unknown>;
    BallCollider?: React.ComponentType<unknown>;
  } | null;
};

export default function Projectile({
  id: _id,
  team,
  position,
  velocity,
  radius = 0.1,
  onRigidBodyReady,
  onHit,
  physics = true,
  rapierComponents = null,
}: Props) {
  const ref = useRef<unknown>(null);
  useLayoutEffect(() => {
    const rb = extractRapierApi(ref.current);
    if (rb) {
      try {
        // Create fresh plain objects before calling into wasm to avoid
        // potential aliasing/ownership issues when a reference to a
        // JS object managed by React is reused elsewhere.
        rb.setTranslation?.(
          { x: position.x, y: position.y, z: position.z },
          true,
        );
        rb.setLinvel?.(
          { x: velocity.x, y: velocity.y, z: velocity.z },
          true,
        );
      } catch {
        // ignore runtime shape differences
      }
      onRigidBodyReady?.(rb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup on unmount: clear ECS references associated with this projectile
  useEffect(() => {
    return () => {
      try {
        const ent = [...store.entities.values()].find((e: any) => e.id === _id);
        if (ent) {
          try {
            import('../utils/rapierCleanup').then((m) => { try { m.markEntityDestroying(ent); } catch {} }).catch(() => {
              try { delete (ent as any).rb; } catch {}
              try { delete (ent as any).collider; } catch {}
              try { (ent as any).__destroying = true; } catch {}
            });
          } catch {
            try { delete (ent as any).rb; } catch {}
            try { delete (ent as any).collider; } catch {}
            try { (ent as any).__destroying = true; } catch {}
          }
        }
      } catch {
        // ignore
      }
    };
  }, [_id]);

  if (!physics) {
    return (
      <group data-id={_id} position={[position.x, position.y, position.z]}>
        <mesh>
          <sphereGeometry args={[radius, 8, 8]} />
          <meshStandardMaterial
            color={team === "red" ? "orange" : "lightblue"}
            emissive={team === "red" ? "orange" : "lightblue"}
            emissiveIntensity={1.5}
          />
        </mesh>
      </group>
    );
  }

  return (
    rapierComponents && rapierComponents.RigidBody ? (
      React.createElement(
        rapierComponents.RigidBody,
        ({ ref: (node: unknown) => { ref.current = node; }, type: 'dynamic', ccd: true, colliders: false, gravityScale: 0, enabledRotations: [false, false, false], onCollisionEnter: (e: { other: unknown }) => { onHit?.(e.other); } } as unknown as Record<string, unknown>),
        rapierComponents.BallCollider ? React.createElement(rapierComponents.BallCollider, ({ args: [radius] } as unknown as Record<string, unknown>)) : null,
        React.createElement(
          'group',
          ({ 'data-id': _id, position: [position.x, position.y, position.z] } as unknown as Record<string, unknown>),
          React.createElement(
            'mesh',
            null,
            React.createElement('sphereGeometry', { args: [radius, 8, 8] }),
            React.createElement('meshStandardMaterial', {
              color: team === 'red' ? 'orange' : 'lightblue',
              emissive: team === 'red' ? 'orange' : 'lightblue',
              emissiveIntensity: 1.5,
            }),
          ),
          React.createElement(
            'mesh',
            ({ position: [0, 0, -0.3], rotation: [Math.PI / 2, 0, 0] } as unknown as Record<string, unknown>),
            React.createElement('cylinderGeometry', { args: [0.02, 0.02, 0.6, 6] }),
            React.createElement('meshStandardMaterial', {
              color: team === 'red' ? 'orange' : 'lightblue',
              emissive: team === 'red' ? 'orange' : 'lightblue',
              emissiveIntensity: 1.2,
              opacity: 0.8,
              transparent: true,
            }),
          ),
        ),
      )
    ) : (
      // safety fallback
      <group data-id={_id} position={[position.x, position.y, position.z]} />
    )
  );
}
