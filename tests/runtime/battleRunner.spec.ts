import type { World as RapierWorld } from '@dimforge/rapier3d-compat';
import { describe, expect, it, vi } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { createBattleRunner } from '../../src/runtime/simulation/battleRunner';
import { TelemetryPort } from '../../src/runtime/simulation/ports';
import { createMatchStateMachine } from '../../src/runtime/state/matchStateMachine';

// Mock Rapier World for testing (minimal stub cast to full type)
function createMockRapierWorld(): RapierWorld {
  return { timestep: 1 / 60 } as unknown as RapierWorld;
}

function createNoopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn(),
    recordSpawn: vi.fn(),
    recordFire: vi.fn(),
    recordDamage: vi.fn(),
    recordDeath: vi.fn(),
  };
}

describe('BattleRunner rapierWorld integration', () => {
  it('setRapierWorld stores the world reference on BattleWorld', () => {
    const world = createBattleWorld();
    const telemetry = createNoopTelemetry();
    const matchMachine = createMatchStateMachine();
    const runner = createBattleRunner(world, {
      seed: 12345,
      telemetry,
      matchMachine,
    });

    const mockRapierWorld = createMockRapierWorld();
    runner.setRapierWorld(mockRapierWorld);

    expect(world.rapierWorld).toBe(mockRapierWorld);
  });

  it('setRapierWorld(null) clears the world reference', () => {
    const world = createBattleWorld();
    const telemetry = createNoopTelemetry();
    const matchMachine = createMatchStateMachine();
    const runner = createBattleRunner(world, {
      seed: 12345,
      telemetry,
      matchMachine,
    });

    const mockRapierWorld = createMockRapierWorld();
    runner.setRapierWorld(mockRapierWorld);
    expect(world.rapierWorld).toBe(mockRapierWorld);

    runner.setRapierWorld(null);
    expect(world.rapierWorld).toBeUndefined();
  });

  it('getRapierWorld returns the stored world reference', () => {
    const world = createBattleWorld();
    const telemetry = createNoopTelemetry();
    const matchMachine = createMatchStateMachine();
    const runner = createBattleRunner(world, {
      seed: 12345,
      telemetry,
      matchMachine,
    });

    expect(runner.getRapierWorld()).toBeUndefined();

    const mockRapierWorld = createMockRapierWorld();
    runner.setRapierWorld(mockRapierWorld);
    expect(runner.getRapierWorld()).toBe(mockRapierWorld);
  });

  it('rapierWorld field is accessible on BattleWorld', () => {
    const world = createBattleWorld();
    // rapierWorld should be undefined by default
    expect(world.rapierWorld).toBeUndefined();
  });
});
