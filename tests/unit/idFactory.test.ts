import { describe, it, expect } from 'vitest';
import { createTestStepContext, createIdFactory } from '../helpers/fixedStepHarness';
import { weaponSystem } from '../../src/systems/WeaponSystem';
import { createWorldController } from '../../src/ecs/worldFactory';

describe('idFactory usage', () => {
  it('weaponSystem uses provided idFactory for event ids', () => {
    const worldCtrl = createWorldController<any>();
    const world = worldCtrl.world;
    const ctx = createTestStepContext({ frameCount: 1, simNowMs: 1000 });
    const idFactory = createIdFactory(ctx);

    world.entities.push({ id: 1, team: 'red', position: [0,0,0], weapon: { id: 'w1', type: 'gun', cooldown: 0 }, weaponState: { firing: true } });

    const events = { weaponFired: [] as any[] };

    // When idFactory is provided, weaponSystem should use it for event ids
    weaponSystem({ world, stepContext: ctx, idFactory, events });

    expect(events.weaponFired.length).toBeGreaterThan(0);
    const evtId = events.weaponFired[0].id;
    // id should start with frame-simNow-seq pattern created by createIdFactory
    expect(typeof evtId).toBe('string');
    expect(evtId.startsWith(`${ctx.frameCount}-${ctx.simNowMs}-`)).toBe(true);
  });

  it('weaponSystem should throw when idFactory is missing (no fallback)', () => {
    const worldCtrl = createWorldController<any>();
    const world = worldCtrl.world;
    const ctx = createTestStepContext({ frameCount: 2, simNowMs: 2000 });
    // Remove idFactory to simulate missing idFactory scenario
    const ctxNoIdFactory = { ...ctx, idFactory: undefined } as any;
    world.entities.push({ id: 2, team: 'red', position: [0,0,0], weapon: { id: 'w2', type: 'gun', cooldown: 0 }, weaponState: { firing: true } });
    const events = { weaponFired: [] as any[] };

    expect(() => {
      // Call without idFactory but with stepContext missing idFactory
      weaponSystem({ world, stepContext: ctxNoIdFactory, events });
    }).toThrow();
  });
});