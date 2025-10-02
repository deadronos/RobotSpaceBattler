import React from "react";
import { cleanup, render } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const frameCallbacks: Array<(state?: unknown, delta?: number) => void> = [];

vi.mock("@react-three/fiber", () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    frameCallbacks.push(cb);
  },
}));

import { useEntityPhysicsSync } from "../src/hooks/useEntityPhysicsSync";
import type { RigidBodyHandle } from "../src/hooks/useEntityPhysicsSync";

type TestEntity = {
  position: [number, number, number];
  velocity?: [number, number, number];
  rigid?: unknown;
};

function TestHarness({ entity, body }: { entity: TestEntity; body: RigidBodyHandle }) {
  const { setRigidBody } = useEntityPhysicsSync(entity as any);
  React.useEffect(() => {
    setRigidBody(body);
    return () => setRigidBody(null);
  }, [body, setRigidBody]);
  return null;
}

describe("useEntityPhysicsSync", () => {
  beforeEach(() => {
    frameCallbacks.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    frameCallbacks.length = 0;
  });

  it("updates entity translation and reapplies velocity when rigid body drifts", () => {
    const entity: TestEntity = {
      position: [0, 0, 0],
      velocity: [3, 0, 0],
      rigid: null,
    };
    const setLinvel = vi.fn();
    const linvel = vi.fn(() => ({ x: 0, y: 0, z: 0 }));
    const translation = vi.fn(() => ({ x: 5, y: 1, z: -2 }));
    const body: RigidBodyHandle = {
      translation: translation as unknown as RigidBodyHandle["translation"],
      linvel: linvel as unknown as RigidBodyHandle["linvel"],
      setLinvel: setLinvel as unknown as RigidBodyHandle["setLinvel"],
    };

    render(<TestHarness entity={entity} body={body} />);

    const frame = frameCallbacks[frameCallbacks.length - 1];
    setLinvel.mockClear();
    frame?.({}, 1 / 60);

    expect(entity.position).toEqual([5, 1, -2]);
    expect(setLinvel).toHaveBeenCalledWith({ x: 3, y: 0, z: 0 }, true);

    setLinvel.mockClear();
    linvel.mockReturnValue({ x: 3, y: 0, z: 0 });
    frame?.({}, 1 / 60);
    expect(setLinvel).not.toHaveBeenCalled();
  });

  it("skips velocity updates when within epsilon", () => {
    const entity: TestEntity = {
      position: [0, 0, 0],
      velocity: [1, 0, 0],
      rigid: null,
    };
    const setLinvel = vi.fn();
    const body: RigidBodyHandle = {
      translation: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      linvel: vi.fn(() => ({ x: 1.00005, y: 0, z: 0 })),
      setLinvel: setLinvel as unknown as RigidBodyHandle["setLinvel"],
    };

    render(<TestHarness entity={entity} body={body} />);

    const frame = frameCallbacks[frameCallbacks.length - 1];
    setLinvel.mockClear();
    frame?.({}, 1 / 60);

    expect(setLinvel).not.toHaveBeenCalled();
  });

  it("clears entity rigid reference on unmount", () => {
    const entity: TestEntity = {
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      rigid: null,
    };
    const body: RigidBodyHandle = {
      translation: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      linvel: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
      setLinvel: vi.fn() as unknown as RigidBodyHandle["setLinvel"],
    };

    const { unmount } = render(<TestHarness entity={entity} body={body} />);
    expect(entity.rigid).toBe(body);

    unmount();
    expect(entity.rigid).toBeNull();
  });
});