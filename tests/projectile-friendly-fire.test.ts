import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';

import { projectileSystem } from '../src/systems/ProjectileSystem';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent, DamageEvent, ProjectileComponent } from '../src/ecs/weapons';
import type { WeaponFiredEvent } from '../src/systems/WeaponSystem';
import { createSeededRng } from '../src/utils/seededRng';
import { useUI } from '../src/store/uiStore';

describe('ProjectileSystem friendly-fire', () => {
  let world: World<Entity>;
  let events: { damage: DamageEvent[] };

  beforeEach(() => {
    world = new World<Entity>();
    events = { damage: [] };
    // default to friendlyFire disabled for these tests
    try { useUI.getState().setFriendlyFire(false); } catch {}
  });

  function setupLauncher(team: 'red' | 'blue', overrides: Partial<WeaponComponent> = {}) {
    const launcher: Entity & { weapon: WeaponComponent } = {
      id: 'launcher',
      position: [0, 0, 0],
  team: team,
      weapon: {
        id: 'rocket-launcher',
        type: 'rocket',
        ownerId: 1,
  team: team,
        range: 30,
        cooldown: 2.0,
        power: 50,
        aoeRadius: 0,
        ...overrides,
      },
    };
    world.add(launcher);
    return launcher;
  }

  it('does not damage same-team on direct hit when friendly-fire disabled', () => {
    setupLauncher('red');
    const ally: Entity = { id: 'ally', position: [10, 0, 0], team: 'red', hp: 100 } as any;
    world.add(ally);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    const rng = createSeededRng(1);
    projectileSystem(world, 0.016, rng, [weaponFiredEvent], events);

    const proj = Array.from(world.entities).find(e => (e as any).projectile) as Entity & { projectile: ProjectileComponent; position: [number, number, number] };
    expect(proj).toBeDefined();
    proj.position = [10, 0, 0];

    projectileSystem(world, 0.016, rng, [], events);

    // Expect no damage recorded
    const allyDamaged = events.damage.some(d => d.targetId === ('ally' as unknown as number));
    expect(allyDamaged).toBe(false);
  });

  it('damages enemy on direct hit when friendly-fire disabled', () => {
    setupLauncher('red');
    const enemy: Entity = { id: 'enemy', position: [10, 0, 0], team: 'blue', hp: 100 } as any;
    world.add(enemy);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    const rng = createSeededRng(1);
    projectileSystem(world, 0.016, rng, [weaponFiredEvent], events);

    const proj = Array.from(world.entities).find(e => (e as any).projectile) as Entity & { projectile: ProjectileComponent; position: [number, number, number] };
    proj.position = [10, 0, 0];

    projectileSystem(world, 0.016, rng, [], events);

    const enemyDamaged = events.damage.some(d => d.targetId === ('enemy' as unknown as number));
    expect(enemyDamaged).toBe(true);
  });

  it('does not damage allies in AoE when friendly-fire disabled', () => {
    setupLauncher('red', { aoeRadius: 5, power: 100 });
    const ally1: Entity = { id: 'a1', position: [10, 0, 0], team: 'red', hp: 100 } as any;
    const ally2: Entity = { id: 'a2', position: [12, 0, 0], team: 'red', hp: 100 } as any;
    const enemy: Entity = { id: 'b1', position: [12, 0, 0], team: 'blue', hp: 100 } as any;
    world.add(ally1); world.add(ally2); world.add(enemy);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    const rng = createSeededRng(1);
    projectileSystem(world, 0.016, rng, [weaponFiredEvent], events);
    const proj = Array.from(world.entities).find(e => (e as any).projectile) as Entity & { projectile: ProjectileComponent; position: [number, number, number] };
    proj.position = [10, 0, 0];
    projectileSystem(world, 0.016, rng, [], events);

    const allyDamage = events.damage.filter(d => d.targetId === ('a1' as unknown as number) || d.targetId === ('a2' as unknown as number));
    const enemyDamage = events.damage.filter(d => d.targetId === ('b1' as unknown as number));
    expect(allyDamage.length).toBe(0);
    expect(enemyDamage.length).toBeGreaterThan(0);
  });

  it('can allow friendly-fire when toggled on', () => {
    try { useUI.getState().setFriendlyFire(true); } catch {}
    setupLauncher('red');
    const ally: Entity = { id: 'ally', position: [10, 0, 0], team: 'red', hp: 100 } as any;
    world.add(ally);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: Date.now(),
    };

    const rng = createSeededRng(1);
    projectileSystem(world, 0.016, rng, [weaponFiredEvent], events);
    const proj = Array.from(world.entities).find(e => (e as any).projectile) as Entity & { projectile: ProjectileComponent; position: [number, number, number] };
    proj.position = [10, 0, 0];
    projectileSystem(world, 0.016, rng, [], events);

    const allyDamaged = events.damage.some(d => d.targetId === ('ally' as unknown as number));
    expect(allyDamaged).toBe(true);
  });
});
