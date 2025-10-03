import { describe, it, expect } from 'vitest';

describe('Initial ECS hydration', () => {
  it('robots are present in query right after spawn', () => {
    // Arrange: spawn default teams (also resets the world internally)

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
