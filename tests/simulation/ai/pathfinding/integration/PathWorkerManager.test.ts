import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavMeshResource } from "@/simulation/ai/pathfinding/integration/NavMeshResource";
import {
  PathWorkerManager,
  type WorkerLike,
} from "@/simulation/ai/pathfinding/integration/PathWorkerManager";
import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import type {
  WorkerInbound,
  WorkerOutbound,
  WorkerPathRequest,
} from "@/simulation/ai/pathfinding/worker/types";
import {
  createWorkerHandlerState,
  handleWorkerMessage,
} from "@/simulation/ai/pathfinding/worker/workerMessageHandler";

type Listener = (event: unknown) => void;

class FakeWorker implements WorkerLike {
  posted: WorkerInbound[] = [];
  terminate = vi.fn();
  private listeners = new Map<string, Listener[]>();
  private state = createWorkerHandlerState();

  constructor(private mode: "loopback" | "silent" | "init_error" = "silent") {}

  addEventListener(type: string, listener: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  postMessage(msg: WorkerInbound) {
    this.posted.push(msg);
    if (this.mode === "silent") return;
    queueMicrotask(() => {
      let out: WorkerOutbound;
      if (this.mode === "init_error" && msg.type === "init") {
        out = { type: "init_error", seq: msg.seq, error: "nope" };
      } else {
        out = handleWorkerMessage(this.state, msg);
      }
      this.emit("message", { data: out });
    });
  }

  emit(type: string, data: unknown = {}) {
    for (const l of this.listeners.get(type) ?? []) l(data);
  }
}

function makeMesh(width = 100) {
  return new NavMeshGenerator().generateFromArena({
    size: { width, depth: 100 },
    obstacles: [],
  });
}

function req(id = "r1"): WorkerPathRequest {
  return {
    type: "path_request",
    id,
    start: { x: 10, y: 0, z: 10 },
    target: { x: 90, y: 0, z: 90 },
    enableSmoothing: true,
    enableNearestFallback: false,
  };
}

function setup(
  mode: "loopback" | "silent" | "init_error" = "loopback",
  initTimeoutMs?: number,
) {
  const resource = new NavMeshResource(makeMesh());
  const fake = new FakeWorker(mode);
  const manager = new PathWorkerManager(resource, {
    createWorker: () => fake,
    initTimeoutMs,
  });
  return { resource, fake, manager };
}

async function expectSuccess(p: ReturnType<PathWorkerManager["runWorker"]>) {
  const res = await p;
  expect(res.ok).toBe(true);
  expect(res.ok ? res.value.status : undefined).toBe("success");
}

describe("PathWorkerManager", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("computes path through worker protocol", async () => {
    const { fake, manager } = setup();
    await expectSuccess(manager.runWorker(req()));
    expect(fake.posted[0].type).toBe("init");
    expect(fake.posted[1].type).toBe("path");
    expect(manager.mode).toBe("worker");
  });

  it("uses main thread silently when Worker is undefined", async () => {
    const resource = new NavMeshResource(makeMesh());
    const manager = new PathWorkerManager(resource, {
      createWorker: () => null,
    });
    await expectSuccess(manager.runWorker(req()));
    expect(manager.mode).toBe("main-thread");
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back once with a single warning on worker error", async () => {
    const { fake, manager } = setup("silent");
    const first = manager.runWorker(req());
    fake.emit("error", { message: "kaput" });
    await expectSuccess(first);
    const postedAfter = fake.posted.length;
    for (let i = 0; i < 3; i++) {
      await expectSuccess(manager.runWorker(req(`x${i}`)));
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(fake.terminate).toHaveBeenCalledTimes(1);
    expect(fake.posted.length).toBe(postedAfter);
    expect(manager.mode).toBe("main-thread");
  });

  it("drains in-flight requests to main thread on worker error", async () => {
    const { fake, manager } = setup("silent");
    const a = manager.runWorker(req("a"));
    const b = manager.runWorker(req("b"));
    fake.emit("error");
    await expectSuccess(a);
    await expectSuccess(b);
  });

  it("falls back once on late worker error", async () => {
    const { fake, manager } = setup("loopback");
    await expectSuccess(manager.runWorker(req()));
    fake.emit("error");
    await expectSuccess(manager.runWorker(req("later")));
    expect(manager.mode).toBe("main-thread");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back on init_error response", async () => {
    const { manager } = setup("init_error");
    await expectSuccess(manager.runWorker(req()));
    expect(manager.mode).toBe("main-thread");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("falls back after init timeout", async () => {
    vi.useFakeTimers();
    const { manager } = setup("silent", 100);
    const p = manager.runWorker(req());
    vi.advanceTimersByTime(100);
    await expectSuccess(p);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("re-inits when serialized mesh identity changes", async () => {
    const { resource, fake, manager } = setup("loopback");
    await expectSuccess(manager.runWorker(req()));
    const next = makeMesh(120);
    vi.spyOn(resource, "getSerializedMesh").mockReturnValue(next);
    await expectSuccess(manager.runWorker(req("again")));
    expect(fake.posted.filter((m) => m.type === "init")).toHaveLength(2);
  });

  it("dispose terminates the worker without warning", async () => {
    const { fake, manager } = setup("loopback");
    await expectSuccess(manager.runWorker(req()));
    const posted = fake.posted.length;
    manager.dispose();
    expect(fake.terminate).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    await expectSuccess(manager.runWorker(req("after")));
    expect(fake.posted.length).toBe(posted);
  });
});
