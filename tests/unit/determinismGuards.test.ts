import { describe, it, expect } from 'vitest';
import { createWorldController } from '../../src/ecs/worldFactory';
import { weaponSystem } from '../../src/systems/WeaponSystem';
import { respawnSystem, processRespawnQueue } from '../../src/systems/RespawnSystem';
import { aiSystem } from '../../src/systems/AISystem';

describe('determinism guards (unit)', () => {
  it('weaponSystem throws when stepContext or idFactory/rng missing', () => {
    const world = createWorldController<any>().world;
    expect(() => {
      // positional call without simNowMs/rng/idFactory
      weaponSystem(world, 1 / 60, undefined, undefined, undefined);
    }).toThrow();

    expect(() => {
      // object param without stepContext
      weaponSystem({ world, events: { weaponFired: [] } as any } as any);
    }).toThrow();
  });

  it('processRespawnQueue throws when stepContext is missing', () => {
    expect(() => {
      processRespawnQueue({ queue: [] } as any);
    }).toThrow();
  });

  it('aiSystem throws when simNowMs or rng missing', () => {
    const world = createWorldController<any>().world;
    expect(() => {
      // missing simNowMs
      aiSystem(world, () => 0.5, undefined, undefined as any);
    }).toThrow();

    expect(() => {
      // missing rng (pass undefined) — ensure guard catches this
      aiSystem(world, undefined as any, undefined, 0);
    }).toThrow();
  });
});