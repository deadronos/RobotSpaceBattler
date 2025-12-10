import { describe, it, expect, vi } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { syncObstaclesToRapier, updateRapierObstacleTransforms } from '../../src/simulation/obstacles/rapierIntegration';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { vec3 } from '../../src/lib/math/vec3';

describe('Rapier integration for obstacles', () => {
  it('creates colliders in rapier world when available', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'r1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(1, 0, 0),
      shape: { kind: 'box' as const, halfWidth: 1, halfDepth: 1 },
      blocksMovement: true,
      blocksVision: true,
    };

    world.world.add(obstacle);

    const mockRapierWorld = {
      createObstacleCollider: vi.fn((id: string, shape: any, position: any) => ({ id, shape, position })),
    } as any;

    world.rapierWorld = mockRapierWorld;

    syncObstaclesToRapier(world);

    expect(mockRapierWorld.createObstacleCollider).toHaveBeenCalledTimes(1);
    expect(mockRapierWorld.createObstacleCollider).toHaveBeenCalledWith('r1', obstacle.shape, obstacle.position, 0);
  });

  it('updates rapier transforms when obstacles move', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'r2',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(-2, 0, 0),
      blocksMovement: true,
      blocksVision: true,
      movementPattern: {
        patternType: 'linear' as const,
        points: [vec3(-2, 0, 0), vec3(2, 0, 0)],
        speed: 1,
        loop: false,
      },
    };

    world.world.add(obstacle);

    const mockRapierWorld = {
      createObstacleCollider: vi.fn((id: string) => ({ id })),
      updateObstacleTransform: vi.fn((id: string, position: any) => true),
    } as any;

    world.rapierWorld = mockRapierWorld;

    // create colliders
    syncObstaclesToRapier(world);

    // move obstacle by 1 second -> -2 -> -1
    updateObstacleMovement(world, 1000);

    // updateRapierObstacleTransforms should be called by movement update; ensure world rapier update called
    expect(mockRapierWorld.updateObstacleTransform).toHaveBeenCalled();

    // Confirm that update was invoked for the specific obstacle id with new position
    const calledWith = mockRapierWorld.updateObstacleTransform.mock.calls.some(
      (args: any[]) => args[0] === 'r2' && args[1] && typeof args[1].x === 'number'
    );
    expect(calledWith).toBe(true);
  });
});
