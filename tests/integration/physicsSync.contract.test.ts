/**
 * PhysicsSync contract test.
 *
 * Ensures:
 * - RigidBody translation is copied into ECS position component without replacing the array reference
 * - notifyEntityChanged is called when position changes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { physicsSyncSystem } from "../../src/systems/PhysicsSyncSystem";
import * as miniplexStore from "../../src/ecs/miniplexStore";

const notifySpy = vi.spyOn(miniplexStore, "notifyEntityChanged");

describe("physics sync system", () => {
  beforeEach(() => {
    notifySpy.mockClear();
  });

  afterEach(() => {
    notifySpy.mockReset();
  });

  it("should copy rigid translation without replacing position reference", () => {
    const position: [number, number, number] = [0, 0, 0];
    const rigid = {
      translation: () => ({ x: 1, y: 2, z: 3 }),
    };

    const entity: any = { position, rigid };
    const world = {
      entities: [entity],
    };

    physicsSyncSystem(world as any);

    expect(entity.position).toBe(position);
    expect(position[0]).toBe(1);
    expect(position[1]).toBe(2);
    expect(position[2]).toBe(3);
    expect(notifySpy).toHaveBeenCalledWith(entity);
  });
});
