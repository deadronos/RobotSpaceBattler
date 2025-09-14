import { BallCollider, RigidBody } from "@react-three/rapier";
import React, { useLayoutEffect, useRef } from "react";

import type { RapierApi, Vec3 } from "../ecs/types";
import { extractRapierApi } from "../ecs/types";

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

  useLayoutEffect(() => {
    const rb = extractRapierApi(ref.current);
    if (rb) {
      try {
        rb.setTranslation?.(
          { x: position.x, y: position.y, z: position.z },
          true,
        );
        rb.setLinvel?.({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
      } catch {
        // ignore runtime shape differences
      }
      onRigidBodyReady?.(rb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <RigidBody
      ref={(node) => {
        ref.current = node;
      }}
      type="dynamic"
      ccd
      colliders={false}
      gravityScale={0}
      enabledRotations={[false, false, false]}
      // event typing differences across versions - keep handler typed loosely
      onCollisionEnter={(e: { other: unknown }) => {
        onHit?.(e.other);
      }}
    >
      <BallCollider args={[radius]} />
      <group data-id={_id} position={[position.x, position.y, position.z]}>
        <mesh>
          <sphereGeometry args={[radius, 8, 8]} />
          <meshStandardMaterial
            color={team === "red" ? "orange" : "lightblue"}
            emissive={team === "red" ? "orange" : "lightblue"}
            emissiveIntensity={1.5}
          />
        </mesh>
        {/* simple fake trail (stretched thin cylinder) */}
        <mesh position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          <meshStandardMaterial
            color={team === "red" ? "orange" : "lightblue"}
            emissive={team === "red" ? "orange" : "lightblue"}
            emissiveIntensity={1.2}
            opacity={0.8}
            transparent
          />
        </mesh>
      </group>
    </RigidBody>
  );
}
