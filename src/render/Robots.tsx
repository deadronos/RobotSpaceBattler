/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { BattleWorld, RobotEntity } from "../ecs/world";
import { TEAM_CONFIGS } from "../lib/teamConfig";
import { getWeaponStats } from "../lib/weapons";

interface RobotsProps {
  worldRef: React.MutableRefObject<BattleWorld | null>;
}

function RobotActor({ entity }: { entity: RobotEntity }) {
  const groupRef = useRef<THREE.Group>(null);
  const weapon = useMemo(() => getWeaponStats(entity.weapon), [entity.weapon]);
  const team = TEAM_CONFIGS[entity.team];

  useFrame(() => {
    if (!groupRef.current) {
      return;
    }

    groupRef.current.position.set(entity.position.x, 0.9, entity.position.z);
    groupRef.current.rotation.y = entity.orientation;
    const intensity = THREE.MathUtils.lerp(
      0.25,
      1,
      entity.health / entity.maxHealth,
    );
    const emissive = (groupRef.current.children[0] as THREE.Mesh)
      .material as THREE.MeshStandardMaterial;
    emissive.emissiveIntensity = intensity;
  });

  return (
    <group ref={groupRef} castShadow>
      <mesh castShadow>
        <capsuleGeometry args={[0.45, 0.9, 8, 16]} />
        <meshStandardMaterial
          color={team.color}
          emissive={entity.isCaptain ? team.accent : weapon.color}
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.48, 0.6, 0.3, 16]} />
        <meshStandardMaterial color="#04060f" metalness={0.4} roughness={0.7} />
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
