import { describe, it, expect } from "vitest";
import { createTestStepContext } from "../helpers/fixedStepHarness";
import { projectileSystem as projectileSystemModule } from "../../src/systems/ProjectileSystem";

type StepContext = ReturnType<typeof createTestStepContext>;

// New API expected: projectileSystem({ world, stepContext, weaponFiredEvents, events, rapierWorld, flags })
const projectileSystem = projectileSystemModule as unknown as (
  params: {
    world: any;
    stepContext: StepContext;
    weaponFiredEvents: any[];
    events: { damage: any[] };
    rapierWorld?: unknown;
    flags?: { friendlyFire?: boolean };
  }
) => void;

describe("ProjectileSystem (StepContext API)", () => {
  it("uses StepContext.rng for homing target selection", () => {
    const ctx = createTestStepContext({ rng: () => 0.9, frameCount: 1, simNowMs: 1000 });

    const projectile = {
      id: "p1",
      projectile: {
        sourceWeaponId: "w1",
        ownerId: 1,
        damage: 10,
        team: "red",
        aoeRadius: 0,
        lifespan: 5,
        spawnTime: 0,
        speed: 20,
        homing: { turnSpeed: 2, targetId: undefined },
      },
      position: [0, 0, 0],
      velocity: [1, 0, 0],
    } as any;

    const targetA = { id: "t1", team: "blue", position: [10, 0, 0] };
    const targetB = { id: "t2", team: "blue", position: [-10, 0, 0] };

    const world = {
      entities: [projectile, targetA, targetB],
      add: () => {},
      remove: () => {},
    };

    const events = { damage: [] as any[] };

    projectileSystem({ world, stepContext: ctx, weaponFiredEvents: [], events });

    // rng 0.9 should pick targetB (second in array)
    expect(projectile.projectile.homing?.targetId).toBe("t2");
  });

  it("does not access useUI store directly when using StepContext API", () => {
    const ctx = createTestStepContext();

    const world = { entities: [], add: () => {}, remove: () => {} };
    const events = { damage: [] as any[] };

    const useUI = require("../../src/store/uiStore");
    const getStateSpy = vi.spyOn(useUI, "getState").mockImplementation(() => {
      throw new Error("useUI.getState should not be called by systems");
    });

    expect(() => projectileSystem({ world, stepContext: ctx, weaponFiredEvents: [], events })).not.toThrow();

    expect(getStateSpy).not.toHaveBeenCalled();

    getStateSpy.mockRestore();
  });
});
