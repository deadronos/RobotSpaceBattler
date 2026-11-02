import { describe, expect, it } from "vitest";

import { createTestRobot } from "../../helpers/robotFactory";
import {
  createRobotSlotBuffers,
  fillRobotSlots,
  roleIndex,
} from "../../../src/visuals/robots/robotInstanceBuffer";
import { ROBOT_ROLES } from "../../../src/visuals/robots/robotLayout";

describe("robot instance slot buffers (#168)", () => {
  it("groups robots by role in ECS order", () => {
    const buffers = createRobotSlotBuffers(4);
    const assaultA = createTestRobot({ id: "a", role: "assault" });
    const tank = createTestRobot({ id: "t", role: "tank" });
    const assaultB = createTestRobot({ id: "b", role: "assault" });

    fillRobotSlots([assaultA, tank, assaultB], buffers);

    expect(buffers.counts[roleIndex("assault")]).toBe(2);
    expect(buffers.slots[roleIndex("assault")]).toEqual([
      assaultA,
      assaultB,
      undefined,
      undefined,
    ]);
    expect(buffers.counts[roleIndex("tank")]).toBe(1);
    expect(buffers.slots[roleIndex("tank")][0]).toBe(tank);
    expect(buffers.counts[roleIndex("sniper")]).toBe(0);
  });

  it("resets counts before every fill, so dead robots leave their slot", () => {
    const buffers = createRobotSlotBuffers(2);
    const a = createTestRobot({ id: "a" });
    const b = createTestRobot({ id: "b" });

    fillRobotSlots([a, b], buffers);
    expect(buffers.counts[roleIndex("assault")]).toBe(2);

    fillRobotSlots([a], buffers);
    expect(buffers.counts[roleIndex("assault")]).toBe(1);
  });

  it("drops robots past a role's capacity instead of growing", () => {
    const buffers = createRobotSlotBuffers(1);
    const a = createTestRobot({ id: "a" });
    const b = createTestRobot({ id: "b" });

    fillRobotSlots([a, b], buffers);

    expect(buffers.counts[roleIndex("assault")]).toBe(1);
    expect(buffers.slots[roleIndex("assault")][0]).toBe(a);
  });

  it("has a slot buffer per role", () => {
    const buffers = createRobotSlotBuffers(3);
    expect(buffers.counts).toHaveLength(ROBOT_ROLES.length);
    expect(buffers.slots).toHaveLength(ROBOT_ROLES.length);
  });

  it("falls back to the assault bucket for an unknown role index", () => {
    expect(roleIndex("assault")).toBe(ROBOT_ROLES.indexOf("assault"));
    expect(roleIndex("medic")).toBe(ROBOT_ROLES.indexOf("medic"));
  });
});
