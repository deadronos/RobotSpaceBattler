import { beforeEach, describe, expect, it } from 'vitest';

import type { Robot } from '../../../../src/ecs/entities/Robot';
import { createTestWorld, type TestWorld } from './testUtils';
import { applyAdaptiveStrategy } from '../../../../src/ecs/systems/ai/adaptiveStrategy';

function formationMagnitude(robot: Robot): number {
  const { x, y, z } = robot.aiState.formationOffset;
  return Math.hypot(x, y, z);
}

describe('adaptiveStrategy system', () => {
  let world: TestWorld;
  let redRobots: Robot[];

  beforeEach(() => {
    world = createTestWorld();
    redRobots = world.entities.filter((robot) => robot.team === 'red');
  });

  it('switches to defensive stance and expands formations when disadvantaged', () => {
    world.teams.red.activeRobots = 4;
    world.teams.blue.activeRobots = 10;
    world.teams.red.aggregateStats.averageHealthRemaining = 35;

    const beforeMagnitudes = redRobots.map((robot) => formationMagnitude(robot));

    applyAdaptiveStrategy(world);

    const afterMagnitudes = redRobots.map((robot) => formationMagnitude(robot));

    redRobots.forEach((robot) => {
      expect(robot.aiState.behaviorMode === 'defensive' || robot.aiState.behaviorMode === 'retreating').toBe(true);
    });

    afterMagnitudes.forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(beforeMagnitudes[index]);
    });
  });

  it('pushes to aggressive stance and tightens formations when advantaged', () => {
    world.teams.red.activeRobots = 9;
    world.teams.blue.activeRobots = 3;
    world.teams.red.aggregateStats.averageHealthRemaining = 85;

    const beforeMagnitudes = redRobots.map((robot) => formationMagnitude(robot));

    applyAdaptiveStrategy(world);

    redRobots.forEach((robot) => {
      if (robot.health > 40) {
        expect(robot.aiState.behaviorMode).toBe('aggressive');
      }
    });

    const afterMagnitudes = redRobots.map((robot) => formationMagnitude(robot));
    afterMagnitudes.forEach((value, index) => {
      expect(value).toBeLessThanOrEqual(beforeMagnitudes[index]);
    });
  });
});
