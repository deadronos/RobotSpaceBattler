import { describe, it, expect } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import { spawnTeams } from '../../src/ecs/systems/spawnSystem';

describe('Fixture Obstacle Spawning', () => {
  it('should spawn obstacles from fixture file into match', () => {
    const world = createBattleWorld();
    
    // Spawn teams with obstacles fixture
    spawnTeams(world, {
      seed: 12345,
      obstacles: 'specs/fixtures/dynamic-arena-sample.json',
    });
    
    // Verify robots were spawned (sanity check)
    const robots = world.world.with('robot').entities;
    expect(robots.length).toBeGreaterThan(0);
    
    // Verify obstacles were spawned from fixture
    const obstacles = world.world.with('obstacle').entities;
    expect(obstacles.length).toBeGreaterThan(0);
    
    // Verify specific obstacles from dynamic-arena-sample.json are present
    const barrier = obstacles.find(o => o.id === 'barrier-a');
    expect(barrier).toBeDefined();
    expect(barrier?.obstacleType).toBe('barrier');
    expect(barrier?.shape.kind).toBe('box');
    expect(barrier?.movementPattern).toBeDefined();
    expect(barrier?.movementPattern?.kind).toBe('linear');
    
    const hazard = obstacles.find(o => o.id === 'hazard-x');
    expect(hazard).toBeDefined();
    expect(hazard?.obstacleType).toBe('hazard');
    expect(hazard?.shape.kind).toBe('circle');
    expect(hazard?.hazardSchedule).toBeDefined();
    expect(hazard?.hazardEffects).toBeDefined();
    
    const cover = obstacles.find(o => o.id === 'cover-01');
    expect(cover).toBeDefined();
    expect(cover?.obstacleType).toBe('destructible');
    expect(cover?.durability).toBeDefined();
    expect(cover?.maxDurability).toBeDefined();
  });
  
  it('should handle missing fixture path gracefully', () => {
    const world = createBattleWorld();
    
    // Should not throw when fixture path does not exist
    expect(() => {
      spawnTeams(world, {
        seed: 12345,
        obstacles: 'nonexistent/fixture.json',
      });
    }).not.toThrow();
    
    // Robots should still spawn
    const robots = world.world.with('robot').entities;
    expect(robots.length).toBeGreaterThan(0);
    
    // No obstacles should be spawned
    const obstacles = world.world.with('obstacle').entities;
    expect(obstacles.length).toBe(0);
  });
  
  it('should spawn obstacles with correct properties matching fixture data', () => {
    const world = createBattleWorld();
    
    spawnTeams(world, {
      seed: 12345,
      obstacles: 'specs/fixtures/dynamic-arena-sample.json',
    });
    
    const obstacles = world.world.with('obstacle').entities;
    
    // Verify barrier-a has correct position and movement pattern
    const barrier = obstacles.find(o => o.id === 'barrier-a');
    expect(barrier?.position).toEqual({ x: -10, y: 0, z: 0 });
    expect(barrier?.movementPattern?.kind).toBe('linear');
    expect(barrier?.movementPattern?.speed).toBe(2);
    expect(barrier?.movementPattern?.targetPosition).toEqual({ x: 10, y: 0, z: 0 });
    
    // Verify hazard-x has correct schedule and effects
    const hazard = obstacles.find(o => o.id === 'hazard-x');
    expect(hazard?.position).toEqual({ x: 0, y: 0, z: 15 });
    expect(hazard?.hazardSchedule?.periodMs).toBe(5000);
    expect(hazard?.hazardSchedule?.activeMs).toBe(2000);
    expect(hazard?.hazardEffects?.damagePerSecond).toBe(5);
    
    // Verify cover-01 has correct durability
    const cover = obstacles.find(o => o.id === 'cover-01');
    expect(cover?.position).toEqual({ x: 5, y: 0, z: -8 });
    expect(cover?.durability).toBe(50);
    expect(cover?.maxDurability).toBe(50);
  });
});
