import type { WeaponComponent, WeaponType } from "../ecs/weapons";

type WeaponProfile = Pick<
  WeaponComponent,
  | "range"
  | "cooldown"
  | "power"
  | "accuracy"
  | "spread"
  | "ammo"
  | "aoeRadius"
  | "beamParams"
  | "flags"
>;

export const weaponProfiles: Record<WeaponType, WeaponProfile> = {
  gun: {
    range: 15,
    cooldown: 0.5,
    power: 15,
    accuracy: 0.8,
    spread: 0.1,
    ammo: { clip: 10, clipSize: 10, reserve: 50 },
    aoeRadius: undefined,
    beamParams: undefined,
    flags: undefined,
  },
  laser: {
    range: 25,
    cooldown: 1.5,
    power: 8,
    accuracy: 0.95,
    spread: 0,
    ammo: undefined,
    aoeRadius: undefined,
    beamParams: { duration: 1000, width: 0.1, tickInterval: 100 },
    flags: { continuous: true },
  },
  rocket: {
    range: 20,
    cooldown: 2,
    power: 25,
    accuracy: 0.7,
    spread: 0,
    ammo: undefined,
    aoeRadius: 3,
    beamParams: undefined,
    flags: undefined,
  },
};

export type { WeaponProfile };
