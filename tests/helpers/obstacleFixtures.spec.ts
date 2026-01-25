import { describe, it, expect } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import { loadFixture, spawnFixtureInWorld } from './obstacleFixtures';

describe('obstacleFixture helpers', () => {
  it('loads sample fixture and spawns obstacles into the world', () => {
    const fixture = loadFixture('specs/006-dynamic-arena-obstacles/dynamic-arena-sample.json');
    expect(fixture).toBeDefined();
    expect(Array.isArray(fixture.obstacles)).toBe(true);

    const world = createBattleWorld();
    spawnFixtureInWorld(world, fixture);

    expect(world.obstacles.entities.length).toBe(fixture.obstacles.length);
    for (const ob of fixture.obstacles) {
      expect(world.obstacles.entities.some((e) => e.id === ob.id)).toBe(true);
    }
  });
});
