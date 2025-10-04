import { BallCollider, RigidBody } from "@react-three/rapier";
import React, { useEffect, useMemo, useRef } from "react";
import { Mesh } from "three";

import type { ProjectileComponent } from "../ecs/components/projectile";
import type { Entity } from "../ecs/miniplexStore";
import { useEntityPhysicsSync } from "../hooks/useEntityPhysicsSync";
import { ProjectileStreak } from "./ProjectileStreak";

interface ProjectileEntity extends Entity {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
  render?: unknown;
}

export function Projectile({ entity }: { entity: ProjectileEntity }) {
  const meshRef = useRef<Mesh>(null);
  const { setRigidBody } = useEntityPhysicsSync(entity);

  const colors = useMemo(
    () => ({
      shell: entity.team === "red" ? "#ffb199" : "#b3d9ff",
      streak: entity.team === "red" ? "#ffd6cc" : "#d9ecff",
    }),
    [entity.team],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (mesh) {
      entity.render = mesh;
    }
    return () => {
      if (entity.render === mesh) {
        entity.render = null;
      }
    };
  }, [entity]);

  return (
    <RigidBody
      ref={setRigidBody}
      type="dynamic"
      colliders={false}
      ccd
      linearDamping={0}
      angularDamping={0}
      gravityScale={0}
      canSleep={false}
      position={entity.position as [number, number, number]}
    >
      <mesh
        ref={meshRef}
        castShadow={false}
        frustumCulled={false}
        name="ProjectileMesh"
      >
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshBasicMaterial color={colors.shell} />
      </mesh>
      <ProjectileStreak velocity={entity.velocity} color={colors.streak} />
      <BallCollider args={[0.2]} />
    </RigidBody>
  );
}
