import { describe, expect, it } from 'vitest';
import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';
import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';

describe('Integration: hazard active window applies effects', () => {
  it('applies damage per second and slow only during active windows', () => {
    const world = createBattleWorld();

    // Robot inside the hazard area
    const robot = {
      id: 'r-int-1',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(0, 0, 0),
      velocity: vec3(1, 0, 0),
      orientation: 0,
      weapon: 'gun' as const,
      fireCooldown: 0,
      fireRate: 1,
      speed: 1,
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
      id: 'hz-int-1',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 2000, activeMs: 1000, offsetMs: 0 },
      hazardEffects: [
        { kind: 'damage' as const, amount: 10, perSecond: true },
        { kind: 'slow' as const, amount: 0.5 },
      ],
      active: false,
    } as any;

    world.world.add(hazard);

    // Active window at t=0
    world.state.elapsedMs = 0;
    updateHazardSystem(world, 1000);
    // After 1 second of active window: damage 10 applied
    expect(robot.health).toBeCloseTo(90, 5);
    // Slow applied (1 - amount = 0.5)
    expect(robot.slowMultiplier).toBeCloseTo(0.5, 5);

    // If move the robot with movement system, speed should reflect slow multiplier
    updateMovementSystem(world, 1);
    // velocity before friction is 1 -> scaled by friction (0.92) then by slow multiplier (0.5): 1 * 0.92 * 0.5 = 0.46
    expect(robot.speed).toBeCloseTo(0.46, 5);

    // Move to an inactive time (t=1500ms -> outside active window)
    world.state.elapsedMs = 1500;
    updateHazardSystem(world, 1000);

    // No additional damage should be applied
    expect(robot.health).toBeCloseTo(90, 5);
    // Slow should be removed
    expect(robot.slowMultiplier).toBe(1);
  });
});
