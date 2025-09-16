import { beforeEach, describe, expect, it } from 'vitest';
import { createRobotEntity, resetWorld, world as ecsWorld } from '../src/ecs/miniplexStore';
import type { Entity } from '../src/ecs/miniplexStore';
import type { DamageEvent, WeaponComponent, WeaponStateComponent } from '../src/ecs/weapons';
import type { ImpactEvent } from '../src/systems/HitscanSystem';
import { beamSystem } from '../src/systems/BeamSystem';
import { hitscanSystem } from '../src/systems/HitscanSystem';
import { projectileSystem } from '../src/systems/ProjectileSystem';
import { weaponSystem, type WeaponFiredEvent } from '../src/systems/WeaponSystem';
import { createSeededRng } from '../src/utils/seededRng';
describe('Weapon targeting and friendly-fire rules', () => {
  beforeEach(() => {
    resetWorld();
  });
  it('aims at the tracked target and only damages that enemy (hitscan)', () => {
    const rng = createSeededRng(1);
    const events = { weaponFired: [] as WeaponFiredEvent[], damage: [] as DamageEvent[] };
    const shooter = createRobotEntity({
      team: 'red',
      position: [0, 0, 0],
    }) as ReturnType<typeof createRobotEntity> & {
      weapon: WeaponComponent;
      weaponState: WeaponStateComponent;
      targetId?: number;
    };
    shooter.weapon = {
      id: 'rifle',
      type: 'gun',
      ownerId: shooter.id as number,
      team: 'red',
      range: 20,
      cooldown: 0,
      power: 10,
      spread: 0,
    };
    shooter.weaponState = {
      firing: true,
      cooldownRemaining: 0,
    };
    const enemy = createRobotEntity({
      team: 'blue',
      position: [5, 0, 0],
    });
    shooter.targetId = enemy.id as number;
    weaponSystem(ecsWorld, 0.016, rng, events);
    expect(events.weaponFired).toHaveLength(1);
    const fireEvent = events.weaponFired[0];
    expect(fireEvent.targetId).toBe(enemy.id);
    expect(fireEvent.direction).toEqual([1, 0, 0]);
    const hitscanEvents: { damage: DamageEvent[]; impact: ImpactEvent[] } = { damage: [], impact: [] };
    hitscanSystem(ecsWorld, rng, events.weaponFired, hitscanEvents);
    expect(hitscanEvents.damage).toHaveLength(1);
    expect(hitscanEvents.damage[0]?.targetId).toBe(enemy.id);
    expect(hitscanEvents.damage[0]?.sourceId).toBe(shooter.id);
  });
  it('ignores friendly targets for hitscan weapons', () => {
    const rng = createSeededRng(2);
    const events = { weaponFired: [] as WeaponFiredEvent[], damage: [] as DamageEvent[] };
    const shooter = createRobotEntity({
      team: 'red',
      position: [0, 0, 0],
    }) as ReturnType<typeof createRobotEntity> & {
      weapon: WeaponComponent;
      weaponState: WeaponStateComponent;
      targetId?: number;
    };
    shooter.weapon = {
      id: 'friend-rifle',
      type: 'gun',
      ownerId: shooter.id as number,
      team: 'red',
      range: 20,
      cooldown: 0,
      power: 10,
      spread: 0,
    };
    shooter.weaponState = {
      firing: true,
      cooldownRemaining: 0,
    };
    const friendly = createRobotEntity({
      team: 'red',
      position: [5, 0, 0],
    });
    shooter.targetId = friendly.id as number;
    weaponSystem(ecsWorld, 0.016, rng, events);
    const hitscanEvents: { damage: DamageEvent[]; impact: ImpactEvent[] } = { damage: [], impact: [] };
    hitscanSystem(ecsWorld, rng, events.weaponFired, hitscanEvents);
    expect(hitscanEvents.damage).toHaveLength(0);
  });
  it('propagates owner/target identifiers to projectiles and respects friendly fire', () => {
    const rng = createSeededRng(3);
    const events = { weaponFired: [] as WeaponFiredEvent[], damage: [] as DamageEvent[] };
    const shooter = createRobotEntity({
      team: 'red',
      position: [0, 0, 0],
    }) as ReturnType<typeof createRobotEntity> & {
      weapon: WeaponComponent;
      weaponState: WeaponStateComponent;
      targetId?: number;
    };
    shooter.weapon = {
      id: 'rocket-launcher',
      type: 'rocket',
      ownerId: shooter.id as number,
      team: 'red',
      range: 30,
      cooldown: 0,
      power: 30,
      aoeRadius: 3,
      flags: { homing: true },
    };
    shooter.weaponState = {
      firing: true,
      cooldownRemaining: 0,
    };
    const enemy = createRobotEntity({
      team: 'blue',
      position: [5, 0, 0],
    });
    const friendly = createRobotEntity({
      team: 'red',
      position: [5, 0, 2],
    });
    shooter.targetId = enemy.id as number;
    weaponSystem(ecsWorld, 0.016, rng, events);
    const projectileEvents = { weaponFired: events.weaponFired, damage: [] as DamageEvent[] };
    projectileSystem(ecsWorld, 0.016, rng, events.weaponFired, projectileEvents);
    const projectile = Array.from(ecsWorld.entities).find(
      (candidate) => (candidate as Entity & { projectile?: unknown }).projectile
    ) as (Entity & { projectile: { ownerId: number; homing?: { targetId?: number } } }) | undefined;
    expect(projectile).toBeDefined();
    expect(projectile?.projectile.ownerId).toBe(shooter.id);
    expect(projectile?.projectile.homing?.targetId).toBe(enemy.id);
    for (let i = 0; i < 20 && projectileEvents.damage.length === 0; i += 1) {
      projectileSystem(ecsWorld, 0.05, rng, [], projectileEvents);
    }
    expect(projectileEvents.damage.filter((d) => d.targetId === enemy.id)).toHaveLength(1);
    expect(projectileEvents.damage.some((d) => d.targetId === friendly.id)).toBe(false);
    expect(projectileEvents.damage.every((d) => d.sourceId === shooter.id)).toBe(true);
  });
  it('applies owner team filtering for beam tick damage', () => {
    const rng = createSeededRng(4);
    const events = { weaponFired: [] as WeaponFiredEvent[], damage: [] as DamageEvent[] };
    const shooter = createRobotEntity({
      team: 'blue',
      position: [0, 0, 0],
    }) as ReturnType<typeof createRobotEntity> & {
      weapon: WeaponComponent;
      weaponState: WeaponStateComponent;
      targetId?: number;
    };
    shooter.weapon = {
      id: 'beam-weapon',
      type: 'laser',
      ownerId: shooter.id as number,
      team: 'blue',
      range: 30,
      cooldown: 0,
      power: 20,
      beamParams: { width: 0.2, tickInterval: 10, duration: 100 },
    };
    shooter.weaponState = {
      firing: true,
      cooldownRemaining: 0,
    };
    const enemy = createRobotEntity({
      team: 'red',
      position: [0, 0, 5],
    });
    const friendly = createRobotEntity({
      team: 'blue',
      position: [0, 0, 5.5],
    });
    shooter.targetId = enemy.id as number;
    const beamDamage: DamageEvent[] = [];
    weaponSystem(ecsWorld, 0.016, rng, events);
    beamSystem(ecsWorld, 0.016, rng, events.weaponFired, { damage: beamDamage });
    for (let i = 0; i < 20 && !beamDamage.some((d) => d.targetId === enemy.id); i += 1) {
      beamSystem(ecsWorld, 0.05, rng, [], { damage: beamDamage });
    }
    expect(beamDamage.some((d) => d.targetId === friendly.id)).toBe(false);
  });
});
