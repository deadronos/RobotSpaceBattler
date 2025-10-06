import type { ArenaEntity } from '../entities/Arena';
import type { Projectile } from '../entities/Projectile';
import type { Robot } from '../entities/Robot';
import type { SimulationState } from '../entities/SimulationState';
import type { TeamEntity } from '../entities/Team';
import type { PhysicsState } from './physics';
import type { Team } from '../../types';

export interface WorldView {
  arena: ArenaEntity;
  entities: Robot[];
  projectiles: Projectile[];
  teams: Record<Team, TeamEntity>;
  simulation: SimulationState;
  physics: PhysicsState;
}
