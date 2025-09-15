import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';

import { hitscanSystem } from '../src/systems/HitscanSystem';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent, DamageEvent } from '../src/ecs/weapons';
import type { WeaponFiredEvent } from '../src/systems/WeaponSystem';
import { createSeededRng } from '../src/utils/seededRng';

describe('HitscanSystem Determinism', () => {
  let world: World<Entity>;
  let events: { damage: DamageEvent[]; impact: any[] };

  beforeEach(() => {
    world = new World<Entity>();
    events = { damage: [], impact: [] };
  });

  it('should produce deterministic hits with seeded RNG', () => {
    // Create shooter entity
    const shooter: Entity & { weapon: WeaponComponent } = {
      id: 'shooter',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'gun-1',
        type: 'gun',
        ownerId: 1,
        team: 'red',
        range: 20,
        cooldown: 0.5,
        power: 25,
        accuracy: 0.8,
        spread: 0.2,
      },
    };

    // Create target entity
    const target: Entity = {
      id: 'target',
      position: [10, 0, 0],
      team: 'blue',
    };

    world.add(shooter);
    world.add(target);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'gun-1',
      ownerId: 1,
      type: 'gun',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    // First run with seed 12345
    const rng1 = createSeededRng(12345);
    hitscanSystem(world, rng1, [weaponFiredEvent], events);
    const damage1 = [...events.damage];
    const impact1 = [...events.impact];

    // Reset events
    events.damage = [];
    events.impact = [];

    // Second run with same seed should produce identical results
    const rng2 = createSeededRng(12345);
    hitscanSystem(world, rng2, [weaponFiredEvent], events);
    const damage2 = [...events.damage];
    const impact2 = [...events.impact];

    expect(damage1).toEqual(damage2);
    expect(impact1).toEqual(impact2);
  });

  it('should apply weapon spread correctly', () => {
    const shooter: Entity & { weapon: WeaponComponent } = {
      id: 'shooter',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'shotgun',
        type: 'gun',
        ownerId: 1,
        team: 'red',
        range: 15,
        cooldown: 1.0,
        power: 30,
        accuracy: 0.6, // Lower accuracy = more spread
        spread: 0.5, // High spread value
      },
    };

    const target: Entity = {
      id: 'target',
      position: [10, 0, 1], // Slightly off-axis
      team: 'blue',
    };

    world.add(shooter);
    world.add(target);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'shotgun',
      ownerId: 1,
      type: 'gun',
      origin: [0, 0, 0],
      direction: [1, 0, 0], // Firing straight
      timestamp: Date.now(),
    };

    // Test multiple shots to verify spread affects hit probability
    let hitCount = 0;
    const totalShots = 10;

    for (let i = 0; i < totalShots; i++) {
      events.damage = [];
      events.impact = [];
      
      const rng = createSeededRng(12345 + i);
      hitscanSystem(world, rng, [weaponFiredEvent], events);
      
      if (events.damage.length > 0) {
        hitCount++;
      }
    }

    // With spread and lower accuracy, we shouldn't hit every shot
    expect(hitCount).toBeLessThan(totalShots);
    expect(hitCount).toBeGreaterThan(0); // But should hit some
  });

  it('should respect weapon range limits', () => {
    const shooter: Entity & { weapon: WeaponComponent } = {
      id: 'shooter',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'pistol',
        type: 'gun',
        ownerId: 1,
        team: 'red',
        range: 5, // Short range
        cooldown: 0.3,
        power: 20,
        accuracy: 1.0, // Perfect accuracy
        spread: 0,
      },
    };

    // Target within range
    const nearTarget: Entity = {
      id: 'near-target',
      position: [3, 0, 0],
      team: 'blue',
    };

    // Target outside range
    const farTarget: Entity = {
      id: 'far-target',
      position: [10, 0, 0],
      team: 'blue',
    };

    world.add(shooter);
    world.add(nearTarget);
    world.add(farTarget);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'pistol',
      ownerId: 1,
      type: 'gun',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    const rng = createSeededRng(12345);
    hitscanSystem(world, rng, [weaponFiredEvent], events);

    // Should only hit the near target, not the far one
    expect(events.damage).toHaveLength(1);
    expect(events.damage[0].targetId).toBe('near-target' as unknown as number);
  });
});