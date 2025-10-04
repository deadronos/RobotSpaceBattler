import { describe, it, expect } from 'vitest';
import { world, createRobotEntity, resetWorld } from '../src/ecs/miniplexStore';

describe('Initial ECS hydration', () => {
  it('robots are present in query right after spawn', () => {
    // Arrange: reset and spawn a couple of robots (ensures world not empty)
    resetWorld();
    const createWeapon = (id: string, ownerId: string, team: 'red' | 'blue') => ({
      id,
      type: 'gun' as const,
      power: 1,
      ownerId,
      team,
      cooldown: 0.5,
    });
    const createWeaponState = () => ({ firing: false, cooldownRemaining: 0 });
    createRobotEntity({
      team: 'red',
      weapon: createWeapon('gun-1', 'robot-red', 'red'),
      weaponState: createWeaponState(),
      robot: {
        id: 'robot-red',
        team: 'red',
        health: { current: 100, max: 100, alive: true },
        weapon: { id: 'gun-1', type: 'gun', power: 1 },
        weaponState: createWeaponState(),
      },
    });
    createRobotEntity({
      team: 'blue',
      weapon: createWeapon('gun-2', 'robot-blue', 'blue'),
      weaponState: createWeaponState(),
      robot: {
        id: 'robot-blue',
        team: 'blue',
        health: { current: 100, max: 100, alive: true },
        weapon: { id: 'gun-2', type: 'gun', power: 1 },
        weaponState: createWeaponState(),
      },
    });

    // Act: create a robots query matching Simulation.tsx criteria
    const robotsQuery = world.with('team', 'weapon', 'weaponState');
    const connected = robotsQuery.connect();

    try {
      // Assert: immediately populated (no extra ticks required)
      expect(robotsQuery.entities.length).toBeGreaterThan(0);
    } finally {
      connected.disconnect();
    }
  });
});
