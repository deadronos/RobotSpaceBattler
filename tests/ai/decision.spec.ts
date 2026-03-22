import { describe, expect, it } from 'vitest';

import { createBattleWorld, toVec3 } from '../../src/ecs/world';
import { updateTargeting } from '../../src/simulation/ai/decision';
import { createTestRobot } from '../helpers/robotFactory';

describe('updateTargeting medic support behavior', () => {
  it('pursues an injured ally when cover blocks direct line of sight', () => {
    const world = createBattleWorld();
    const medic = createTestRobot({
      id: 'medic-1',
      team: 'red',
      role: 'medic',
      weapon: 'heal',
      position: toVec3(-6, 0, 0),
    });
    const injuredAlly = createTestRobot({
      id: 'ally-injured',
      team: 'red',
      position: toVec3(6, 0, 0),
      health: 40,
      maxHealth: 100,
    });
    const barrier = {
      id: 'cover-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: toVec3(0, 0, 0),
      shape: { kind: 'box' as const, halfWidth: 1, halfDepth: 4 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
    };

    world.world.add(medic);
    world.world.add(injuredAlly);
    world.world.add(barrier);

    const { target } = updateTargeting(
      medic,
      world.robots.entities,
      [],
      world,
      () => 0.5,
      world.getRobotsByTeam('red'),
    );

    expect(target?.id).toBe('ally-injured');
    expect(medic.ai.targetId).toBe('ally-injured');
    expect(medic.ai.roamTarget).toBeNull();
  });

  it('prefers a visible injured ally over a blocked one', () => {
    const world = createBattleWorld();
    const medic = createTestRobot({
      id: 'medic-1',
      team: 'red',
      role: 'medic',
      weapon: 'heal',
      position: toVec3(-6, 0, 0),
    });
    const visibleAlly = createTestRobot({
      id: 'ally-visible',
      team: 'red',
      position: toVec3(-6, 0, 6),
      health: 70,
      maxHealth: 100,
    });
    const blockedAlly = createTestRobot({
      id: 'ally-blocked',
      team: 'red',
      position: toVec3(6, 0, 0),
      health: 10,
      maxHealth: 100,
    });
    const barrier = {
      id: 'cover-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: toVec3(0, 0, 0),
      shape: { kind: 'box' as const, halfWidth: 1, halfDepth: 4 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
    };

    world.world.add(medic);
    world.world.add(visibleAlly);
    world.world.add(blockedAlly);
    world.world.add(barrier);

    const { target } = updateTargeting(
      medic,
      world.robots.entities,
      [],
      world,
      () => 0.5,
      world.getRobotsByTeam('red'),
    );

    expect(target?.id).toBe('ally-visible');
    expect(medic.ai.targetId).toBe('ally-visible');
  });
});