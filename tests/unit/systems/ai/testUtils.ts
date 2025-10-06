import { World as MiniplexWorld } from 'miniplex';

import { createDefaultArena } from '../../../../src/ecs/entities/Arena';
import { createInitialSimulationState } from '../../../../src/ecs/entities/SimulationState';
import { createInitialTeam, type TeamEntity } from '../../../../src/ecs/entities/Team';
import { spawnInitialTeams } from '../../../../src/ecs/systems/spawnSystem';
import { createPhysicsState } from '../../../../src/ecs/simulation/physics';
import type { Projectile } from '../../../../src/ecs/entities/Projectile';
import type { Robot } from '../../../../src/ecs/entities/Robot';
import type { WorldView } from '../../../../src/ecs/simulation/worldTypes';

export interface TestWorld extends WorldView {
  ecs: {
    robots: MiniplexWorld<Robot>;
    projectiles: MiniplexWorld<Projectile>;
    teams: MiniplexWorld<TeamEntity>;
  };
}

export function createTestWorld(spawnTeamsImmediately = true): TestWorld {
  const arena = createDefaultArena();
  const redTeam = createInitialTeam('red', arena.spawnZones.red);
  const blueTeam = createInitialTeam('blue', arena.spawnZones.blue);
  const world: TestWorld = {
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
      teams: new MiniplexWorld<TeamEntity>(),
    },
  };

  world.ecs.teams.add(redTeam);
  world.ecs.teams.add(blueTeam);

  if (spawnTeamsImmediately) {
    spawnInitialTeams(world, ['red', 'blue']);
  }

  return world;
}

export function spawnTeams(world: TestWorld): void {
  spawnInitialTeams(world, ['red', 'blue']);
}
