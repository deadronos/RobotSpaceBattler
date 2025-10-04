/**
 * Pause/Resume determinism tests.
 */

import { describe, it, expect, vi } from "vitest";
import { capturePauseVel, restorePauseVel } from "../../src/ecs/pauseManager";
import { FixedStepDriver } from "../../src/utils/fixedStepDriver";

function createRigidBody() {
  return {
    linvel: vi.fn(() => ({ x: 5, y: 0, z: 0 })),
    angvel: vi.fn(() => ({ x: 0, y: 1, z: 0 })),
    setLinvel: vi.fn(),
    setAngvel: vi.fn(),
  };
}

describe("pause/resume determinism", () => {
  it("should capture and restore rigid body velocities", () => {
    const rigid = createRigidBody();
    const entity: any = { rigid };
    const world = { entities: [entity] };

    capturePauseVel(world as any);

    expect(rigid.setLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    expect(rigid.setAngvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);

    restorePauseVel(world as any);

    expect(rigid.setLinvel).toHaveBeenCalledWith({ x: 5, y: 0, z: 0 }, true);
    expect(rigid.setAngvel).toHaveBeenCalledWith({ x: 0, y: 1, z: 0 }, true);
  });

  it("should expose pause/resume controls on FixedStepDriver", () => {
    const driver = new FixedStepDriver(123, 1 / 60) as any;
    expect(typeof driver.pause).toBe("function");
    expect(typeof driver.resume).toBe("function");

    const ctxBefore = driver.stepOnce();
    const token = driver.pause();
    driver.stepOnce();
    driver.resume(token);
    const ctxAfter = driver.stepOnce();

    expect(ctxAfter.frameCount).toBeGreaterThan(ctxBefore.frameCount);
  });
});
