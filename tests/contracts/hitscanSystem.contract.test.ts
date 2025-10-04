/**
 * HitscanSystem contract tests.
 */

import { describe, it, expect } from "vitest";
import { hitscanSystem as hitscanSystemModule } from "../../src/systems/HitscanSystem";
import { createTestStepContext } from "../helpers/fixedStepHarness";

const hitscanSystem = hitscanSystemModule as unknown as (params: {
  world: any;
  stepContext: ReturnType<typeof createTestStepContext>;
  physicsAdapter: {
    raycast: () => { targetId?: number; position: [number, number, number]; normal: [number, number, number] } | null;
  };
  weaponFiredEvents: any[];
  events: { damage: any[]; impact: any[] };
}) => void;

describe("HitscanSystem contract", () => {
  it("should use physics adapter raycast results deterministically", () => {
    const ctx = createTestStepContext({ frameCount: 5, simNowMs: 500 });
    const world = { entities: [] };
    const physicsAdapter = {
      raycast: () => ({
        targetId: 42,
        position: [1, 0, 0] as [number, number, number],
        normal: [0, 1, 0] as [number, number, number],
      }),
    };

    const weaponFiredEvents = [
      {
        weaponId: "gun-1",
        ownerId: 1,
        type: "gun",
        origin: [0, 0, 0],
        direction: [1, 0, 0],
      },
    ];

    const events = { damage: [] as any[], impact: [] as any[] };

    hitscanSystem({
      world,
      stepContext: ctx,
      physicsAdapter,
      weaponFiredEvents,
      events,
    });

    expect(events.damage).toHaveLength(1);
    expect(events.damage[0].targetId).toBe('42');
    expect(events.impact[0].position).toEqual([1, 0, 0]);
  });
});
