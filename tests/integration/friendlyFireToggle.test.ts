/**
 * Integration test ensuring systems do not read friendly-fire toggle directly from UI store.
 *
 * Simulation should inject the toggle via StepContext; ProjectileSystem must avoid calling useUI.
 */

import { describe, it, expect, vi } from "vitest";
import { projectileSystem as projectileSystemModule } from "../../src/systems/ProjectileSystem";
import { useUI } from "../../src/store/uiStore";

const projectileSystem = projectileSystemModule as unknown as (
  world: any,
  dt: number,
  rng: () => number,
  weaponFiredEvents: any[],
  events: { damage: any[] },
  simNowMs: number
) => void;

describe("friendly-fire toggle wiring", () => {
  it("should not access useUI store directly", () => {
    const world = {
      entities: [] as any[],
      add: vi.fn(),
      remove: vi.fn(),
    };
    const events = { damage: [] as any[] };
    const rng = () => 0;

    const getStateSpy = vi
      .spyOn(useUI, "getState")
      .mockImplementation(() => {
        throw new Error("useUI.getState should not be called by systems");
      });

    expect(() =>
      projectileSystem(world, 1 / 60, rng, [], events, 0)
    ).not.toThrow();

    expect(getStateSpy).not.toHaveBeenCalled();

    getStateSpy.mockRestore();
  });
});
