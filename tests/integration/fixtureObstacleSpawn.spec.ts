import { describe, it, expect } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import { spawnMatch } from '../../src/simulation/match/matchSpawner';
import { loadFixture } from '../helpers/obstacleFixtures';

describe('Fixture Obstacle Spawning', () => {
  const fixturePath = 'specs/006-dynamic-arena-obstacles/dynamic-arena-sample.json';

  it('spawns obstacles from fixture data into a match', () => {
    const world = createBattleWorld();
    const fixture = loadFixture(fixturePath);

    spawnMatch(world, {
      seed: 12345,
      obstacleFixture: fixture,
    });

    const robots = world.robots.entities;
    expect(robots.length).toBeGreaterThan(0);

    const obstacles = world.obstacles.entities;
    expect(obstacles.length).toBe(fixture.obstacles.length);

    const barrier = obstacles.find((o) => o.id === 'barrier-a');
    expect(barrier).toBeDefined();
    expect(barrier?.obstacleType).toBe('barrier');
    expect(barrier?.shape?.kind).toBe('box');
    expect(barrier?.movementPattern?.patternType).toBe('linear');

    const hazard = obstacles.find((o) => o.id === 'hazard-x');
    expect(hazard).toBeDefined();
    expect(hazard?.obstacleType).toBe('hazard');
    expect(hazard?.shape?.kind).toBe('circle');
    expect(hazard?.hazardSchedule).toBeDefined();
    expect(hazard?.hazardEffects).toBeDefined();

    const cover = obstacles.find((o) => o.id === 'cover-01');
    expect(cover).toBeDefined();
    expect(cover?.obstacleType).toBe('destructible');
    expect(cover?.durability).toBeDefined();
    expect(cover?.maxDurability).toBeDefined();
  });

  it('spawns a match without obstacles when no fixture is provided', () => {
    const world = createBattleWorld();

    spawnMatch(world, {
      seed: 54321,
    });

    const robots = world.robots.entities;
    expect(robots.length).toBeGreaterThan(0);

    const obstacles = world.obstacles.entities;
    expect(obstacles.length).toBe(0);
  });

  it('normalizes obstacle properties based on fixture data', () => {
    const world = createBattleWorld();
    const fixture = loadFixture(fixturePath);

    spawnMatch(world, {
      seed: 12345,
      obstacleFixture: fixture,
    });

    const obstacles = world.obstacles.entities;

    const barrier = obstacles.find((o) => o.id === 'barrier-a');
    expect(barrier?.position).toEqual({ x: -5, y: 0, z: 0 });
    expect(barrier?.movementPattern?.patternType).toBe('linear');
    expect(barrier?.movementPattern?.speed).toBe(1);
    expect(barrier?.movementPattern?.points?.[1]).toEqual({ x: 5, y: 0, z: 0 });

    const hazard = obstacles.find((o) => o.id === 'hazard-x');
    expect(hazard?.position).toEqual({ x: 8, y: 0, z: 3 });
    expect(hazard?.hazardSchedule?.periodMs).toBe(4000);
    expect(hazard?.hazardSchedule?.activeMs).toBe(1000);
    expect(hazard?.hazardSchedule?.offsetMs).toBe(200);
    expect(hazard?.hazardEffects?.[0]?.kind).toBe('damage');
    expect(hazard?.hazardEffects?.[0]?.amount).toBe(6);
    expect(hazard?.active).toBe(false);

    const cover = obstacles.find((o) => o.id === 'cover-01');
    expect(cover?.position).toEqual({ x: 0, y: 0, z: 4 });
    expect(cover?.durability).toBe(10);
    expect(cover?.maxDurability).toBe(10);
  });
});
