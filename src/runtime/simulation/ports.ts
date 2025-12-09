import { RobotEntity, TeamId, WeaponType } from '../../ecs/world';

/**
 * Data payload for a weapon fire event.
 */
export interface FireEventInput {
  timestampMs: number;
  entityId: string;
  teamId: TeamId;
  weapon: WeaponType;
}

/**
 * Data payload for a damage event.
 */
export interface DamageEventInput {
  timestampMs: number;
  attackerId: string;
  targetId: string;
  teamId: TeamId;
  amount: number;
}

/**
 * Data payload for a robot death event.
 */
export interface DeathEventInput {
  timestampMs: number;
  entityId: string;
  teamId: TeamId;
  attackerId?: string;
}

/**
 * Interface describing the telemetry recording capabilities required by the simulation.
 * Decouples the simulation from the state management/storage.
 */
export interface TelemetryPort {
  /** Resets telemetry for a new match. */
  reset: (matchId: string) => void;
  /** Records a robot spawn event. */
  recordSpawn: (robot: RobotEntity, timestampMs: number) => void;
  /** Records a weapon fire event. */
  recordFire: (event: FireEventInput) => void;
  /** Records a damage event. */
  recordDamage: (event: DamageEventInput) => void;
  /** Records a robot death event. */
  recordDeath: (event: DeathEventInput) => void;
}
