import { beforeEach, describe, expect, it } from 'vitest';
import { World as MiniplexWorld } from 'miniplex';

import { spawnInitialTeams } from '../../../src/ecs/systems/spawnSystem';
import { createDefaultArena } from '../../../src/ecs/entities/Arena';
import { createInitialSimulationState } from '../../../src/ecs/entities/SimulationState';
import { createInitialTeam, type TeamEntity } from '../../../src/ecs/entities/Team';
import type { Projectile } from '../../../src/ecs/entities/Projectile';
import type { Robot } from '../../../src/ecs/entities/Robot';
import { createPhysicsState } from '../../../src/ecs/simulation/physics';
import type { WorldView } from '../../../src/ecs/simulation/worldTypes';
import type { Team } from '../../../src/types';
import { distance } from '../../../src/ecs/utils/vector';

interface TestWorld extends WorldView {
  ecs: {
    robots: MiniplexWorld<Robot>;
    projectiles: MiniplexWorld<Projectile>;
    teams: MiniplexWorld<TeamEntity>;
  };
}

function createTestWorld(): TestWorld {
  const arena = createDefaultArena();
  return {
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
}

describe('spawnSystem', () => {
  let world: TestWorld;

  beforeEach(() => {
    world = createTestWorld();
    spawnInitialTeams(world, ['red', 'blue']);
  });

  it('spawns 10 robots per team with full roster of 20 robots', () => {
    const redRobots = world.entities.filter((robot) => robot.team === 'red');
    const blueRobots = world.entities.filter((robot) => robot.team === 'blue');

    expect(redRobots).toHaveLength(10);
    expect(blueRobots).toHaveLength(10);
    expect(world.entities).toHaveLength(20);
  });

  it('assigns a single captain per team and updates team state', () => {
    (['red', 'blue'] as Team[]).forEach((team) => {
      const robots = world.entities.filter((robot) => robot.team === team);
      const captains = robots.filter((robot) => robot.isCaptain);

      expect(captains).toHaveLength(1);
      expect(world.teams[team].captainId).toBe(captains[0].id);
    });
  });

  it('positions robots within their spawn zone radius and enforces minimum spacing', () => {
    const allRobots = world.entities;

    (['red', 'blue'] as Team[]).forEach((team) => {
      const zone = world.arena.spawnZones[team];
      const robots = allRobots.filter((robot) => robot.team === team);

      robots.forEach((robot) => {
        const distToCenter = distance(robot.position, zone.center);
        expect(distToCenter).toBeLessThanOrEqual(zone.radius);
      });
    });

    for (let i = 0; i < allRobots.length; i += 1) {
      for (let j = i + 1; j < allRobots.length; j += 1) {
        const separation = distance(allRobots[i].position, allRobots[j].position);
        expect(separation).toBeGreaterThan(2);
      }
    }
  });

  it('creates physics bodies for all robots', () => {
    expect(world.physics.robots.size).toBe(20);
  });
});
