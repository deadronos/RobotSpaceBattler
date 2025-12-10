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

describe('AI deadlock detection with overlapping obstacles', () => {
  it('halts movement when path remains blocked for several ticks', () => {
    const world = createBattleWorld();

    const robot = createRobot('r-deadlock', 'red', vec3(0, 0, -40));
    const target = createRobot('t-deadlock', 'blue', vec3(0, 0, -20));

    // Wide barrier fully blocking corridor to the target
    const wideBarrier = {
      id: 'wall-wide',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(0, 0, -30),
      shape: { kind: 'box', halfWidth: 20, halfDepth: 1.5 },
      blocksMovement: true,
      blocksVision: true,
      active: true,
    } as any;

    // Secondary barrier behind to prevent simple backtracking escape
    const rearBarrier = {
      id: 'rear',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(0, 0, -44),
      shape: { kind: 'box', halfWidth: 4, halfDepth: 1 },
      blocksMovement: true,
      blocksVision: true,
      active: true,
    } as any;

    world.world.add(robot);
    world.world.add(target);
    world.world.add(wideBarrier);
    world.world.add(rearBarrier);

    for (let i = 0; i < 5; i += 1) {
      updateAISystem(world, () => 0.5);
      updateMovementSystem(world, 1);
      world.state.elapsedMs += 1000;
      world.state.frameIndex += 1;
    }

    expect(robot.speed).toBeLessThan(0.1);
    expect((robot.ai.blockedFrames ?? 0)).toBeGreaterThanOrEqual(3);
  });
});
