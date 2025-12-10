import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';

describe('updateHazardSystem', () => {
  it('applies damage to a robot inside an active circular hazard', () => {
    const world = createBattleWorld();
    const robot = {
      id: 'r1',
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
      id: 'haz-1',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 1000, activeMs: 1000, offsetMs: 0 },
      hazardEffects: [{ kind: 'damage' as const, amount: 10, perSecond: true }],
      active: false,
    } as any;

    world.world.add(hazard);

    world.state.elapsedMs = 0;
    updateHazardSystem(world, 1000);

    expect(robot.health).toBeCloseTo(90, 5);
    expect(hazard.active).toBe(true);
  });

  it('does not apply damage when hazard is inactive', () => {
    const world = createBattleWorld();
    const robot = {
      id: 'r2',
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
      id: 'haz-2',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 2000, activeMs: 500, offsetMs: 0 },
      hazardEffects: [{ kind: 'damage' as const, amount: 10, perSecond: true }],
      active: false,
    } as any;

    world.world.add(hazard);

    // Set time to a moment outside the active window
    world.state.elapsedMs = 1000; // period=2000, activeMs=500 -> cyclePos=1000 -> inactive
    updateHazardSystem(world, 1000);

    expect(robot.health).toBeCloseTo(100, 6);
    expect(hazard.active).toBe(false);
  });
});
