import fs from 'fs';
import path from 'node:path';
import { BattleWorld } from '../../src/ecs/world';
import { ObstacleFixture, spawnObstaclesFromFixture } from '../../src/simulation/match/matchSpawner';

export function loadFixture(relPath: string): ObstacleFixture {
  const p = path.join(process.cwd(), relPath);
  if (!fs.existsSync(p)) throw new Error(`Fixture not found: ${p}`);
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw) as ObstacleFixture;
}

export function spawnFixtureInWorld(world: BattleWorld, fixture: ObstacleFixture) {
  spawnObstaclesFromFixture(world, fixture);
}
