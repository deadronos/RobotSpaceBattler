import { describe, it, expect, beforeEach } from 'vitest';
import { World } from 'miniplex';

import { beamSystem } from '../src/systems/BeamSystem';
import type { Entity } from '../src/ecs/miniplexStore';
import type { WeaponComponent, DamageEvent, BeamComponent } from '../src/ecs/weapons';
import type { WeaponFiredEvent } from '../src/systems/WeaponSystem';
import { createSeededRng } from '../src/utils/seededRng';

describe('BeamSystem Tick Damage and Interruption', () => {
  let world: World<Entity>;
  let events: { damage: DamageEvent[] };
  const baseTime = 1_600_000_000_000; // fixed ms baseline for deterministic tests

  beforeEach(() => {
    world = new World<Entity>();
    events = { damage: [] };
  });

  it('should apply tick damage at correct intervals', () => {
    // Create laser weapon entity
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 'laser',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'laser-beam',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 25,
        cooldown: 1.5,
        power: 40, // Total damage
        beamParams: { 
          duration: 1000, // 1 second beam
          width: 0.2,
          tickInterval: 100, // 100ms intervals
        },
      },
    };

    // Create target in beam path
    const target: Entity = {
      id: 'target',
      position: [15, 0, 0],
      team: 'blue',
    };

    world.add(laser);
    world.add(target);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'laser-beam',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
        timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
    // Create beam
      beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const beams = Array.from(world.entities).filter(e => 
      (e as Entity & { beam?: BeamComponent }).beam
    );
    expect(beams).toHaveLength(1);

    const beam = beams[0] as Entity & { beam: BeamComponent };
    
    // First tick should not apply damage yet (need to wait for tick interval)
    expect(events.damage).toHaveLength(0);

    // Simulate time passing to trigger tick damage
  beam.beam.lastTickAt = baseTime - 150; // 150ms ago (past tick interval)

    events.damage = []; // Reset
      beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Should apply tick damage
    expect(events.damage).toHaveLength(1);
    expect(events.damage[0].targetId).toBe('target' as unknown as number);
    expect(events.damage[0].damage).toBe(4); // power / 10 = 40 / 10 = 4
  });

  it('should handle beam duration and cleanup', () => {
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 'laser',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'laser-beam',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 25,
        cooldown: 1.5,
        power: 30,
        beamParams: { 
          duration: 500, // 0.5 second beam
          width: 0.1,
          tickInterval: 50,
        },
      },
    };

    world.add(laser);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'laser-beam',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
        timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
    // Create beam
      beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    expect(world.entities.length).toBe(2); // Laser + beam

    // Find the beam and expire it
    const beams = Array.from(world.entities).filter(e => 
      (e as Entity & { beam?: BeamComponent }).beam
    );
    const beam = beams[0] as Entity & { beam: BeamComponent };
    
  beam.beam.activeUntil = baseTime - 100; // Expired 100ms ago

      beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Beam should be removed
    expect(world.entities.length).toBe(1); // Only laser remains
  });

  it('removes beams when the owning entity no longer exists', () => {
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 1,
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'orphaned-laser',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 25,
        cooldown: 1,
        power: 30,
        beamParams: {
          duration: 800,
          width: 0.15,
          tickInterval: 100,
        },
      },
    };

    world.add(laser);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'orphaned-laser',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);

    beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);

    const beamsBeforeRemoval = Array.from(world.entities).filter(
      (e) => (e as Entity & { beam?: BeamComponent }).beam,
    );
    expect(beamsBeforeRemoval).toHaveLength(1);

    // Remove the owning entity from the world
    world.remove(laser);

    beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    const beamsAfterRemoval = Array.from(world.entities).filter(
      (e) => (e as Entity & { beam?: BeamComponent }).beam,
    );
    expect(beamsAfterRemoval).toHaveLength(0);
  });

  it('should hit multiple targets in beam path', () => {
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 'laser',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'penetrating-laser',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 30,
        cooldown: 2.0,
        power: 60,
        beamParams: { 
          duration: 800,
          width: 0.3,
          tickInterval: 100,
        },
      },
    };

    // Multiple targets in a line
    const target1: Entity = {
      id: 'target1',
      position: [10, 0, 0],
      team: 'blue',
    };

    const target2: Entity = {
      id: 'target2',
      position: [20, 0, 0],
      team: 'blue',
    };

    const target3: Entity = {
      id: 'target3',
      position: [15, 5, 0], // Off to the side, should not be hit
      team: 'blue',
    };

    world.add(laser);
    world.add(target1);
    world.add(target2);
    world.add(target3);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'penetrating-laser',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0], // Straight along x-axis
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Create beam
      beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const beams = Array.from(world.entities).filter(e => 
      (e as Entity & { beam?: BeamComponent }).beam
    );
    const beam = beams[0] as Entity & { beam: BeamComponent };
    
  // Trigger tick damage
  beam.beam.lastTickAt = baseTime - 150; // Past tick interval
    
  events.damage = [];
      beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Should hit target1 and target2, but not target3
    expect(events.damage).toHaveLength(2);
    
    const damagedTargets = events.damage.map(d => d.targetId);
    expect(damagedTargets).toContain('target1' as unknown as number);
    expect(damagedTargets).toContain('target2' as unknown as number);
    expect(damagedTargets).not.toContain('target3' as unknown as number);
  });

  it('should update beam origin when weapon owner moves', () => {
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 'laser',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'tracking-laser',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 20,
        cooldown: 1.0,
        power: 25,
        beamParams: { 
          duration: 1000,
          width: 0.15,
          tickInterval: 100,
        },
      },
    };

    world.add(laser);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'tracking-laser',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
        timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  // Create beam
  beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const beams = Array.from(world.entities).filter(e => 
      (e as Entity & { beam?: BeamComponent }).beam
    );
    const beam = beams[0] as Entity & { beam: BeamComponent };
    
    // Initial beam origin
    expect(beam.beam.origin).toEqual([0, 0, 0]);

    // Move the laser weapon
    laser.position = [5, 2, 1];

  // Update beam system
  beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Beam origin should update to weapon's new position
    expect(beam.beam.origin).toEqual([5, 2, 1]);
  });

  it('should respect beam range limits', () => {
    const laser: Entity & { weapon: WeaponComponent } = {
      id: 'laser',
      position: [0, 0, 0],
      team: 'red',
      weapon: {
        id: 'short-laser',
        type: 'laser',
        ownerId: 1,
        team: 'red',
        range: 10, // Short range
        cooldown: 1.0,
        power: 50,
        beamParams: { 
          duration: 600,
          width: 0.2,
          tickInterval: 100,
        },
      },
    };

    // Target within range
    const nearTarget: Entity = {
      id: 'near',
      position: [8, 0, 0],
      team: 'blue',
    };

    // Target outside range
    const farTarget: Entity = {
      id: 'far',
      position: [15, 0, 0],
      team: 'blue',
    };

    world.add(laser);
    world.add(nearTarget);
    world.add(farTarget);

    const weaponFiredEvent: WeaponFiredEvent = {
      weaponId: 'short-laser',
      ownerId: 1,
      type: 'laser',
      origin: [0, 0, 0],
      direction: [1, 0, 0],
      timestamp: baseTime,
    };

    const rng = createSeededRng(12345);
    
  beamSystem(world, 0.016, rng, [weaponFiredEvent], events, baseTime);
    
    const beams = Array.from(world.entities).filter(e => 
      (e as Entity & { beam?: BeamComponent }).beam
    );
    const beam = beams[0] as Entity & { beam: BeamComponent };
    
    // Verify beam length matches weapon range
    expect(beam.beam.length).toBe(10);

  // Trigger tick damage
  beam.beam.lastTickAt = baseTime - 150;
    
  events.damage = [];
  beamSystem(world, 0.016, rng, [], events, baseTime + 16);

    // Should only hit near target, not far target
    expect(events.damage).toHaveLength(1);
    expect(events.damage[0].targetId).toBe('near' as unknown as number);
  });
});