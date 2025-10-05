import { describe, it, expect } from "vitest";
import { toPersistedWeaponPayload } from "../../src/ecs/weaponPayload";

// T057 - failing test skeleton for persisted WeaponPayload schema
// This test intentionally asserts schema expectations; implementation is pending.

describe("T057 - WeaponPayload persisted schema", () => {
  it("exports toPersistedWeaponPayload and produces persisted shape", () => {
    expect(typeof toPersistedWeaponPayload).toBe("function");

    const sampleWeapon = {
      id: "weapon-1",
      type: "gun",
      power: 10,
      range: 8,
      cooldownMs: 1000,
      accuracy: 0.9,
      spreadRad: 0.05,
      ammo: { clip: 10, clipSize: 10, reserve: 30 },
    } as any;

    const payload = toPersistedWeaponPayload(sampleWeapon as any);

    expect(payload).toHaveProperty("id");
    expect(payload).toHaveProperty("type");
    expect(payload).toHaveProperty("power");
    expect(payload).not.toHaveProperty("runtimeOnly");
  });
});