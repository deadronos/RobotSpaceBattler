import { RobotEntity, TeamId, WeaponType } from "../../ecs/world";

export interface FireEventInput {
  timestampMs: number;
  entityId: string;
  teamId: TeamId;
  weapon: WeaponType;
}

export interface DamageEventInput {
  timestampMs: number;
  attackerId: string;
  targetId: string;
  teamId: TeamId;
  amount: number;
}

export interface DeathEventInput {
  timestampMs: number;
  entityId: string;
  teamId: TeamId;
  attackerId?: string;
}

export interface TelemetryPort {
  reset: (matchId: string) => void;
  recordSpawn: (robot: RobotEntity, timestampMs: number) => void;
  recordFire: (event: FireEventInput) => void;
  recordDamage: (event: DamageEventInput) => void;
  recordDeath: (event: DeathEventInput) => void;
}
