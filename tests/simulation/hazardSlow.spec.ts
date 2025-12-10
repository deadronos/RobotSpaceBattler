import { describe, it, expect } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';
import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';

describe('hazard slow/status effects', () => {
  it('applies slow effect to robot while inside active hazard and removes when inactive', () => {
    const world = createBattleWorld();

    const robot = {
      id: 'r-slow',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(0, 0, 0),
      velocity: vec3(1, 0, 0),
      orientation: 0,
      speed: 1,
      weapon: 'gun' as const,
      fireCooldown: 0,
      fireRate: 1,
      health: 100,
      maxHealth: 100,
      ai: {} as any,
      kills: 0,
      isCaptain: false,
      spawnIndex: 0,
      lastDamageTimestamp: 0,
    } as any;

    world.world.add(robot);

    const hazard = {
      id: 'hz-slow',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 2000, activeMs: 1000, offsetMs: 0 },
      hazardEffects: [{ kind: 'slow' as const, amount: 0.5 }],
      active: false,
    } as any;

    world.world.add(hazard);

    // Start at time 0 - active window
    world.state.elapsedMs = 0;
    updateHazardSystem(world, 100);
    // debug

    // slowMultiplier should be applied (1 - 0.5 = 0.5)
    expect(world.robots.entities[0].slowMultiplier).toBeCloseTo(0.5, 6);

    // When hazard becomes inactive slowMultiplier should reset
    world.state.elapsedMs = 1500; // outside active window
    updateHazardSystem(world, 100);
    // debug

    expect(world.robots.entities[0].slowMultiplier).toBe(1);
  });

  it('applies status flag with duration and persists after deactivation until expiry', () => {
    const world = createBattleWorld();

    const robot = {
      id: 'r-status',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(0, 0, 0),
      velocity: vec3(0, 0, 0),
      orientation: 0,
      speed: 0,
      weapon: 'gun' as const,
      fireCooldown: 0,
      fireRate: 1,
      health: 100,
      maxHealth: 100,
      ai: {} as any,
      kills: 0,
      isCaptain: false,
      spawnIndex: 0,
      lastDamageTimestamp: 0,
    } as any;

    world.world.add(robot);

    const hazard = {
      id: 'hz-status',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 2000, activeMs: 500, offsetMs: 0 },
      hazardEffects: [{ kind: 'status' as const, amount: 1, durationMs: 500 }],
      active: false,
    } as any;

    world.world.add(hazard);

    // At t=0 hazard is active -> status added and expiration extended
    world.state.elapsedMs = 0;
    updateHazardSystem(world, 100);
    // debug

    // Simulate another tick while still active so the expiration is pushed forward
    world.state.elapsedMs = 400;
    updateHazardSystem(world, 100);
    // debug

    expect(robot.statusFlags).toBeDefined();
    expect(robot.statusFlags!.length).toBeGreaterThan(0);

    const flag = `hazard:${hazard.id}`;
    expect(robot.statusFlags).toContain(flag);

    // Move time to after the active window but before expiry (active window ends at 500ms)
    world.state.elapsedMs = 600; // deactivated at cyclePos=600 (period=2000 activeMs=500)
    updateHazardSystem(world, 100);

    // Flag should still be present due to durationMs=500 (expires around last active tick + 500ms)
    expect(robot.statusFlags).toContain(flag);

    // Move time past expiry (but still within an inactive window) and check removal
    world.state.elapsedMs = 1000; // well past expiry (900) and in inactive window
    updateHazardSystem(world, 100);

    expect(robot.statusFlags).not.toContain(flag);
  });
});
