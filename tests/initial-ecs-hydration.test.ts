import { describe, it, expect } from 'vitest';
import { world, createRobotEntity, resetWorld } from '../src/ecs/miniplexStore';

describe('Initial ECS hydration', () => {
  it('robots are present in query right after spawn', () => {
    // Arrange: reset and spawn a couple of robots (ensures world not empty)
    resetWorld();
    createRobotEntity({ team: 'red', weapon: { id: 'gun-1', type: 'gun', power: 1 }, weaponState: { firing: false, cooldownRemaining: 0 } });
    createRobotEntity({ team: 'blue', weapon: { id: 'gun-2', type: 'gun', power: 1 }, weaponState: { firing: false, cooldownRemaining: 0 } });

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
