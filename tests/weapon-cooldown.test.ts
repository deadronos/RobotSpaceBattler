import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';

import { weaponSystem, type WeaponFiredEvent } from '../src/systems/WeaponSystem';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent, WeaponStateComponent, DamageEvent } from '../src/ecs/weapons';
import { createSeededRng } from '../src/utils/seededRng';

describe('WeaponSystem', () => {
  let world: World<Entity>;
  let events: { weaponFired: WeaponFiredEvent[]; damage: DamageEvent[] };

  beforeEach(() => {
    world = new World<Entity>();
    events = { weaponFired: [], damage: [] };
  });

  it('should handle weapon cooldowns correctly', () => {
    const rng = createSeededRng(12345);
    
    // Create entity with weapon
    const entity: Entity & { weapon: WeaponComponent; weaponState: WeaponStateComponent } = {
      id: 'test-entity',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'test-weapon',
        type: 'gun',
        ownerId: 1,
        team: 'red',
        range: 10,
        cooldown: 1.0, // 1 second cooldown
        power: 25,
      },
      weaponState: {
        firing: true,
        cooldownRemaining: 0,
      },
    };

    world.add(entity);

    // First tick should fire
    weaponSystem(world, 0.016, rng, events);
    expect(events.weaponFired).toHaveLength(1);
    expect(entity.weaponState.cooldownRemaining).toBe(1.0);

    // Reset events
    events.weaponFired = [];

    // Second tick should not fire (in cooldown)
    weaponSystem(world, 0.016, rng, events);
    expect(events.weaponFired).toHaveLength(0);
    expect(entity.weaponState.cooldownRemaining).toBeLessThan(1.0);

    // Wait for cooldown to finish
    weaponSystem(world, 1.0, rng, events);
    expect(entity.weaponState.cooldownRemaining).toBe(0);
  });

  it('should handle ammo consumption and reloading', () => {
    const rng = createSeededRng(12345);
    
    const entity: Entity & { weapon: WeaponComponent; weaponState: WeaponStateComponent } = {
      id: 'test-entity',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'test-weapon',
        type: 'gun',
        ownerId: 1,
        team: 'red',
        range: 10,
        cooldown: 0.1,
        power: 25,
        ammo: { clip: 2, clipSize: 2, reserve: 10 },
      },
      weaponState: {
        firing: true,
        cooldownRemaining: 0,
      },
    };

    world.add(entity);

    // Fire first shot
    weaponSystem(world, 0.016, rng, events);
    expect(entity.weapon.ammo!.clip).toBe(1);
    expect(events.weaponFired).toHaveLength(1);

    // Wait for cooldown to finish and fire second shot
    events.weaponFired = [];
    entity.weaponState.firing = true; // Re-enable firing
    weaponSystem(world, 0.2, rng, events); // Wait longer than cooldown (0.1s)
    expect(entity.weapon.ammo!.clip).toBe(0);
    expect(entity.weaponState.reloading).toBe(true);
    expect(events.weaponFired).toHaveLength(1); // Should fire before reload starts

    // Reload should complete
    events.weaponFired = [];
    weaponSystem(world, 0.1, rng, events);
    expect(entity.weapon.ammo!.clip).toBe(2);
    expect(entity.weaponState.reloading).toBe(false);
  });

  it('should emit correct weapon fired events', () => {
    const rng = createSeededRng(12345);
    
    const entity: Entity & { weapon: WeaponComponent; weaponState: WeaponStateComponent } = {
      id: 'test-entity',
      position: [5, 1, 3],
      team: 'blue',
      weapon: {
        id: 'laser-weapon',
        type: 'laser',
        ownerId: 2,
        team: 'blue',
        range: 25,
        cooldown: 1.5,
        power: 15,
      },
      weaponState: {
        firing: true,
        cooldownRemaining: 0,
      },
    };

    world.add(entity);

    weaponSystem(world, 0.016, rng, events);

    expect(events.weaponFired).toHaveLength(1);
    const fireEvent = events.weaponFired[0];
    expect(fireEvent.weaponId).toBe('laser-weapon');
    expect(fireEvent.ownerId).toBe(2);
    expect(fireEvent.type).toBe('laser');
    expect(fireEvent.origin).toEqual([5, 1, 3]);
    expect(fireEvent.timestamp).toBeGreaterThan(0);
  });
});