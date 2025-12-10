import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import {
  exportObstacleFixture,
  parseObstacleFixture,
  replaceObstaclesFromFixture,
  serializeObstacleFixture,
} from '../../src/ui/fixtureLoader';

describe('fixtureLoader', () => {
  it('exports and serializes obstacles from the world', () => {
    const world = createBattleWorld();
    world.world.add({
      id: 'barrier-a',
      kind: 'obstacle',
      obstacleType: 'barrier',
      position: vec3(1, 0, 2),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
    });

    const fixture = exportObstacleFixture(world);
    expect(fixture.obstacles).toHaveLength(1);
    const json = serializeObstacleFixture(fixture);
    const parsed = parseObstacleFixture(json);
    expect(parsed.obstacles[0].id).toBe('barrier-a');
    expect(parsed.obstacles[0].shape?.kind).toBe('box');
  });

  it('replaces existing obstacles with fixture contents', () => {
    const world = createBattleWorld();
    world.world.add({
      id: 'old-obs',
      kind: 'obstacle',
      obstacleType: 'barrier',
      position: vec3(0, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
    });

    const fixture = {
      obstacles: [
        {
          id: 'new-obs',
          obstacleType: 'hazard' as const,
          position: vec3(5, 0, 5),
          shape: { kind: 'circle', radius: 2 },
          hazardSchedule: { periodMs: 2000, activeMs: 500, offsetMs: 0 },
          hazardEffects: [{ kind: 'damage' as const, amount: 1, perSecond: true }],
        },
      ],
    };

    replaceObstaclesFromFixture(world, fixture);

    expect(world.obstacles.entities).toHaveLength(1);
    expect(world.obstacles.entities[0].id).toBe('new-obs');
    expect(world.obstacles.entities[0].obstacleType).toBe('hazard');
    expect(world.obstacles.entities[0].shape?.kind).toBe('circle');
  });
});
