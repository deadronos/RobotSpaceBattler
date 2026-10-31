import { describe, expect, it } from "vitest";

import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import type { NavigationMesh } from "@/simulation/ai/pathfinding/types";
import type { WorkerPathRequest } from "@/simulation/ai/pathfinding/worker/types";
import {
  createWorkerHandlerState,
  handleWorkerMessage,
} from "@/simulation/ai/pathfinding/worker/workerMessageHandler";

const request: WorkerPathRequest = {
  type: "path_request",
  id: "r1",
  start: { x: 10, y: 0, z: 10 },
  target: { x: 90, y: 0, z: 90 },
  enableSmoothing: true,
  enableNearestFallback: false,
};

function makeMesh() {
  return new NavMeshGenerator().generateFromArena({
    size: { width: 100, depth: 100 },
    obstacles: [],
  });
}

describe("workerMessageHandler", () => {
  it("path before init returns failed 'Worker not initialized'", () => {
    const state = createWorkerHandlerState();
    const out = handleWorkerMessage(state, { type: "path", seq: 7, request });
    expect(out.type).toBe("path_result");
    if (out.type !== "path_result") return;
    expect(out.seq).toBe(7);
    expect(out.result.status).toBe("failed");
    expect(out.result.error).toBe("Worker not initialized");
    expect(state.served).toBe(0);
  });

  it("init then path returns success and increments served", () => {
    const state = createWorkerHandlerState();
    const init = handleWorkerMessage(state, {
      type: "init",
      seq: 1,
      mesh: makeMesh(),
    });
    expect(init).toEqual({ type: "init_ok", seq: 1 });
    const out = handleWorkerMessage(state, { type: "path", seq: 2, request });
    expect(out.type).toBe("path_result");
    if (out.type !== "path_result") return;
    expect(out.seq).toBe(2);
    expect(out.result.status).toBe("success");
    expect(state.served).toBe(1);
  });

  it("init with invalid mesh returns init_error", () => {
    const state = createWorkerHandlerState();
    const out = handleWorkerMessage(state, {
      type: "init",
      seq: 3,
      mesh: {} as unknown as NavigationMesh,
    });
    expect(out).toEqual({ type: "init_error", seq: 3, error: "Invalid mesh" });
  });
});
