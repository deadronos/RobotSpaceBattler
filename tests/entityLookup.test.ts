import { describe, expect, it, vi } from "vitest";

import { createEntityLookup } from "../src/ecs/entityLookup";

type TestEntity = { id?: number | string; name?: string };

describe("entityLookup", () => {
  it("assigns incremental ids when none provided", () => {
    const lookup = createEntityLookup<TestEntity>();
    const a: TestEntity = {};
    const b: TestEntity = {};

    const idA = lookup.ensureEntityId(a);
    const idB = lookup.ensureEntityId(b);

    expect(idA).toBe(1);
    expect(idB).toBe(2);
    expect(lookup.getById(idA!)).toBe(a);
    expect(lookup.getById(idB!)).toBe(b);
  });

  it("tracks provided numeric ids and advances counter", () => {
    const lookup = createEntityLookup<TestEntity>();
    const existing: TestEntity = { id: 10 };
    lookup.ensureEntityId(existing);

    const next: TestEntity = {};
    const generated = lookup.ensureEntityId(next);

    expect(generated).toBe(11);
    expect(lookup.getById(10)).toBe(existing);
    expect(lookup.getById(11)).toBe(next);
  });

  it("notifies subscribers and swallows listener errors", () => {
    const lookup = createEntityLookup<TestEntity>();
    const listener = vi.fn();
    lookup.subscribe(listener);

    const noisy = vi.fn(() => {
      throw new Error("boom");
    });
    lookup.subscribe(noisy);

    const entity: TestEntity = { id: 42 };
    lookup.notify(entity);

    expect(listener).toHaveBeenCalledWith(entity);
    expect(noisy).toHaveBeenCalled();
    expect(() => lookup.notify(undefined)).not.toThrow();
  });

  it("clears tracked entities and resets id counter", () => {
    const lookup = createEntityLookup<TestEntity>();
    const entity: TestEntity = {};
    const id = lookup.ensureEntityId(entity);
    expect(id).toBe(1);

    lookup.clear();

    const next = lookup.ensureEntityId({});
    expect(next).toBe(1);
    expect(lookup.getById(1)).not.toBe(entity);
  });
});
