import { describe, it, expect } from "vitest";
import { createBattleWorld } from "../../src/ecs/world";
import { spawnTeams } from "../../src/ecs/systems/spawnSystem";
import type { WeaponType } from "../../src/lib/weapons/types";

const WEAPON_TYPES: WeaponType[] = ["laser", "gun", "rocket"];

function getWeaponIds(worldSeed: number) {
  const world = createBattleWorld();
  spawnTeams(world, { seed: worldSeed });
  return world.robots.entities
    .map((robot) => robot.weapon)
    .sort();
}

describe("SpawnSystem seeded loadouts", () => {
  it("assigns the same weapons for identical seeds", () => {
    const first = getWeaponIds(0x12345);
    const second = getWeaponIds(0x12345);

    expect(first).toEqual(second);
  });

  it("produces different distributions for different seeds", () => {
    const first = getWeaponIds(0x12345);
    const second = getWeaponIds(0x54321);

    expect(first).not.toEqual(second);
  });

  it("only assigns known weapon types", () => {
    const weapons = getWeaponIds(0x99999);
    expect(weapons.every((weapon) => WEAPON_TYPES.includes(weapon))).toBe(true);
  });
});
