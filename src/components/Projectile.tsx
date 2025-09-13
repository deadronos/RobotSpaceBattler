import { BallCollider, RigidBody } from "@react-three/rapier";
import React, { useLayoutEffect, useRef } from "react";

type Vec3 = { x: number; y: number; z: number };

type Props = {
  id: string;
  team: "red" | "blue";
  position: Vec3;
  velocity: Vec3;
  radius?: number;
  onRigidBodyReady?: (_rb: any) => void;
  onHit?: (...args: any[]) => void;
};

export default function Projectile({
  id: _id,
  team,
  position,
  velocity,
  radius = 0.1,
  onRigidBodyReady,
  onHit,
}: Props) {
  const ref = useRef<any>(null);

  useLayoutEffect(() => {
    const rb = ref.current?.rigidBody;
    if (rb) {
      rb.setTranslation({ x: position.x, y: position.y, z: position.z }, true);
      rb.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
      onRigidBodyReady?.(rb);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RigidBody
      ref={ref}
      type="dynamic"
      ccd
      colliders={false}
      gravityScale={0}
      enabledRotations={[false, false, false]}
      // @ts-ignore: event typing differences across versions
      onCollisionEnter={(e: any) => {
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
