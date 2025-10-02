import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';

import { projectileSystem } from '../src/systems/ProjectileSystem';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent, DamageEvent, ProjectileComponent } from '../src/ecs/weapons';
import type { WeaponFiredEvent } from '../src/systems/WeaponSystem';
import { createSeededRng } from '../src/utils/seededRng';

describe('ProjectileSystem AoE and Friendly Fire', () => {
  let world: World<Entity>;
  let events: { damage: DamageEvent[] };
  const baseTime = 1_600_000_000_000;

  beforeEach(() => {
    world = new World<Entity>();
    events = { damage: [] };
  });

  it('should apply AoE damage to multiple targets', () => {
    // Create launcher entity
    const launcher: Entity & { weapon: WeaponComponent } = {
      id: 'launcher',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'rocket-launcher',
        type: 'rocket',
        ownerId: 1,
        team: 'red',
        range: 30,
        cooldown: 2.0,
        power: 50,
        aoeRadius: 5,
      },
    };

    // Create multiple targets in AoE range
    const target1: Entity = {
      id: 'target1',
      position: [10, 0, 0], // Direct hit
      team: 'blue',
    };

    const target2: Entity = {
      id: 'target2',
      position: [12, 0, 2], // Within AoE
      team: 'blue',
    };

    const target3: Entity = {
      id: 'target3',
      position: [20, 0, 0], // Outside AoE
      team: 'blue',
    };

    world.add(launcher);
    world.add(target1);
    world.add(target2);
    world.add(target3);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Spawn projectile
  projectileSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    // Find the projectile
    const projectiles = Array.from(world.entities).filter(e => 
      (e as Entity & { projectile?: ProjectileComponent }).projectile
    );
    expect(projectiles).toHaveLength(1);

    const projectile = projectiles[0] as Entity & { 
      projectile: ProjectileComponent;
      position: [number, number, number];
      velocity: [number, number, number];
    };

    // Move projectile to impact point
    projectile.position = [10, 0, 0];
    
  // Simulate impact
    projectileSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Should damage target1 and target2, but not target3
    expect(events.damage.length).toBeGreaterThanOrEqual(2);
    
    const damagedTargets = events.damage.map(d => d.targetId);
    expect(damagedTargets).toContain('target1' as unknown as number);
    expect(damagedTargets).toContain('target2' as unknown as number);
    expect(damagedTargets).not.toContain('target3' as unknown as number);
  });

  it('should apply distance-based damage falloff in AoE', () => {
    const launcher: Entity & { weapon: WeaponComponent } = {
      id: 'launcher',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'rocket-launcher',
        type: 'rocket',
        ownerId: 1,
        team: 'red',
        range: 30,
        cooldown: 2.0,
        power: 100, // High base damage for easier testing
        aoeRadius: 10,
      },
    };

    // Target at impact center (should take full damage)
    const centerTarget: Entity = {
      id: 'center',
      position: [10, 0, 0],
      team: 'blue',
    };

    // Target at edge of AoE (should take reduced damage)
    const edgeTarget: Entity = {
      id: 'edge',
      position: [20, 0, 0], // 10 units from impact
      team: 'blue',
    };

    world.add(launcher);
    world.add(centerTarget);
    world.add(edgeTarget);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Spawn and move projectile to impact
  projectileSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const projectiles = Array.from(world.entities).filter(e => 
      (e as Entity & { projectile?: ProjectileComponent }).projectile
    );
    const projectile = projectiles[0] as Entity & { 
      projectile: ProjectileComponent;
      position: [number, number, number];
      velocity: [number, number, number];
    };

    projectile.position = [10, 0, 0]; // Impact at center target
    
    projectileSystem(world, 0.016, rng, [], events, baseTime + 16);

    expect(events.damage).toHaveLength(2);
    
    const centerDamage = events.damage.find(d => d.targetId === 'center' as unknown as number);
    const edgeDamage = events.damage.find(d => d.targetId === 'edge' as unknown as number);

    expect(centerDamage).toBeDefined();
    expect(edgeDamage).toBeDefined();
    
    // Center target should take more damage than edge target
    expect(centerDamage!.damage).toBeGreaterThan(edgeDamage!.damage);
    expect(edgeDamage!.damage).toBeGreaterThan(0); // But still some damage
  });

  it('should handle projectile lifetime correctly', () => {
    const launcher: Entity & { weapon: WeaponComponent } = {
      id: 'launcher',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'rocket-launcher',
        type: 'rocket',
        ownerId: 1,
        team: 'red',
        range: 30,
        cooldown: 2.0,
        power: 50,
      },
    };

    world.add(launcher);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Spawn projectile
  projectileSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    expect(world.entities.length).toBe(2); // Launcher + projectile

    // Simulate projectile aging beyond lifetime
    const projectiles = Array.from(world.entities).filter(e => 
      (e as Entity & { projectile?: ProjectileComponent }).projectile
    );
    const projectile = projectiles[0] as Entity & { projectile: ProjectileComponent };
    
  // Set spawn time to past
  projectile.projectile.spawnTime = baseTime - 6000; // 6 seconds ago
    projectile.projectile.lifespan = 5; // 5 second lifetime

    projectileSystem(world, 0.016, rng, [], events);

    // Projectile should be removed
    expect(world.entities.length).toBe(1); // Only launcher remains
  });

  it('should handle out-of-bounds projectiles', () => {
    const launcher: Entity & { weapon: WeaponComponent } = {
      id: 'launcher',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'rocket-launcher',
        type: 'rocket',
        ownerId: 1,
        team: 'red',
        range: 30,
        cooldown: 2.0,
        power: 50,
      },
    };

    world.add(launcher);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'rocket-launcher',
      ownerId: 1,
      type: 'rocket',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Spawn projectile
  projectileSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const projectiles = Array.from(world.entities).filter(e => 
      (e as Entity & { projectile?: ProjectileComponent }).projectile
    );
    const projectile = projectiles[0] as Entity & { 
      projectile: ProjectileComponent;
      position: [number, number, number];
    };

    // Move projectile out of bounds
    projectile.position = [100, 0, 0]; // Far outside arena

  projectileSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Projectile should be removed
    expect(world.entities.length).toBe(1); // Only launcher remains
  });
});