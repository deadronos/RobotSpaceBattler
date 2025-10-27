/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  type RapierRigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { BattleWorld, RobotEntity } from "../ecs/world";
import { TEAM_CONFIGS } from "../lib/teamConfig";
import { getWeaponStats } from "../lib/weapons";

interface RobotsProps {
  worldRef: React.MutableRefObject<BattleWorld | null>;
}

function RobotActor({ entity }: { entity: RobotEntity }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const primaryMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const weapon = useMemo(() => getWeaponStats(entity.weapon), [entity.weapon]);
  const team = TEAM_CONFIGS[entity.team];
  const rotationQuat = useMemo(() => new THREE.Quaternion(), []);
  const upAxis = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useBeforePhysicsStep(() => {
    if (!bodyRef.current) {
      return;
    }

    if (entity.health <= 0) {
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    bodyRef.current.setLinvel(
      { x: entity.velocity.x, y: 0, z: entity.velocity.z },
      true,
    );

    rotationQuat.setFromAxisAngle(upAxis, entity.orientation);
    bodyRef.current.setRotation(
      {
        x: rotationQuat.x,
        y: rotationQuat.y,
        z: rotationQuat.z,
        w: rotationQuat.w,
      },
      true,
    );
  });

  useAfterPhysicsStep(() => {
    if (!bodyRef.current) {
      return;
    }

    const translation = bodyRef.current.translation();
    entity.position.x = translation.x;
    entity.position.y = 0;
    entity.position.z = translation.z;

    const rotation = bodyRef.current.rotation();
    const yaw = Math.atan2(
      2 * (rotation.w * rotation.y + rotation.x * rotation.z),
      1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z),
    );
    if (!Number.isNaN(yaw)) {
      entity.orientation = yaw;
    }
  });

  useFrame(() => {
    const material = primaryMaterialRef.current;
    if (!material) {
      return;
    }

    const intensity = THREE.MathUtils.lerp(
      0.25,
      1,
      entity.health / entity.maxHealth,
    );
    material.emissiveIntensity = intensity;
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={[entity.position.x, 0.9, entity.position.z]}
      rotation={[0, entity.orientation, 0]}
      enabledTranslations={[true, false, true]}
      enabledRotations={[false, true, false]}
      gravityScale={0}
      linearDamping={1.5}
      colliders={false}
      canSleep={false}
      ccd
    >
      <CapsuleCollider args={[0.45, 0.45]} />
      <group castShadow>
        <mesh castShadow>
          <capsuleGeometry args={[0.45, 0.9, 8, 16]} />
          <meshStandardMaterial
            ref={primaryMaterialRef}
            color={team.color}
            emissive={entity.isCaptain ? team.accent : weapon.color}
            metalness={0.6}
            roughness={0.35}
          />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <cylinderGeometry args={[0.48, 0.6, 0.3, 16]} />
          <meshStandardMaterial
            color="#04060f"
            metalness={0.4}
            roughness={0.7}
          />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={weapon.color}
            emissive={weapon.color}
            emissiveIntensity={0.4}
          />
        </mesh>
        <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.32, 16]} />
          <meshBasicMaterial
            color={entity.isCaptain ? "#ffd280" : team.accent}
            transparent
            opacity={0.75}
          />
        </mesh>
      </group>
    </RigidBody>
  );
}

function Robots({ worldRef }: RobotsProps) {
  const [robots, setRobots] = useState<RobotEntity[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const updateEntities = () => {
      const next = worldRef.current?.robots.entities ?? [];
      setRobots([...next]);
    };

    updateEntities();
    const interval = window.setInterval(updateEntities, 150);
    return () => window.clearInterval(interval);
  }, [worldRef]);

  return (
    <group>
      {robots.map((robot) => (
        <RobotActor key={robot.id} entity={robot} />
      ))}
    </group>
  );
}

export default memo(Robots);
