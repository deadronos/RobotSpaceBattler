import { BallCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useLayoutEffect, useRef } from 'react';

import store from '../ecs/miniplexStore';
import type { RapierApi, Vec3 } from '../ecs/types';
import { extractRapierApi } from '../ecs/types';
import { markEntityDestroying } from '../utils/rapierCleanup';

type Props = {
  id: string;
  team: "red" | "blue";
  position: Vec3;
  velocity: Vec3;
  radius?: number;
  onRigidBodyReady?: (_rb: RapierApi) => void;
  onHit?: (other: unknown) => void;
  physics?: boolean;
};

// Small, focused visual for the projectile to avoid duplication.
function ProjectileVisual({ radius, color }: { radius: number; color: string }) {
  return (
    <>
      <mesh>
        <sphereGeometry args={[radius, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          opacity={0.8}
          transparent
        />
      </mesh>
    </>
  );
}

export default function Projectile({
  id: _id,
  team,
  position,
  velocity,
  radius = 0.1,
  onRigidBodyReady,
  onHit,
  physics = true,
}: Props) {
  const ref = useRef<unknown>(null);
  const color = team === 'red' ? 'orange' : 'lightblue';
  useLayoutEffect(() => {
    const rb = extractRapierApi(ref.current);
    if (rb) {
      // Create fresh plain objects before calling into wasm to avoid
      // potential aliasing/ownership issues when a reference to a
      // JS object managed by React is reused elsewhere.
  try { rb.setTranslation?.({ x: position.x, y: position.y, z: position.z }, true); } catch { /* ignore */ }
  try { rb.setLinvel?.({ x: velocity.x, y: velocity.y, z: velocity.z }, true); } catch { /* ignore */ }
      onRigidBodyReady?.(rb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cleanup on unmount: clear ECS references associated with this projectile
  useEffect(() => {
    return () => {
      try {
        const ent = [...store.entities.values()].find(
          (e) => (e as { id?: string }).id === _id,
        ) as unknown as Record<string, unknown> | undefined;
        if (!ent) return;
        try {
          markEntityDestroying(ent);
        } catch {
          // Fallback manual cleanup if utils path changes or throws
          try { delete (ent as Record<string, unknown>).rb; } catch { /* ignore */ }
          try { delete (ent as Record<string, unknown>).collider; } catch { /* ignore */ }
          try { (ent as Record<string, unknown>).__destroying = true as unknown as never; } catch { /* ignore */ }
        }
      } catch {
        // ignore
      }
    };
  }, [_id]);

  if (!physics) {
    return (
      <group data-id={_id} position={[position.x, position.y, position.z]}>
        <ProjectileVisual radius={radius} color={color} />
      </group>
    );
  }

  return (
    <RigidBody
      ref={(node: unknown) => {
        ref.current = node;
      }}
      type="dynamic"
      ccd
      colliders={false}
      gravityScale={0}
      enabledRotations={[false, false, false]}
      onCollisionEnter={(e: { other: unknown }) => {
        onHit?.(e.other);
      }}
   >
      <BallCollider args={[radius]} />
      {/* RigidBody owns the transform; keep visuals at local origin */}
      <group data-id={_id} position={[0, 0, 0]}>
        <ProjectileVisual radius={radius} color={color} />
      </group>
    </RigidBody>
  );
}
