import { describe, expect, it, vi } from "vitest";

import { createWorldController } from "../src/ecs/worldFactory";

type TestEntity = { id: number };

describe("worldFactory", () => {
  it("invokes lifecycle hooks when adding and removing entities", () => {
    const onEntityAdded = vi.fn();
    const onEntityRemoved = vi.fn();

    const controller = createWorldController<TestEntity>({
      onEntityAdded,
      onEntityRemoved,
    });

    const entity: TestEntity = { id: 1 };

    controller.add(entity);
    expect(onEntityAdded).toHaveBeenCalledWith(entity);

    controller.remove(entity);
    expect(onEntityRemoved).toHaveBeenCalledWith(entity);
  });

  it("resets the world by removing all entities", () => {
    const onEntityRemoved = vi.fn();
    const controller = createWorldController<TestEntity>({
      onEntityRemoved,
    });

    const entityA: TestEntity = { id: 1 };
    const entityB: TestEntity = { id: 2 };

    controller.add(entityA);
    controller.add(entityB);

    const entityCount = () => Array.from(controller.world.entities).length;

    expect(entityCount()).toBe(2);

    controller.reset();

    expect(entityCount()).toBe(0);
    expect(onEntityRemoved).toHaveBeenCalledTimes(2);
  });
});
