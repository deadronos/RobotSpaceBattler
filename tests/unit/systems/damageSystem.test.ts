import { beforeEach, describe, expect, it } from 'vitest';
import { World as MiniplexWorld } from 'miniplex';

import { createDefaultArena } from '../../../src/ecs/entities/Arena';
import { createProjectile } from '../../../src/ecs/entities/Projectile';
import { createInitialSimulationState } from '../../../src/ecs/entities/SimulationState';
import { createInitialTeam, type TeamEntity } from '../../../src/ecs/entities/Team';
import { spawnInitialTeams } from '../../../src/ecs/systems/spawnSystem';
import {
  applyDamage,
  cleanupProjectiles,
  handleProjectileHits,
} from '../../../src/ecs/systems/damageSystem';
import {
  createPhysicsState,
  spawnProjectileBody,
  type PhysicsStepResult,
} from '../../../src/ecs/simulation/physics';
import type { Projectile } from '../../../src/ecs/entities/Projectile';
import type { Robot } from '../../../src/ecs/entities/Robot';
import type { WorldView } from '../../../src/ecs/simulation/worldTypes';

interface TestWorld extends WorldView {
  ecs: {
    robots: MiniplexWorld<Robot>;
    projectiles: MiniplexWorld<Projectile>;
    teams: MiniplexWorld<TeamEntity>;
  };
}

function createTestWorld(): TestWorld {
  const arena = createDefaultArena();
  const redTeam = createInitialTeam('red', arena.spawnZones.red);
  const blueTeam = createInitialTeam('blue', arena.spawnZones.blue);
  const ecsTeams = new MiniplexWorld<TeamEntity>();
  ecsTeams.add(redTeam);
  ecsTeams.add(blueTeam);

  return {
    arena,
    entities: [],
    projectiles: [],
    teams: {
      red: redTeam,
      blue: blueTeam,
    },
    simulation: createInitialSimulationState(),
    physics: createPhysicsState(),
    ecs: {
      robots: new MiniplexWorld<Robot>(),
      projectiles: new MiniplexWorld<Projectile>(),
      teams: ecsTeams,
    },
  };
}

describe('damageSystem', () => {
  let world: TestWorld;
  let redRobot: Robot;
  let blueRobot: Robot;

  beforeEach(() => {
    world = createTestWorld();
    spawnInitialTeams(world, ['red', 'blue']);
    redRobot = world.entities.find((robot) => robot.team === 'red')!;
    blueRobot = world.entities.find((robot) => robot.team === 'blue')!;
  });

  it('applies damage and updates attacker/defender statistics', () => {
    applyDamage(world, blueRobot.id, 25, redRobot.id);

    const updatedBlue = world.entities.find((robot) => robot.id === blueRobot.id)!;
    const updatedRed = world.entities.find((robot) => robot.id === redRobot.id)!;

    expect(updatedBlue.health).toBe(75);
    expect(updatedBlue.stats.damageTaken).toBe(25);
    expect(updatedRed.stats.damageDealt).toBe(25);
    expect(world.teams.blue.aggregateStats.totalDamageTaken).toBe(25);
    expect(world.teams.red.aggregateStats.totalDamageDealt).toBe(25);
  });

  it('eliminates robots at zero health, removes physics bodies, and reassigns captains', () => {
    const blueCaptain = world.entities.find((robot) => robot.team === 'blue' && robot.isCaptain)!;

    applyDamage(world, blueCaptain.id, blueCaptain.health, redRobot.id);

    const eliminated = world.entities.find((robot) => robot.id === blueCaptain.id);
    expect(eliminated).toBeUndefined();
    expect(world.physics.robots.has(blueCaptain.id)).toBe(false);

    const replacementCaptain = world.entities.find((robot) => robot.team === 'blue' && robot.isCaptain);
    expect(replacementCaptain).toBeDefined();
    expect(world.teams.blue.captainId).toBe(replacementCaptain?.id ?? null);

    const updatedRed = world.entities.find((robot) => robot.id === redRobot.id)!;
    expect(updatedRed.stats.kills).toBe(1);
    expect(world.teams.red.aggregateStats.totalKills).toBe(1);
  });

  it('handles projectile hits by applying damage and despawning projectiles', () => {
    const projectile = createProjectile({
      id: 'proj-1',
      ownerId: redRobot.id,
      weaponType: redRobot.weaponType,
      position: { ...redRobot.position },
      velocity: { x: 0, y: 0, z: 0 },
      damage: blueRobot.maxHealth,
      distanceTraveled: 0,
      maxDistance: 100,
      spawnTime: 0,
      maxLifetime: 5,
    });
    world.projectiles.push(projectile);
    world.ecs.projectiles.add(projectile);
    spawnProjectileBody(world.physics, projectile);

    const hits: PhysicsStepResult['hits'] = [
      {
        projectileId: projectile.id,
        targetId: blueRobot.id,
        ownerId: redRobot.id,
        damage: blueRobot.maxHealth,
        weaponType: redRobot.weaponType,
      },
    ];

    handleProjectileHits(world, hits);

    expect(world.entities.find((robot) => robot.id === blueRobot.id)).toBeUndefined();
    expect(world.projectiles.some((proj) => proj.id === projectile.id)).toBe(false);
    expect(world.physics.projectiles.has(projectile.id)).toBe(false);
  });

  it('cleans up projectiles based on lifetime and explicit removals', () => {
    const projectile = createProjectile({
      id: 'proj-cleanup',
      ownerId: redRobot.id,
      weaponType: redRobot.weaponType,
      position: { ...redRobot.position },
      velocity: { x: 0, y: 0, z: 0 },
      damage: 5,
      distanceTraveled: 0,
      maxDistance: 50,
      spawnTime: 0,
      maxLifetime: 1,
    });

    world.projectiles.push(projectile);
    world.ecs.projectiles.add(projectile);
    spawnProjectileBody(world.physics, projectile);
    world.simulation.simulationTime = 5;

    cleanupProjectiles(world);
    expect(world.projectiles.some((proj) => proj.id === projectile.id)).toBe(false);
    expect(world.physics.projectiles.has(projectile.id)).toBe(false);

    const manualProjectile = createProjectile({
      id: 'proj-manual',
      ownerId: redRobot.id,
      weaponType: redRobot.weaponType,
      position: { ...redRobot.position },
      velocity: { x: 0, y: 0, z: 0 },
      damage: 5,
      distanceTraveled: 0,
      maxDistance: 50,
      spawnTime: world.simulation.simulationTime,
      maxLifetime: 10,
    });

    world.projectiles.push(manualProjectile);
    world.ecs.projectiles.add(manualProjectile);
    spawnProjectileBody(world.physics, manualProjectile);

    cleanupProjectiles(world, ['proj-manual']);
    expect(world.projectiles.some((proj) => proj.id === manualProjectile.id)).toBe(false);
    expect(world.physics.projectiles.has(manualProjectile.id)).toBe(false);
  });
});
