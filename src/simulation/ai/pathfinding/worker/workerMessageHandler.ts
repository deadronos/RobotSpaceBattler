import {
  createPathfindingEngine,
  type PathfindingEngine,
} from "./pathfindingEngine";
import type { WorkerInbound, WorkerOutbound } from "./types";

export interface WorkerHandlerState {
  engine: PathfindingEngine | null;
  /** Number of path_result messages whose status is not "failed". */
  served: number;
}

export function createWorkerHandlerState(): WorkerHandlerState {
  return { engine: null, served: 0 };
}

/** Pure message handler for the pathfinding worker. */
export function handleWorkerMessage(
  state: WorkerHandlerState,
  msg: WorkerInbound,
): WorkerOutbound {
  if (msg.type === "init") {
    const polygons = (msg.mesh as { polygons?: unknown } | null | undefined)
      ?.polygons;
    if (!Array.isArray(polygons) || polygons.length === 0) {
      return { type: "init_error", seq: msg.seq, error: "Invalid mesh" };
    }
    try {
      state.engine = createPathfindingEngine(msg.mesh);
      return { type: "init_ok", seq: msg.seq };
    } catch (error) {
      return {
        type: "init_error",
        seq: msg.seq,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const { request } = msg;
  if (!state.engine) {
    return {
      type: "path_result",
      seq: msg.seq,
      result: {
        id: request.id,
        path: null,
        status: "failed",
        error: "Worker not initialized",
        durationMs: 0,
      },
    };
  }

  const result = state.engine.calculatePath(request);
  if (result.status !== "failed") state.served++;
  return { type: "path_result", seq: msg.seq, result };
}
