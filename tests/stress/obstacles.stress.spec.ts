import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';

describe('stress: 50 active obstacles', () => {
  it('updates 50 obstacles within reasonable time', () => {
    const world = createBattleWorld();

    for (let i = 0; i < 50; i += 1) {
      world.world.add({
        id: `obs-${i}`,
        kind: 'obstacle' as const,
        obstacleType: i % 3 === 0 ? 'hazard' : i % 3 === 1 ? 'destructible' : 'barrier',
        position: vec3((i % 10) * 5 - 25, 0, Math.floor(i / 10) * 5 - 10),
        shape: i % 3 === 0 ? { kind: 'circle', radius: 2 } : { kind: 'box', halfWidth: 1.5, halfDepth: 1.5 },
        blocksVision: i % 3 !== 0,
        blocksMovement: i % 3 !== 0,
        active: true,
        movementPattern: {
          patternType: 'oscillate',
          points: [vec3(-2, 0, 0), vec3(2, 0, 0)],
          speed: 2 + (i % 5),
          loop: true,
          pingPong: true,
          phase: (i % 5) / 5,
        },
        hazardSchedule: i % 3 === 0 ? { periodMs: 3000, activeMs: 1200, offsetMs: i * 10 } : null,
        hazardEffects: i % 3 === 0 ? [{ kind: 'damage', amount: 1, perSecond: true }] : null,
        durability: i % 3 === 1 ? 10 : undefined,
        maxDurability: i % 3 === 1 ? 10 : undefined,
      } as any);
    }

    const start = performance.now();
    for (let step = 0; step < 100; step += 1) {
      world.state.elapsedMs += 50;
      updateObstacleMovement(world, 50);
      updateHazardSystem(world, 50);
    }
    const durationMs = performance.now() - start;

    expect(durationMs).toBeLessThan(800);
  });
});
