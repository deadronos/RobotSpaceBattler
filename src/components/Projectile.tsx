import { useEffect, useMemo, useRef } from "react";
import {
  InstancedMesh,
  Matrix4,
  Quaternion as ThreeQuaternion,
  Vector3 as ThreeVector3,
} from "three";

import type { Projectile } from "../ecs/entities/Projectile";
import type { WeaponType } from "../types";

export interface ProjectileInstancesProps {
  projectiles: Projectile[];
}

const PROJECTILE_TYPES: WeaponType[] = ["laser", "gun", "rocket"];

interface ProjectileVisualConfig {
  color: string;
  emissive?: string;
  emissiveIntensity: number;
  scale: [number, number, number];
  geometry: "cylinder" | "box" | "cone";
}

const VISUAL_CONFIG: Record<WeaponType, ProjectileVisualConfig> = {
  laser: {
    color: "#22d3ee",
    emissive: "#a855f7",
    emissiveIntensity: 0.9,
    scale: [0.1, 0.1, 0.6],
    geometry: "cylinder",
  },
  gun: {
    color: "#f97316",
    emissive: "#9a3412",
    emissiveIntensity: 0.3,
    scale: [0.12, 0.12, 0.4],
    geometry: "box",
  },
  rocket: {
    color: "#facc15",
    emissive: "#f59e0b",
    emissiveIntensity: 0.6,
    scale: [0.15, 0.15, 0.5],
    geometry: "cone",
  },
};

type GroupedProjectiles = Record<WeaponType, Projectile[]>;

function groupProjectiles(projectiles: Projectile[]): GroupedProjectiles {
  return projectiles.reduce<GroupedProjectiles>(
    (acc, projectile) => {
      acc[projectile.weaponType].push(projectile);
      return acc;
    },
    {
      laser: [],
      gun: [],
      rocket: [],
    },
  );
}

const tempMatrix = new Matrix4();
const tempPosition = new ThreeVector3();
const tempQuaternion = new ThreeQuaternion();
const tempScale = new ThreeVector3();

export function ProjectileInstances({ projectiles }: ProjectileInstancesProps) {
  const grouped = useMemo(() => groupProjectiles(projectiles), [projectiles]);

  const instancedRefs = useRef<Record<WeaponType, InstancedMesh | null>>({
    laser: null,
    gun: null,
    rocket: null,
  });

  useEffect(() => {
    PROJECTILE_TYPES.forEach((type) => {
      const mesh = instancedRefs.current[type];
      if (!mesh) {
        return;
      }

      const config = VISUAL_CONFIG[type];
      const items = grouped[type];

      mesh.count = items.length;
      items.forEach((projectile, index) => {
        tempPosition.set(
          projectile.position.x,
          projectile.position.y,
          projectile.position.z,
        );
        tempQuaternion.set(0, 0, 0, 1);
        tempScale.set(config.scale[0], config.scale[1], config.scale[2]);

        tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
        mesh.setMatrixAt(index, tempMatrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    });
  }, [grouped]);

  const meshes = useMemo(
    () =>
      PROJECTILE_TYPES.map((type) => {
        const config = VISUAL_CONFIG[type];

        return (
          <instancedMesh
            key={type}
            ref={(value) => {
              instancedRefs.current[type] = value;
            }}
            name={`projectiles-${type}`}
            args={[undefined, undefined, grouped[type].length]}
            frustumCulled={false}
          >
            {config.geometry === "cylinder" ? (
              <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
            ) : config.geometry === "cone" ? (
              <coneGeometry args={[0.12, 0.8, 8]} />
            ) : (
              <boxGeometry args={[0.2, 0.2, 0.6]} />
            )}
            <meshStandardMaterial
              color={config.color}
              emissive={config.emissive}
              emissiveIntensity={config.emissiveIntensity}
            />
          </instancedMesh>
        );
      }),
    [grouped],
  );

  return <group name="projectiles">{meshes}</group>;
}

export default ProjectileInstances;
