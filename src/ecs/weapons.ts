import type { Team } from "./id";
import type {
  WeaponAmmo,
  WeaponBeamParams,
  WeaponFlags,
  WeaponPayload,
} from "./weaponPayload";

export type { WeaponType } from "./weaponPayload";

export interface WeaponComponent extends WeaponPayload {
  ownerId: string;
  team: Team;
  cooldown: number; // seconds (runtime convenience)
  lastFiredAt?: number;
  spread?: number; // legacy radians convenience
  ammo?: WeaponAmmo;
  beamParams?: WeaponBeamParams;
  flags?: WeaponFlags & {
    friendlyFire?: boolean;
  };
}

export interface WeaponStateComponent {
  firing?: boolean;
  reloading?: boolean;
  chargeStart?: number;
  cooldownRemaining?: number;
}

// ProjectileComponent is now defined canonically in ./components/projectile
// (imports should reference that module directly). Previously re-exported here.

export interface BeamComponent {
  sourceWeaponId: string;
  ownerId: string;
  firedAt: number;
  origin: [number, number, number];
  direction: [number, number, number];
  length: number;
  width: number;
  activeUntil: number;
  tickDamage: number;
  tickInterval: number;
  lastTickAt: number;
}

export interface DamageEvent {
  sourceId: string | number;
  weaponId?: string;
  targetId?: number | string;
  position?: [number, number, number];
  damage: number;
}
