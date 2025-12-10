import fs from 'fs';
import path from 'path';
import { BattleWorld, ObstacleEntity } from '../../src/ecs/world';

export function loadFixture(relPath: string): { obstacles: Partial<ObstacleEntity>[] } {
  const p = path.join(process.cwd(), relPath);
  if (!fs.existsSync(p)) throw new Error(`Fixture not found: ${p}`);
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw) as { obstacles: Partial<ObstacleEntity>[] };
}

export function spawnFixtureInWorld(world: BattleWorld, fixture: { obstacles: Partial<ObstacleEntity>[] }) {
  for (const o of fixture.obstacles) {
    // Ensure required fields exist
    const obstacle: ObstacleEntity = {
      id: o.id ?? `fixture-${Math.random().toString(36).slice(2, 9)}`,
      kind: 'obstacle',
      obstacleType: (o.obstacleType as any) ?? 'barrier',
      position: (o.position as any) ?? { x: 0, y: 0, z: 0 },
      orientation: o.orientation ?? 0,
      shape: (o.shape as any) ?? { kind: 'box', halfWidth: 1, halfDepth: 1 },
      blocksVision: o.blocksVision ?? true,
      blocksMovement: o.blocksMovement ?? true,
      active: o.active ?? true,
      movementPattern: (o as any).movementPattern ?? null,
      hazardSchedule: (o as any).hazardSchedule ?? null,
      hazardEffects: (o as any).hazardEffects ?? null,
      durability: o.durability as any,
      maxDurability: o.maxDurability as any,
    } as ObstacleEntity;

    world.world.add(obstacle);
  }
}
