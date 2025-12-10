import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { applyDamageToObstacle } from '../../src/simulation/obstacles/destructibleSystem';
import { isLineOfSightBlockedRuntime } from '../../src/simulation/environment/arenaGeometry';

describe('destructible cover - applyDamageToObstacle', () => {
  it('reduces durability and does not remove if not depleted', () => {
    const world = createBattleWorld();

    const cover = {
      id: 'cover-1',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      durability: 10,
      maxDurability: 10,
      blocksVision: true,
      blocksMovement: true,
    } as any;

    world.world.add(cover);

    const destroyed = applyDamageToObstacle(world, cover.id, 5);
    expect(destroyed).toBe(false);
    const stored = world.obstacles.entities.find((o) => o.id === cover.id);
    expect(stored).toBeDefined();
    expect(stored?.durability).toBe(5);
  });

  it('removes obstacle when durability reaches zero and LOS updates', () => {
    const world = createBattleWorld();

    const cover = {
      id: 'cover-2',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      // place cover away from static central geometry for LOS test (use z=40 to avoid interior walls)
      position: { x: 0, y: 0, z: 40 },
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      durability: 5,
      maxDurability: 5,
      blocksVision: true,
      blocksMovement: true,
    } as any;

    world.world.add(cover);

    const start = vec3(-2, 0, 40);
    const end = vec3(2, 0, 40);
    // Initial LOS blocked by cover
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: world.obstacles.entities })).toBe(true);

    const destroyed = applyDamageToObstacle(world, cover.id, 10);
    expect(destroyed).toBe(true);

    // Obstacle should be removed from the world
    expect(world.obstacles.entities.find((o) => o.id === cover.id)).toBeUndefined();

    // LOS should now be clear (assuming no other static geometry block on this segment)
    // debug info (kept temporarily)
    // final LOS check after cover removal
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: world.obstacles.entities })).toBe(false);
  });
});
