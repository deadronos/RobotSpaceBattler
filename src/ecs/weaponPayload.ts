import { ensureGameplayId } from "./id";

export type WeaponType = "gun" | "laser" | "rocket";

export interface WeaponAmmo {
  clip: number;
  clipSize: number;
  reserve: number;
}

export interface WeaponBeamParams {
  durationMs?: number;
  width?: number;
  tickIntervalMs?: number;
  damagePerTick?: number;
}

export interface WeaponFlags {
  continuous?: boolean;
  chargeable?: boolean;
  burst?: boolean;
  homing?: boolean;
}

export interface WeaponPayload {
  id: string;
  type: WeaponType;
  power: number;
  range?: number;
  cooldownMs?: number;
  accuracy?: number;
  spreadRad?: number;
  ammo?: WeaponAmmo;
  energyCost?: number;
  projectilePrefab?: string;
  aoeRadius?: number;
  beamParams?: WeaponBeamParams;
  flags?: WeaponFlags;
}

type WeaponLike = WeaponPayload & Record<string, unknown>;

export function toPersistedWeaponPayload(weapon: WeaponLike): WeaponPayload {
  const payload: WeaponPayload = {
    id: ensureGameplayId(weapon.id),
    type: weapon.type,
    power: weapon.power,
  };

  copyIfDefined(payload, weapon, "range");
  copyIfDefined(payload, weapon, "cooldownMs");
  copyIfDefined(payload, weapon, "accuracy");
  copyIfDefined(payload, weapon, "spreadRad");
  copyIfDefined(payload, weapon, "energyCost");
  copyIfDefined(payload, weapon, "projectilePrefab");
  copyIfDefined(payload, weapon, "aoeRadius");

  if (weapon.ammo) {
    payload.ammo = {
      clip: weapon.ammo.clip,
      clipSize: weapon.ammo.clipSize,
      reserve: weapon.ammo.reserve,
    };
  }

  if (weapon.beamParams) {
    payload.beamParams = {
      durationMs: weapon.beamParams.durationMs,
      width: weapon.beamParams.width,
      tickIntervalMs: weapon.beamParams.tickIntervalMs,
      damagePerTick: weapon.beamParams.damagePerTick,
    };
  }

  if (weapon.flags) {
    payload.flags = {
      continuous: weapon.flags.continuous,
      chargeable: weapon.flags.chargeable,
      burst: weapon.flags.burst,
      homing: weapon.flags.homing,
    };
  }

  return payload;
}

export function validateWeaponPayload(payload: WeaponPayload) {
  if (!payload.id) throw new Error("WeaponPayload.id is required");
  if (!payload.type) throw new Error("WeaponPayload.type is required");
  if (typeof payload.power !== "number")
    throw new Error("WeaponPayload.power must be a number");
}

function copyIfDefined<T extends keyof WeaponPayload>(
  target: WeaponPayload,
  source: WeaponLike,
  key: T,
) {
  if (source[key] !== undefined) {
    target[key] = source[key] as WeaponPayload[T];
  }
}
