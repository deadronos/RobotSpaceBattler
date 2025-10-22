/* eslint-disable react/no-unknown-property */
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { BattleWorld, ProjectileEntity } from "../ecs/world";
import { getWeaponStats } from "../lib/weapons";
import { useSimulationStore } from "../state/simulationStore";

interface ProjectilesProps {
  worldRef: React.MutableRefObject<BattleWorld | null>;
}

function ProjectileActor({ projectile }: { projectile: ProjectileEntity }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const stats = getWeaponStats(projectile.weapon);
  const reducedMotion = useSimulationStore((state) => state.reducedMotion);

  useFrame(() => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.position.set(
      projectile.position.x,
      0.6,
      projectile.position.z,
    );
    if (!reducedMotion) {
      const scale = THREE.MathUtils.clamp(projectile.ttl / 3, 0.5, 1);
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(0.8);
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color={stats.color}
        emissive={stats.color}
        emissiveIntensity={0.7}
      />
    </mesh>
  );
}

function Projectiles({ worldRef }: ProjectilesProps) {
  const [projectiles, setProjectiles] = useState<ProjectileEntity[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const updateEntities = () => {
      const next = worldRef.current?.projectiles.entities ?? [];
      setProjectiles([...next]);
    };

    updateEntities();
    const interval = window.setInterval(updateEntities, 100);
    return () => window.clearInterval(interval);
  }, [worldRef]);

  return (
    <group>
      {projectiles.map((projectile) => (
        <ProjectileActor key={projectile.id} projectile={projectile} />
      ))}
    </group>
  );
}

export default memo(Projectiles);
