import { describe, expect, it } from 'vitest';

import { updateAISystem } from '../../src/ecs/systems/aiSystem';
import { createBattleWorld, toVec3 } from '../../src/ecs/world';
import { createTestRobot } from '../helpers/robotFactory';

describe('updateAISystem roaming and LOS timeout', () => {
  it('clears stale memory after timeout and picks a roam target', () => {
    const world = createBattleWorld();

    // Place robots away from central obstacle at (0,0) so LOS is unobstructed
    const red = createTestRobot({ id: 'red-1', team: 'red', position: toVec3(-10, 0, 0) });
    const blue = createTestRobot({ id: 'blue-1', team: 'blue', position: toVec3(-10, 0, 10) });

    world.world.add(red);
    world.world.add(blue);

    // initial tick at t=0; robots are within sensor range and visible
    world.state.elapsedMs = 0;
    updateAISystem(world, () => 0.5);

    // red should have picked blue as target
    const robots = world.robots.entities;
    const redRobot = robots.find((r) => r.id === 'red-1')!;
    expect(redRobot.ai.targetId).toBe('blue-1');

    // Move blue far away so it's no longer visible and advance time > 1.5s
    blue.position = toVec3(0, 0, 100);
    world.state.elapsedMs = 2000;

    updateAISystem(world, () => 0.5);

    const updatedRed = world.robots.entities.find((r) => r.id === 'red-1')!;
    // target should be cleared and a roamTarget/searchPosition should be set
    expect(updatedRed.ai.targetId).toBeUndefined();
    expect(updatedRed.ai.searchPosition).not.toBeNull();
    expect(updatedRed.ai.roamTarget).not.toBeNull();
  });
});
