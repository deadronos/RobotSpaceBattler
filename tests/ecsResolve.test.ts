import { beforeEach, describe, expect, it } from 'vitest';
import { World } from 'miniplex';

import { resolveEntity, resolveOwner } from '../src/ecs/ecsResolve';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent } from '../src/ecs/weapons';

describe('ecsResolve utilities', () => {
  let world: World<Entity>;

  beforeEach(() => {
    world = new World<Entity>();
  });

  it('resolves entities by numeric id with fallback scan', () => {
    const entity: Entity = { id: 42, position: [0, 0, 0] };
    world.add(entity);

    const resolved = resolveEntity(world, 42);
    expect(resolved).toBe(entity);
  });

  it('returns undefined when entity id does not exist', () => {
    expect(resolveEntity(world, 99)).toBeUndefined();
  });

  it('resolves owners directly by ownerId when available', () => {
    const weapon: WeaponComponent = {
      id: 'laser-alpha',
      type: 'laser',
      ownerId: 10,
      team: 'red',
      range: 10,
      cooldown: 1,
      power: 5,
    };
    const owner: Entity & { weapon: WeaponComponent } = {
      id: 10,
      team: 'red',
      position: [0, 0, 0],
      weapon,
    };

    world.add(owner);

    const resolved = resolveOwner(world, { ownerId: 10, weaponId: weapon.id });
    expect(resolved).toBe(owner);
  });

  it('resolves entities when ids are strings', () => {
    const entity: Entity = { id: 'robot-1', position: [0, 0, 0] };
    world.add(entity);

    const resolved = resolveEntity(world, 'robot-1');
    expect(resolved).toBe(entity);
  });

  it('falls back to weaponId lookup when ownerId is missing', () => {
    const weapon: WeaponComponent = {
      id: 'laser-beta',
      type: 'laser',
      ownerId: 20,
      team: 'blue',
      range: 15,
      cooldown: 1.5,
      power: 7,
    };
    const owner: Entity & { weapon: WeaponComponent } = {
      id: 'temp-owner',
      team: 'blue',
      position: [1, 0, 0],
      weapon,
    };

    world.add(owner);

    const resolved = resolveOwner(world, { ownerId: 1234, weaponId: weapon.id });
    expect(resolved).toBe(owner);
  });

  it('returns undefined when neither ownerId nor weaponId match', () => {
    const weapon: WeaponComponent = {
      id: 'laser-gamma',
      type: 'laser',
      ownerId: 30,
      team: 'red',
      range: 20,
      cooldown: 2,
      power: 9,
    };
    const owner: Entity & { weapon: WeaponComponent } = {
      id: 30,
      team: 'red',
      position: [2, 0, 0],
      weapon,
    };
    world.add(owner);

    const resolved = resolveOwner(world, { ownerId: 999, weaponId: 'missing' });
    expect(resolved).toBeUndefined();
  });
});
