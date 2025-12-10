import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { applyDamageToObstacle } from '../../src/simulation/obstacles/destructibleSystem';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { createTelemetryPort } from '../../src/runtime/simulation/telemetryAdapter';
import { useTelemetryStore } from '../../src/state/telemetryStore';

describe('MatchTrace obstacle events', () => {
  it('records move, hazard toggle, and destroy events in deterministic order', () => {
    const world = createBattleWorld();
    const telemetry = createTelemetryPort();
    telemetry.reset('trace-obstacles');

    const movingBarrier = {
      id: 'move-t1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(0, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      movementPattern: {
        patternType: 'linear' as const,
        points: [vec3(0, 0, 0), vec3(5, 0, 0)],
        speed: 5,
      },
      active: true,
    } as any;

    const hazard = {
      id: 'haz-trace',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: vec3(2, 0, 0),
      shape: { kind: 'circle', radius: 2 },
      hazardSchedule: { periodMs: 1000, activeMs: 400, offsetMs: 0 },
      hazardEffects: [{ kind: 'damage' as const, amount: 1, perSecond: true }],
      active: false,
    } as any;

    const cover = {
      id: 'cover-trace',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      position: vec3(-2, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      durability: 5,
      maxDurability: 5,
      active: true,
    } as any;

    world.world.add(movingBarrier);
    world.world.add(hazard);
    world.world.add(cover);

    // Step movement at frame 1
    world.state.frameIndex = 1;
    world.state.elapsedMs = 50;
    updateObstacleMovement(world, 1000, telemetry);

    // Activate hazard inside its active window
    world.state.frameIndex = 2;
    world.state.elapsedMs = 100;
    updateHazardSystem(world, 100, telemetry);

    // Deactivate hazard after active window
    world.state.frameIndex = 3;
    world.state.elapsedMs = 700;
    updateHazardSystem(world, 100, telemetry);

    // Destroy cover
    world.state.frameIndex = 4;
    world.state.elapsedMs = 900;
    applyDamageToObstacle(world, cover.id, 10, telemetry);

    const events = useTelemetryStore.getState().events as any[];
    const obstacleEvents = events.filter((evt) =>
      evt.type === 'obstacle:move' ||
      evt.type === 'hazard:activate' ||
      evt.type === 'hazard:deactivate' ||
      evt.type === 'cover:destroyed',
    );

    expect(obstacleEvents.map((e) => e.type)).toEqual([
      'obstacle:move',
      'hazard:activate',
      'hazard:deactivate',
      'cover:destroyed',
    ]);

    expect(obstacleEvents.map((e) => e.sequenceId)).toEqual([1, 2, 3, 4]);
    expect(obstacleEvents.map((e) => e.timestampMs)).toEqual([50, 100, 700, 900]);
    expect(obstacleEvents.map((e) => e.frameIndex)).toEqual([1, 2, 3, 4]);
  });
});
