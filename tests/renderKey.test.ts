import { describe, expect, it } from "vitest";

import { createRenderKeyGenerator } from "../src/ecs/renderKey";

type TestEntity = { id?: number | string };

describe("renderKey", () => {
  it("returns stable key for the same entity", () => {
    const getRenderKey = createRenderKeyGenerator<TestEntity>();
    const entity: TestEntity = { id: 5 };

    const first = getRenderKey(entity);
    const second = getRenderKey(entity);

    expect(first).toBe(second);
  });

  it("generates unique keys for distinct entities even with matching ids", () => {
    const getRenderKey = createRenderKeyGenerator<TestEntity>();

    const entityA: TestEntity = { id: 1 };
    const entityB: TestEntity = { id: 1 };

    const keyA = getRenderKey(entityA);
    const keyB = getRenderKey(entityB);

    expect(keyA).not.toBe(keyB);
  });

  it("includes fallback index in generated key", () => {
    const getRenderKey = createRenderKeyGenerator<TestEntity>();
    const entity: TestEntity = {};

    const key = getRenderKey(entity, 7);

    expect(key.endsWith("_7")).toBe(true);
  });
});
