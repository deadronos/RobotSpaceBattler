import { describe, expect, test } from 'vitest';

import { world } from '../src/ecs/miniplexStore';
import type { DamageEvent } from '../src/ecs/weapons';
import { fxSystem } from '../src/systems/FxSystem';

// Minimal fake events to drive FX
const makeEvents = () => ({
  impact: [
    { position: [1, 0, 0] as [number, number, number], normal: [0, 1, 0] as [number, number, number] },
  ],
  death: [
    { entityId: 1, position: [0, 0, 0] as [number, number, number], team: 'red' } as any,
  ],
  damage: [] as DamageEvent[],
});

describe('FxSystem', () => {
  test('spawns FX entities on impact and death and cleans up by TTL', () => {
    // Ensure clean world snapshot
  const initialCount = Array.from(world.entities).length;

    const events = makeEvents();

    // Run system twice to spawn and advance ages
    fxSystem(world as any, 0.016, events);
    const afterSpawn = Array.from(world.entities).filter((e) => (e as any).fx).length;
    expect(afterSpawn).toBeGreaterThan(0);

    // Advance ages enough to cleanup (use generous dt)
    fxSystem(world as any, 2.0, { impact: [], death: [], damage: [] });

    const remaining = Array.from(world.entities).filter((e) => (e as any).fx).length;
    expect(remaining).toBe(0);

    // World should not shrink below original size due to our additions/removals
    expect(Array.from(world.entities).length).toBeGreaterThanOrEqual(initialCount);
  });
});
