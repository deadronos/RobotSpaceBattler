import { describe, expect, it } from "vitest";

import {
  clearPauseVelocity,
  getPauseVelocity,
  setPauseVelocity,
  type PauseVelocityComponent,
  type Vec3,
} from "../src/ecs/pauseVelocity";

describe("pauseVelocity", () => {
  it("stores and retrieves linear and angular velocities", () => {
    const entity: PauseVelocityComponent = {};
    const lin: Vec3 = [1, 2, 3];
    const ang: Vec3 = [4, 5, 6];

    setPauseVelocity(entity, lin, ang);
    expect(getPauseVelocity(entity)).toEqual({ lin, ang });
  });

  it("clears stored velocities", () => {
    const entity: PauseVelocityComponent = {};
    setPauseVelocity(entity, [0, 0, 0]);

    clearPauseVelocity(entity);
    expect(getPauseVelocity(entity)).toBeUndefined();
  });
});
