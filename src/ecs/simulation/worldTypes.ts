import type { World as MiniplexWorld } from "miniplex";

import type { Team } from "../../types";
import type { ArenaEntity } from "../entities/Arena";
import type { Projectile } from "../entities/Projectile";
import type { Robot } from "../entities/Robot";
import type { SimulationState } from "../entities/SimulationState";
import type { TeamEntity } from "../entities/Team";
import type { PhysicsState } from "./physics";

export interface ECSCollections {
  robots: MiniplexWorld<Robot>;
  projectiles: MiniplexWorld<Projectile>;
  teams: MiniplexWorld<TeamEntity>;
}

export interface WorldView {
  arena: ArenaEntity;
  entities: Robot[];
  projectiles: Projectile[];
  teams: Record<Team, TeamEntity>;
  simulation: SimulationState;
  physics: PhysicsState;
  ecs?: ECSCollections;
}
