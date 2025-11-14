import { describe, it, expect } from "vitest";
import { VisualPool } from "../../src/visuals/pools";

describe("VisualPool", () => {
  it("reuses released instances", () => {
    let factoryCount = 0;
    const pool = new VisualPool(() => {
      factoryCount += 1;
      return { index: factoryCount };
    });

    const first = pool.acquire();
    pool.release(first);
    const second = pool.acquire();

    expect(second).toBe(first);
    expect(factoryCount).toBe(1);
  });

  it("respects max size when releasing", () => {
    const pool = new VisualPool(
      () => ({ value: Math.random() }),
      { maxSize: 1 },
    );

    const one = pool.acquire();
    const two = pool.acquire();
    pool.release(one);
    pool.release(two);

    expect(pool.size()).toBe(1);
  });
});
