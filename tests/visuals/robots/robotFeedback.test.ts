import { describe, expect, it } from "vitest";

import {
  HIT_FLASH_MS,
  MUZZLE_FLASH_MS,
  hitFlashIntensity,
  muzzleFlashIntensity,
  timeSinceFire,
} from "../../../src/visuals/robots/robotFeedback";

describe("hit flash trigger (#168)", () => {
  it("is strongest on the hit and fades out", () => {
    expect(hitFlashIntensity(1000, 1000)).toBe(1);
    expect(hitFlashIntensity(1000 + HIT_FLASH_MS / 2, 1000)).toBeCloseTo(0.5);
    expect(hitFlashIntensity(1000 + HIT_FLASH_MS, 1000)).toBe(0);
    expect(hitFlashIntensity(1000 + HIT_FLASH_MS + 500, 1000)).toBe(0);
  });

  it("ignores the spawn timestamp, so fresh robots do not flash", () => {
    expect(hitFlashIntensity(10, 0)).toBe(0);
    expect(hitFlashIntensity(0, 0)).toBe(0);
  });

  it("ignores timestamps in the future", () => {
    expect(hitFlashIntensity(500, 1000)).toBe(0);
  });
});

describe("muzzle flash trigger (#168)", () => {
  const fireRate = 2; // 0.5 s between shots
  const cooldownAtShot = 1 / fireRate;

  it("fires when a shot has just reset the cooldown", () => {
    expect(muzzleFlashIntensity(cooldownAtShot, fireRate)).toBe(1);
  });

  it("fades with the fraction of the flash window already elapsed", () => {
    const elapsed = MUZZLE_FLASH_MS / 2000; // seconds
    expect(
      muzzleFlashIntensity(cooldownAtShot - elapsed, fireRate),
    ).toBeCloseTo(0.5);
  });

  it("is off once the flash window passes, even while cooling down", () => {
    expect(
      muzzleFlashIntensity(
        cooldownAtShot - (MUZZLE_FLASH_MS + 20) / 1000,
        fireRate,
      ),
    ).toBe(0);
  });

  it("is off for robots that have not fired or are off cooldown", () => {
    expect(muzzleFlashIntensity(0, fireRate)).toBe(0);
    expect(muzzleFlashIntensity(cooldownAtShot, 0)).toBe(0);
  });

  it("derives time since the shot from the shared cooldown field", () => {
    expect(timeSinceFire(cooldownAtShot, fireRate)).toBe(0);
    expect(timeSinceFire(cooldownAtShot - 0.25, fireRate)).toBeCloseTo(0.25);
    expect(timeSinceFire(0, fireRate)).toBe(Number.POSITIVE_INFINITY);
  });
});
