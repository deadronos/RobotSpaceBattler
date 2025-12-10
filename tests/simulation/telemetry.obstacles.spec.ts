import { describe, it, expect } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { updateHazardSystem } from '../../src/simulation/obstacles/hazardSystem';
import { applyDamageToObstacle } from '../../src/simulation/obstacles/destructibleSystem';
import { createTelemetryPort } from '../../src/runtime/simulation/telemetryAdapter';
import { useTelemetryStore } from '../../src/state/telemetryStore';

describe('telemetry: obstacle lifecycle events', () => {
  it('records obstacle:move when obstacles are moved', () => {
    const world = createBattleWorld();
    const telemetry = createTelemetryPort();
    telemetry.reset('test-move');

    const obstacle = {
      id: 'move-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(0, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      movementPattern: {
        patternType: 'linear' as const,
        points: [vec3(0, 0, 0), vec3(10, 0, 0)],
        speed: 5,
        loop: false,
        progress: 0,
      },
      active: true,
    } as any;

    world.world.add(obstacle);
    // set deterministic frame/time
    world.state.frameIndex = 42;
    world.state.elapsedMs = 1000;

    updateObstacleMovement(world, 1000, telemetry);

    const events = useTelemetryStore.getState().events;
    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1] as any;
    expect(last.type).toBe('obstacle:move');
    expect(last.obstacleId).toBe('move-1');
    expect(last.frameIndex).toBe(42);
    expect(last.timestampMs).toBe(world.state.elapsedMs);
  });

  it('records hazard activate/deactivate events', () => {
    const world = createBattleWorld();
    const telemetry = createTelemetryPort();
    telemetry.reset('test-hazard');

    const robot = {
      id: 'r1',
      kind: 'robot' as const,
      team: 'red' as const,
      position: vec3(0, 0, 0),
      velocity: vec3(0, 0, 0),
      orientation: 0,
      speed: 0,
      weapon: 'gun' as const,
      fireCooldown: 0,
      fireRate: 1,
      health: 100,
      maxHealth: 100,
      ai: {} as any,
      kills: 0,
      isCaptain: false,
      spawnIndex: 0,
      lastDamageTimestamp: 0,
    } as any;

    world.world.add(robot);

    const hazard = {
      id: 'hz-tele',
      kind: 'obstacle' as const,
      obstacleType: 'hazard' as const,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'circle', radius: 3 },
      hazardSchedule: { periodMs: 2000, activeMs: 500, offsetMs: 0 },
      hazardEffects: [{ kind: 'damage' as const, amount: 1, perSecond: true }],
      active: false,
    } as any;

    world.world.add(hazard);

    world.state.frameIndex = 1;
    world.state.elapsedMs = 0;
    updateHazardSystem(world, 100, telemetry);

    world.state.frameIndex = 2;
    world.state.elapsedMs = 600; // outside active window -> deactivation
    updateHazardSystem(world, 100, telemetry);

    const events = useTelemetryStore.getState().events;
    expect(events.some((e) => (e as any).type === 'hazard:activate')).toBe(true);
    expect(events.some((e) => (e as any).type === 'hazard:deactivate')).toBe(true);
  });

  it('records cover:destroyed when destructible obstacles are removed', () => {
    const world = createBattleWorld();
    const telemetry = createTelemetryPort();
    telemetry.reset('test-destroy');

    const cover = {
      id: 'cover-t',
      kind: 'obstacle' as const,
      obstacleType: 'destructible' as const,
      position: vec3(0, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      durability: 5,
      maxDurability: 5,
      active: true,
    } as any;

    world.world.add(cover);
    world.state.frameIndex = 7;
    world.state.elapsedMs = 12345;

    applyDamageToObstacle(world, cover.id, 10, telemetry);

    const events = useTelemetryStore.getState().events;
    expect(events.some((e) => (e as any).type === 'cover:destroyed')).toBe(true);
    const evt = events.find((e) => (e as any).type === 'cover:destroyed') as any;
    expect(evt.obstacleId).toBe(cover.id);
    expect(evt.frameIndex).toBe(7);
    expect(evt.timestampMs).toBe(12345);
  });
});
