/**
 * WeaponSystem contract tests.
 *
 * Verifies:
 * - Deterministic cooldown handling and event emission
 * - WeaponFiredEvent carries deterministic id/timestamp derived from StepContext
 */

import { describe, it, expect } from "vitest";
import { weaponSystem as weaponSystemModule } from "../../src/systems/WeaponSystem";
import { createTestStepContext, createIdFactory } from "../helpers/fixedStepHarness";

const weaponSystem = weaponSystemModule as unknown as (params: {
  world: any;
  stepContext: ReturnType<typeof createTestStepContext>;
  events: { weaponFired: any[]; damage: any[] };
  rng: () => number;
  idFactory: () => string;
}) => void;

describe("WeaponSystem contract", () => {
  it("should emit deterministic WeaponFiredEvent with id", () => {
    const ctx = createTestStepContext({ frameCount: 10, simNowMs: 160 });
    const idFactory = createIdFactory(ctx);

    const entity = {
      id: 1,
      team: "red" as const,
      position: [0, 0, 0] as [number, number, number],
      weapon: {
        id: "laser-1",
        type: "laser" as const,
        power: 10,
        cooldown: 0.5,
      },
      weaponState: {
        firing: true,
        cooldownRemaining: 0,
      },
    };

    const world = {
      entities: [entity],
    };

    const events = { weaponFired: [] as any[], damage: [] as any[] };

    weaponSystem({
      world,
      stepContext: ctx,
      events,
      rng: ctx.rng,
      idFactory,
    });

    expect(events.weaponFired).toHaveLength(1);
    const fired = events.weaponFired[0];
    expect(typeof fired.id).toBe("string");
    expect(fired.id).toMatch(/\d+-\d+-\d+/);
    expect(fired.timestamp).toBe(ctx.simNowMs);
  });
});
