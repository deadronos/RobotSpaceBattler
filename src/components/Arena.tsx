import React, { useEffect } from "react";

import type { ArenaEntity } from "../ecs/entities/Arena";
import type { Team } from "../types";

export interface ArenaProps {
  arena: ArenaEntity;
}

const TEAM_COLORS: Record<Team, string> = {
  red: "#ff5f57",
  blue: "#4a90e2",
};

function renderWalls(arena: ArenaEntity) {
  const halfWidth = arena.dimensions.x / 2;
  const halfDepth = arena.dimensions.z / 2;
  const wallHeight = arena.dimensions.y / 2;
  const wallThickness = 2;

  return (
    <group name="arena-walls">
      <mesh
        name="arena-wall-north"
        position={[0, wallHeight, -halfDepth]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[arena.dimensions.x, arena.dimensions.y, wallThickness]}
        />
        <meshStandardMaterial color="#20263b" />
      </mesh>
      <mesh
        name="arena-wall-south"
        position={[0, wallHeight, halfDepth]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[arena.dimensions.x, arena.dimensions.y, wallThickness]}
        />
        <meshStandardMaterial color="#20263b" />
      </mesh>
      <mesh
        name="arena-wall-east"
        position={[halfWidth, wallHeight, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[wallThickness, arena.dimensions.y, arena.dimensions.z]}
        />
        <meshStandardMaterial color="#1b2236" />
      </mesh>
      <mesh
        name="arena-wall-west"
        position={[-halfWidth, wallHeight, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[wallThickness, arena.dimensions.y, arena.dimensions.z]}
        />
        <meshStandardMaterial color="#1b2236" />
      </mesh>
    </group>
  );
}

function renderSpawnZones(arena: ArenaEntity) {
  return (
    Object.entries(arena.spawnZones) as [
      Team,
      ArenaEntity["spawnZones"][Team],
    ][]
  ).map(([team, zone]) => (
    <group key={team} name={`spawn-zone-${team}-group`}>
      <mesh
        name={`spawn-zone-${team}`}
        position={[zone.center.x, 0.02, zone.center.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[zone.radius * 0.6, zone.radius, 64]} />
        <meshBasicMaterial
          color={TEAM_COLORS[team]}
          transparent
          opacity={0.3}
        />
      </mesh>
      {zone.spawnPoints.map((point, index) => (
        <mesh
          key={`${team}-${index}`}
          name={`spawn-point-${team}-${index}`}
          position={[point.x, 0.4, point.z]}
          castShadow
        >
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial
            color={TEAM_COLORS[team]}
            emissive={TEAM_COLORS[team]}
            emissiveIntensity={0.35}
          />
        </mesh>
      ))}
    </group>
  ));
}

function renderObstacles(arena: ArenaEntity) {
  return arena.obstacles.map((obstacle, index) => (
    <mesh
      key={`${obstacle.position.x}-${obstacle.position.z}-${index}`}
      name={`arena-obstacle-${index}`}
      position={[
        obstacle.position.x,
        obstacle.position.y + obstacle.dimensions.y / 2,
        obstacle.position.z,
      ]}
      castShadow
      receiveShadow
    >
      <boxGeometry
        args={[
          obstacle.dimensions.x,
          obstacle.dimensions.y,
          obstacle.dimensions.z,
        ]}
      />
      <meshStandardMaterial color={obstacle.isCover ? "#374151" : "#1f2937"} />
    </mesh>
  ));
}

export function Arena({ arena }: ArenaProps) {
  useEffect(() => {
    // Dynamically import the perf harness so Playwright/CI can access window.__perf.
    // This avoids top-level side-effect import ordering issues with the linter.
    void import("../utils/perfHarness");
  }, []);

  return (
    <group name="arena">
      <ambientLight
        name="arena-ambient-light"
        color={arena.lightingConfig.ambientColor}
        intensity={arena.lightingConfig.ambientIntensity}
      />
      <directionalLight
        name="arena-directional-light"
        color={arena.lightingConfig.directionalColor}
        intensity={arena.lightingConfig.directionalIntensity}
        position={[0, arena.dimensions.y, arena.dimensions.z / 2]}
        castShadow={arena.lightingConfig.shadowsEnabled}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <mesh name="arena-floor" rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[arena.dimensions.x, arena.dimensions.z]} />
        <meshStandardMaterial color="#0f172a" metalness={0.1} roughness={0.8} />
      </mesh>

      {renderWalls(arena)}

      <group name="arena-spawn-zones">{renderSpawnZones(arena)}</group>

      <group name="arena-obstacles">{renderObstacles(arena)}</group>
    </group>
  );
}

export default Arena;
