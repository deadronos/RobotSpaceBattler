import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateAISystem } from '../../src/ecs/systems/aiSystem';
import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';

function createRobot(id: string, team: 'red' | 'blue', position: ReturnType<typeof vec3>) {
  return {
    id,
    kind: 'robot' as const,
    team,
    position,
    velocity: vec3(0, 0, 0),
    orientation: 0,
    weapon: 'gun' as const,
    fireCooldown: 0,
    fireRate: 1,
    speed: 0,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'seek',
      targetId: undefined,
      directive: 'balanced',
      anchorPosition: null,
      anchorDistance: null,
      strafeSign: 1 as 1 | -1,
      targetDistance: null,
      visibleEnemyIds: [],
      enemyMemory: {},
      searchPosition: null,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  } as any;
}

describe('AI reroute with dynamic obstacles', () => {
  it('reroutes around blocking obstacle within a few ticks', () => {
    const world = createBattleWorld();

    const robot = createRobot('r-ai', 'red', vec3(-10, 0, -40));
    const target = createRobot('t-ai', 'blue', vec3(10, 0, -40));
    const barrier = {
      id: 'blocker',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(0, 0, -40),
      shape: { kind: 'box', halfWidth: 2, halfDepth: 2 },
      blocksMovement: true,
      blocksVision: true,
      active: true,
    } as any;

    world.world.add(robot);
    world.world.add(target);
    world.world.add(barrier);

    for (let i = 0; i < 6; i += 1) {
      updateAISystem(world, () => 0.5);
      // eslint-disable-next-line no-console
      // console.log('ai', i, 'targetId', robot.ai.targetId, 'blockedFrames', robot.ai.blockedFrames);
      // eslint-disable-next-line no-console
      // console.log('LOS blocked?', isLineOfSightBlockedRuntime(robot.position, target.position, { obstacles: world.obstacles.entities }));
      updateMovementSystem(world, 1);
      // eslint-disable-next-line no-console
      // console.log('movement', i, 'pos', robot.position.z, 'speed', robot.speed);
      world.state.elapsedMs += 1000;
      world.state.frameIndex += 1;
    }

    expect(Math.abs(robot.position.z)).toBeGreaterThan(0.1);
  });
});
