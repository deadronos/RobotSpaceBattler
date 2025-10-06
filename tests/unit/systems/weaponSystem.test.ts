import { beforeEach, describe, expect, it } from 'vitest';
import { World as MiniplexWorld } from 'miniplex';

import { createDefaultArena } from '../../../src/ecs/entities/Arena';
import { createRobot, type Robot } from '../../../src/ecs/entities/Robot';
import { createInitialSimulationState } from '../../../src/ecs/entities/SimulationState';
import { createInitialTeam, type TeamEntity } from '../../../src/ecs/entities/Team';
import { createPhysicsState } from '../../../src/ecs/simulation/physics';
import type { WorldView } from '../../../src/ecs/simulation/worldTypes';
import { runWeaponSystem } from '../../../src/ecs/systems/weaponSystem';
import type { Projectile } from '../../../src/ecs/entities/Projectile';
import type { Team, Vector3 } from '../../../src/types';

interface TestWorld extends WorldView {
  ecs: {
    robots: MiniplexWorld<Robot>;
    projectiles: MiniplexWorld<Projectile>;
    teams: MiniplexWorld<TeamEntity>;
  };
}

function createVector(vector: Partial<Vector3>): Vector3 {
  return { x: 0, y: 0, z: 0, ...vector };
}

function makeRobot(overrides: Partial<Robot> & { id: string; team: Team }): Robot {
  return createRobot({
    id: overrides.id,
    team: overrides.team,
    position: createVector(overrides.position ?? { x: 0, y: 0, z: 0 }),
    rotation: overrides.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
    velocity: createVector(overrides.velocity ?? { x: 0, y: 0, z: 0 }),
    health: overrides.health ?? 100,
    maxHealth: overrides.maxHealth ?? 100,
    weaponType: overrides.weaponType ?? 'laser',
    isCaptain: overrides.isCaptain ?? false,
    aiState: {
      behaviorMode: overrides.aiState?.behaviorMode ?? 'aggressive',
      targetId: overrides.aiState?.targetId ?? null,
      coverPosition: overrides.aiState?.coverPosition ?? null,
      lastFireTime: overrides.aiState?.lastFireTime ?? 0,
      formationOffset: createVector(overrides.aiState?.formationOffset ?? { x: 0, y: 0, z: 0 }),
    },
    stats: {
      kills: overrides.stats?.kills ?? 0,
      damageDealt: overrides.stats?.damageDealt ?? 0,
      damageTaken: overrides.stats?.damageTaken ?? 0,
      timeAlive: overrides.stats?.timeAlive ?? 0,
      shotsFired: overrides.stats?.shotsFired ?? 0,
    },
  });
}

function createTestWorld(): TestWorld {
  const arena = createDefaultArena();
  const world: TestWorld = {
    arena,
    entities: [],
    projectiles: [],
    teams: {
      red: createInitialTeam('red', arena.spawnZones.red),
      blue: createInitialTeam('blue', arena.spawnZones.blue),
    },
    simulation: createInitialSimulationState(),
    physics: createPhysicsState(),
    ecs: {
      robots: new MiniplexWorld<Robot>(),
      projectiles: new MiniplexWorld<Projectile>(),
      teams: new MiniplexWorld<TeamEntity>(),
    },
  };

  world.ecs.teams.add(world.teams.red);
  world.ecs.teams.add(world.teams.blue);

  return world;
}

describe('weaponSystem', () => {
  let world: TestWorld;
  let shooter: Robot;
  let target: Robot;

  beforeEach(() => {
    world = createTestWorld();
    shooter = makeRobot({ id: 'red-1', team: 'red', weaponType: 'laser' });
    target = makeRobot({
      id: 'blue-1',
      team: 'blue',
      weaponType: 'gun',
      position: { x: 0, y: 0, z: 10 },
    });

    shooter.aiState.targetId = target.id;
    world.entities.push(shooter, target);
    world.ecs.robots.add(shooter);
    world.ecs.robots.add(target);
    world.simulation.simulationTime = 10;
  });

  it('creates a projectile when the shooter has a valid target in range', () => {
    runWeaponSystem(world);

    expect(world.projectiles).toHaveLength(1);
    const projectile = world.projectiles[0];
    expect(projectile.ownerId).toBe(shooter.id);
    expect(projectile.damage).toBeCloseTo(22.5, 5);
    expect(projectile.velocity.z).toBeGreaterThan(0);
    expect(world.physics.projectiles.has(projectile.id)).toBe(true);
    expect(world.ecs.projectiles.entities).toHaveLength(1);
    expect(shooter.stats.shotsFired).toBe(1);
    expect(shooter.aiState.lastFireTime).toBe(world.simulation.simulationTime);
  });

  it('does not fire when the target is out of range', () => {
    target.position = { x: 0, y: 0, z: 100 };
    runWeaponSystem(world);

    expect(world.projectiles).toHaveLength(0);
    expect(shooter.stats.shotsFired).toBe(0);
  });

  it('enforces weapon cooldown between shots', () => {
    runWeaponSystem(world);
    expect(world.projectiles).toHaveLength(1);

    world.simulation.simulationTime += 0.2;
    runWeaponSystem(world);
    expect(world.projectiles).toHaveLength(1);

    world.simulation.simulationTime += 0.6;
    runWeaponSystem(world);
    expect(world.projectiles).toHaveLength(2);
    expect(shooter.stats.shotsFired).toBe(2);
  });

  it('ignores robots without a valid target', () => {
    shooter.aiState.targetId = null;
    runWeaponSystem(world);

    expect(world.projectiles).toHaveLength(0);
  });

  it('skips robots with zero health', () => {
    shooter.health = 0;
    runWeaponSystem(world);

    expect(world.projectiles).toHaveLength(0);
  });
});
