import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { world, createRobotEntity, resetWorld } from "../src/ecs/miniplexStore";
import { capturePauseVel, restorePauseVel } from "../src/ecs/pauseManager";

describe("pauseManager", () => {
  beforeEach(() => {
    resetWorld();
  });

  afterEach(() => {
    resetWorld();
  });

  it("captures and zeros velocities, then restores them", () => {
    const setLinvel = vi.fn();
    const setAngvel = vi.fn();
    const rigidMock = {
      linvel: () => ({ x: 1, y: 2, z: 3 }),
      angvel: () => ({ x: 4, y: 5, z: 6 }),
      setLinvel,
      setAngvel,
    };

    const robot = createRobotEntity({ team: "red" as any }) as any;
    robot.rigid = rigidMock;

    capturePauseVel(world);

    // pauseVel should be stored on the entity
    expect(robot.pauseVel).toBeDefined();
    expect(robot.pauseVel.lin).toEqual([1, 2, 3]);
    expect(robot.pauseVel.ang).toEqual([4, 5, 6]);
    // velocities should be zeroed
    expect(setLinvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);
    expect(setAngvel).toHaveBeenCalledWith({ x: 0, y: 0, z: 0 }, true);

    // restore
    setLinvel.mockClear();
    setAngvel.mockClear();
    restorePauseVel(world);

    // restored velocities called with original values
    expect(setLinvel).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 }, true);
    expect(setAngvel).toHaveBeenCalledWith({ x: 4, y: 5, z: 6 }, true);
    // pauseVel cleared
    expect(robot.pauseVel).toBeUndefined();
  });
});
