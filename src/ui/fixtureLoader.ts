import { BattleWorld, ObstacleEntity } from "../ecs/world";
import {
  ObstacleFixture,
  ObstacleFixtureEntry,
  spawnObstaclesFromFixture,
} from "../simulation/match/matchSpawner";

function toFixtureEntry(obstacle: ObstacleEntity): ObstacleFixtureEntry {
  const entry: ObstacleFixtureEntry = {
    id: obstacle.id,
    obstacleType: obstacle.obstacleType,
    position: obstacle.position,
    orientation: obstacle.orientation,
    shape: obstacle.shape,
    blocksVision: obstacle.blocksVision,
    blocksMovement: obstacle.blocksMovement,
    active: obstacle.active,
    movementPattern: obstacle.movementPattern ?? undefined,
    hazardSchedule: obstacle.hazardSchedule ?? undefined,
    hazardEffects: obstacle.hazardEffects ?? undefined,
    durability: obstacle.durability,
    maxDurability: obstacle.maxDurability,
  };

  return entry;
}

export function exportObstacleFixture(world: BattleWorld): ObstacleFixture {
  return {
    obstacles: world.obstacles.entities.map((o) => toFixtureEntry(o)),
  };
}

export function parseObstacleFixture(json: string): ObstacleFixture {
  const parsed = JSON.parse(json) as ObstacleFixture;
  if (!parsed || !Array.isArray(parsed.obstacles)) {
    throw new Error("Invalid obstacle fixture payload");
  }
  return parsed;
}

export function serializeObstacleFixture(fixture: ObstacleFixture): string {
  return JSON.stringify(fixture, null, 2);
}

export function replaceObstaclesFromFixture(
  world: BattleWorld,
  fixture: ObstacleFixture,
): void {
  // Remove existing obstacles only (keep robots/projectiles intact)
  const existing = [...world.obstacles.entities];
  existing.forEach((obs) => world.world.remove(obs));
  spawnObstaclesFromFixture(world, fixture);
}
