import { describe, it, expect } from 'vitest';
import { createTestStepContext } from '../helpers/fixedStepHarness';
import { weaponSystem } from '../../src/systems/WeaponSystem';
import { respawnSystem, processRespawnQueue } from '../../src/systems/RespawnSystem';
import { aiSystem } from '../../src/systems/AISystem';
import { createWorldController } from '../../src/ecs/worldFactory';

describe('Determinism guards (contract)', () => {
  it('weaponSystem must throw when called without StepContext.idFactory or stepContext (no fallbacks)', () => {
    const world = createWorldController<any>().world;

    // Prepare a simple entity that would attempt to fire
    world.entities.push({ id: 1, team: 'red', position: [0,0,0], weapon: { id: 'w1', type: 'gun', cooldown: 0 }, weaponState: { firing: true } });

    // Call weaponSystem *without* providing stepContext or idFactory
    expect(() => {
      // Positional API that historically allowed fallbacks
      weaponSystem(world, 1/60, undefined, undefined, undefined);
    }).toThrow();

    // Object param API without stepContext
    expect(() => {
      weaponSystem({ world, events: { weaponFired: [] } });
    }).toThrow();
  });

  it('respawnSystem should throw when called in old API without deterministic now/stepContext', () => {
    const world = createWorldController<any>().world;
    // Call old API: respawnSystem(world, deathEvents) should throw because it uses Date.now fallback
    expect(() => {
      respawnSystem(world, [{ entityId: '1', team: 'red' } as any]);
    }).toThrow();

    // New API: processRespawnQueue must throw if stepContext is missing
    expect(() => {
      processRespawnQueue({ queue: [], spawnConfig: {} as any } as any);
    }).toThrow();

    // If a deterministic now is provided but no idFactory, it should still throw (no implicit id fallbacks)
    expect(() => {
      respawnSystem(world, [], { now: 12345 });
    }).toThrow();

    // With both deterministic now and an idFactory provided, it should not throw for empty events
    expect(() => {
      respawnSystem(world, [], { now: 12345, idFactory: () => 'test' } as any);
    }).not.toThrow();
  });

  it('aiSystem must throw when simNowMs is not provided (no Date.now fallback)', () => {
    const world = createWorldController<any>().world;
    world.entities.push({ id: 1, team: 'red', position: [0,0,0], weapon: { id: 'w1', type: 'gun', cooldown: 0 }, weaponState: { firing: false } });

    expect(() => {
      // call without simNowMs
      aiSystem(world, () => 0.5, undefined, undefined as any);
    }).toThrow();
  });
});