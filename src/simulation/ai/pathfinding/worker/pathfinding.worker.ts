/// <reference lib="webworker" />
import type { WorkerInbound } from "./types";
import {
  createWorkerHandlerState,
  handleWorkerMessage,
  type WorkerHandlerState,
} from "./workerMessageHandler";

const state = createWorkerHandlerState();
// Exposed for the Playwright proof that paths are computed in the worker.
(
  self as unknown as { __pathfindingState: WorkerHandlerState }
).__pathfindingState = state;

self.onmessage = (e: MessageEvent<WorkerInbound>) => {
  self.postMessage(handleWorkerMessage(state, e.data));
};
