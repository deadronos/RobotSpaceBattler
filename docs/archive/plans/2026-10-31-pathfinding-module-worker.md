# Pathfinding Module Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `multithreading`-serialized pathfinding worker (broken in dev and prod: `loadModules is not defined`) with a native Vite module worker, a typed message protocol, and a one-time main-thread fallback.

**Architecture:** Pull the pathfinding logic into a pure, statically-imported `PathfindingEngine` usable on either thread. A thin worker entry wires `self.onmessage` to a pure message handler. `PathWorkerManager` owns the `Worker`, matches requests to responses by sequence number, and on any worker failure switches once, permanently, to running the same engine on the main thread with a single `console.warn`.

**Tech Stack:** TypeScript 7, Vite 8 (`new Worker(new URL(...), { type: "module" })`), Vitest 5 + jsdom, Playwright 1.64.

**Spec:** GitHub issue #157 (`gh issue view 157`). The acceptance criteria quoted there are the spec.

## Global Constraints

- Zero pathfinding-related console errors on `vite preview` and in dev.
- Paths must be computed in the worker in a real browser. Prove it with a Playwright test, not a stub.
- When init fails, fall back to main-thread pathing **once**, with **exactly one** `console.warn`. After that, no retries and no more logging.
- `npm run build` prints no `INEFFECTIVE_DYNAMIC_IMPORT` or "dynamic import will not move module into another chunk" warning for geometry / AStarSearch / NearestAccessiblePoint / PathOptimizer.
- Remove the `multithreading` dependency completely: package.json, lockfile, vite.config.ts, tests/setup.ts.
- Constitution: no source file over 300 LOC (`npm run check:source-size`). TDD: commit each failing test before or together with its implementation.
- Validation before finishing: `npm run format && npm run lint && npm run typecheck && npm run test && npm run check:source-size`.
- Commit subjects are short and imperative, e.g. `pathfinding: ...`.

## Review Focus

1. **Environment with no `Worker` global (jsdom/Node unit tests, SSR).** The manager must go straight to main-thread mode with **no** warning, so the ~20 existing pathfinding tests keep passing without noise. Test: Task 3 `"uses main thread silently when Worker is undefined"`.
2. **A request sent while init is still in flight, then init fails.** Pending requests must be re-run on the main thread and resolve. They must not hang or reject. Test: Task 3 `"drains in-flight requests to main thread on worker error"`.
3. **The worker crashes after a successful init** (an `error` event later on). Same one-time fallback, and the in-flight request still resolves. Test: Task 3 `"falls back once on late worker error"`.
4. **The worker never answers init** (silent hang). An init timeout (default 5000 ms) triggers fallback. Test: Task 3 `"falls back after init timeout"` with fake timers.
5. **The nav mesh changes via `NavMeshResource.updateMesh`.** The worker or engine must re-init with the new mesh before the next request instead of pathing on the stale one. Test: Task 3 `"re-inits when serialized mesh identity changes"`.

---

### Task 1: Pure `PathfindingEngine` with static imports

**Files:**
- Create: `src/simulation/ai/pathfinding/worker/pathfindingEngine.ts`
- Test: `tests/simulation/ai/pathfinding/worker/pathfindingEngine.test.ts`

**Interfaces:**
- Consumes: `AStarSearch` (`../search/AStarSearch`), `NearestAccessiblePoint` (`../search/NearestAccessiblePoint`), `PathOptimizer` (`../smoothing/PathOptimizer`), `distanceXZ` (`../../../../lib/math/geometry`). All are **static** imports.
- Produces:
  ```ts
  export interface PathfindingEngine {
    calculatePath(req: WorkerPathRequest): WorkerPathResult; // synchronous
  }
  export function createPathfindingEngine(mesh: NavigationMesh): PathfindingEngine;
  ```

- [ ] **Step 1: Write failing tests.** Build a real mesh the way `tests/integration/pathfinding-navigation.test.ts` does (NavMeshGenerator over an arena fixture; copy its setup). Tests:
  - `"returns success with waypoints and totalDistance for reachable target"`: `status === "success"`, `path.waypoints.length >= 1`, `path.totalDistance > 0`, every waypoint's `y === start.y`, `result.id === req.id`, and `path.smoothed === req.enableSmoothing`.
  - `"returns no_path for unreachable target when nearest fallback disabled"`: target far outside the arena (e.g. `{x: 9999, y: 0, z: 9999}`), `enableNearestFallback: false`, so `status === "no_path"` and `path === null`.
  - `"uses nearest accessible point when fallback enabled"`: same target with `enableNearestFallback: true`, so `status === "success"`.
  - `"returns failed with message when search throws"`: `vi.spyOn(AStarSearch.prototype, "findPath").mockImplementation(() => { throw new Error("boom"); })`, so `status === "failed"` and `error === "boom"`.
- [ ] **Step 2:** `npx vitest run tests/simulation/ai/pathfinding/worker/pathfindingEngine.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement.** Port the body of `calculatePath` from `worker/pathfinding.worker.ts:91-180`. The engine instance holds `astar`, `optimizer` and `nearestFinder` as fields, built in the factory. No module-level state, no `self`, no dynamic `import()`. The code becomes synchronous.
- [ ] **Step 4:** Re-run the test. Expected: PASS.
- [ ] **Step 5: Commit** `pathfinding: extract pure PathfindingEngine with static imports`.

### Task 2: Typed message protocol and worker entry

**Files:**
- Modify: `src/simulation/ai/pathfinding/worker/types.ts`
- Create: `src/simulation/ai/pathfinding/worker/workerMessageHandler.ts`
- Rewrite: `src/simulation/ai/pathfinding/worker/pathfinding.worker.ts` (entry only, ~15 LOC)
- Test: `tests/simulation/ai/pathfinding/worker/workerMessageHandler.test.ts`

**Interfaces:**
- Consumes: `createPathfindingEngine` (Task 1).
- Produces (in `types.ts`; keep the existing `WorkerPathRequest` / `WorkerPathResult` unchanged, and replace `WorkerInitMessage` / `WorkerMessage`):
  ```ts
  export type WorkerInbound =
    | { type: "init"; seq: number; mesh: NavigationMesh }
    | { type: "path"; seq: number; request: WorkerPathRequest };
  export type WorkerOutbound =
    | { type: "init_ok"; seq: number }
    | { type: "init_error"; seq: number; error: string }
    | { type: "path_result"; seq: number; result: WorkerPathResult };
  ```
  In `workerMessageHandler.ts`:
  ```ts
  export interface WorkerHandlerState { engine: PathfindingEngine | null; served: number }
  export function createWorkerHandlerState(): WorkerHandlerState;
  export function handleWorkerMessage(state: WorkerHandlerState, msg: WorkerInbound): WorkerOutbound;
  ```
  `served` counts `path_result` messages whose result status is not `"failed"`. The Playwright test in Task 5 reads it.

- [ ] **Step 1: Write failing tests:**
  - `"path before init returns failed 'Worker not initialized'"`: `result.status === "failed"`, `result.error === "Worker not initialized"`, `seq` echoed.
  - `"init then path returns success and increments served"`: `init_ok` with the same seq, then `path_result` with `status === "success"`, and `state.served === 1`.
  - `"init with invalid mesh returns init_error"`: pass `{}` as mesh (cast) and expect `{ type: "init_error", error: "Invalid mesh" }`. The handler validates `Array.isArray(mesh?.polygons) && mesh.polygons.length > 0` before it builds the engine. It also catches any engine-construction throw and returns `init_error` with that message.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement the handler.** Then rewrite `pathfinding.worker.ts` as the entry:
  ```ts
  /// <reference lib="webworker" />
  const state = createWorkerHandlerState();
  (self as unknown as { __pathfindingState: WorkerHandlerState }).__pathfindingState = state;
  self.onmessage = (e: MessageEvent<WorkerInbound>) => {
    self.postMessage(handleWorkerMessage(state, e.data));
  };
  ```
  Export nothing else from this file. If `lib="webworker"` conflicts with DOM types under `tsc --noEmit`, drop the reference and cast `self` to `{ onmessage: ...; postMessage(m: WorkerOutbound): void }` instead.
- [ ] **Step 4:** Run the tests. Expected: PASS. Old imports of `initWorker` / `calculatePath` will break typecheck until Task 3. That's expected, so don't run `typecheck` yet.
- [ ] **Step 5: Commit** `pathfinding: typed worker protocol and message handler`.

### Task 3: Rewrite `PathWorkerManager` on a native module worker with one-time fallback

**Files:**
- Rewrite: `src/simulation/ai/pathfinding/integration/PathWorkerManager.ts`
- Modify: `src/simulation/ai/pathfinding/integration/PathCalculator.ts` (drop the `unwrapWorkerResult` call and the `console.debug` on line 205, add `dispose()`)
- Modify: `src/simulation/ai/pathfinding/integration/PathResultHandler.ts` (remove the `multithreading` / `initWorker` imports, `handleWorkerNotInitialized`, the `"Worker not initialized"` branch in `handleWorkerResult`, and the `console.debug` on line 53. Such a result now goes through `handleFailure`.)
- Test: `tests/simulation/ai/pathfinding/integration/PathWorkerManager.test.ts`

**Interfaces:**
- Consumes: `WorkerInbound`, `WorkerOutbound` (Task 2), `createPathfindingEngine` (Task 1), `NavMeshResource.getSerializedMesh()`.
- Produces:
  ```ts
  export type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "addEventListener">;
  export interface PathWorkerManagerOptions {
    createWorker?: () => WorkerLike | null; // default below; null = no Worker support
    initTimeoutMs?: number;                 // default 5000
  }
  export class PathWorkerManager {
    constructor(navMeshResource: NavMeshResource, options?: PathWorkerManagerOptions);
    get mode(): "worker" | "main-thread";
    ensureInitialized(): Promise<void>;     // starts init if mesh valid; never throws
    runWorker(req: WorkerPathRequest): Promise<{ ok: true; value: WorkerPathResult } | { ok: false; error: unknown }>;
    isValidMesh(): boolean;                 // unchanged behaviour
    dispose(): void;                        // terminate worker, resolve pending via main thread
  }
  ```
  `PathCalculator` gains `dispose(): void { this.workerManager.dispose(); }`. The rest of its public API is unchanged, and the existing `runWorker` monkeypatch seam stays.

**Behaviour to implement:**
- Default `createWorker`: `typeof Worker === "undefined" ? null : new Worker(new URL("../worker/pathfinding.worker.ts", import.meta.url), { type: "module", name: "pathfinding" })`. Keep the `new URL(...)` literal inline in that expression, because Vite only detects that exact shape.
- Create the worker lazily, on the first `ensureInitialized` / `runWorker`. If `createWorker()` returns `null`, use main-thread mode **silently**. If it **throws**, fall back with a warning.
- Before posting each `path` message, if `getSerializedMesh() !== lastInitMesh`, post an `init` first. The worker handles messages in order, so don't wait for `init_ok` before posting the path. Do start the init timeout.
- `pending: Map<seq, { req, resolve }>`, with `seq` a monotonic counter. Don't key on `req.id`, since a robot id can have two requests in flight.
- **Fallback triggers:** worker `error` event, `messageerror` event, an `init_error` response, `createWorker` throwing, or init timeout. `fallback(reason)` does nothing if already in main-thread mode. Otherwise it sets the mode, calls `worker.terminate()`, logs `console.warn("[pathfinding] Worker unavailable; using main-thread pathfinding:", reason)` **once**, then resolves every pending entry with `{ ok: true, value: engine.calculatePath(req) }` on the main thread.
- Main-thread mode: lazily `createPathfindingEngine(getSerializedMesh())`, rebuilt when the mesh identity changes. An engine throw resolves `{ ok: false, error }`.
- Never use `console.error` in this file.

- [ ] **Step 1: Write failing tests** with a `FakeWorker implements WorkerLike`. It records `posted`, stores listeners, and has `emit(type, data)`. A `loopback` variant answers each post with `handleWorkerMessage(state, msg)` on a microtask. Use a real mesh as in Task 1.
  - `"computes path through worker protocol"` (loopback): `runWorker` resolves `ok` with `status === "success"`. `posted[0].type === "init"`, `posted[1].type === "path"`, and `mode === "worker"`.
  - `"uses main thread silently when Worker is undefined"`: `createWorker: () => null`. Expect success, `mode === "main-thread"`, and `console.warn` spy not called.
  - `"falls back once with a single warning on worker error"`: emit `error` after the first post. The first request resolves success via the main thread. Make 3 more requests and all succeed. `warn` called exactly once, `terminate` called once, and nothing posted after the fallback.
  - `"drains in-flight requests to main thread on worker error"`: start 2 requests without awaiting, emit `error`, and both resolve success.
  - `"falls back once on late worker error"`: loopback, one success, then `emit("error")`, then the next request succeeds on the main thread. One warn.
  - `"falls back on init_error response"`: the fake answers init with `init_error`, giving one warn and success via the main thread.
  - `"falls back after init timeout"`: `vi.useFakeTimers()`, a fake that never answers, `initTimeoutMs: 100`, start a request, `vi.advanceTimersByTime(100)`. The request resolves success and warn is called once.
  - `"re-inits when serialized mesh identity changes"`: loopback, request, swap the mesh returned by `getSerializedMesh` to a new object, request again. `posted` has 2 `init` messages.
  - `"dispose terminates the worker without warning"`: loopback, one request, `dispose()`. `terminate` is called once, `console.warn` is not called, and a later `runWorker` resolves success on the main thread with `posted.length` unchanged.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** the manager, then the `PathCalculator` / `PathResultHandler` edits listed above. Keep each file ≤ 300 LOC.
- [ ] **Step 4:** Run `npx vitest run tests/simulation/ai/pathfinding tests/integration` and expect everything to PASS. The old `multithreading` mock in `tests/setup.ts` is now unused but harmless. Then run `npm run typecheck` and expect it clean except for files Task 4 handles, if any.
- [ ] **Step 5: Commit** `pathfinding: native module worker with one-time main-thread fallback`.

### Task 4: Lifecycle wiring and remove `multithreading`

**Files:**
- Modify: `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` (add `dispose(): void` → `this.calculator.dispose()`)
- Modify: `src/runtime/simulation/battleRunner.ts` (add `dispose: () => void` to `interface BattleRunner` at line 52, implemented as `pathfindingSystem.dispose()`)
- Modify: `src/runtime/simulation/useSimulation.ts:55-60` (call `runner.dispose()` in the effect cleanup, so StrictMode double-mount and HMR don't leak workers)
- Modify: `tests/runtime/battleRunner.spec.ts`, `tests/runtime/useSimulation.spec.tsx` (add `dispose` to any fake `BattleRunner` literal so typecheck passes, and add one assertion that unmount calls `dispose`)
- Modify: `package.json` (`npm uninstall multithreading`), `vite.config.ts` (delete the 4 `multithreading` / `worker.js` entries from `optimizeDeps.exclude`, add top-level `worker: { format: "es" }`), `tests/setup.ts` (delete the `vi.mock("multithreading", ...)` block, lines 4-25), `src/simulation/ai/pathfinding/integration/NavMeshResource.ts:75` (reword the comment to say "structuredClone")

- [ ] **Step 1: Write the failing test** in `tests/runtime/useSimulation.spec.tsx`: `"disposes the runner on unmount"`. Spy on or mock `createBattleRunner` to return a runner with `dispose: vi.fn()`, unmount, and expect it called once. Follow the file's existing mocking pattern.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the dispose chain and the dependency removal. `npm uninstall multithreading` works with plain npm (see the repo memory on install flags).
- [ ] **Step 4: Verify:**
  - `grep -rn multithreading src tests vite.config.ts package.json` prints nothing.
  - `npm run format && npm run lint && npm run typecheck && npm run test && npm run check:source-size` is all green.
  - `npm run build 2>&1 | grep -iE "dynamic import|INEFFECTIVE"` prints nothing for the pathfinding modules, and `ls dist/assets | grep -i pathfinding` shows a separate worker chunk.
- [ ] **Step 5: Commit** `pathfinding: dispose worker with runner; drop multithreading dependency`.

### Task 5: Browser proof (dev and preview)

**Files:**
- Create: `playwright/tests/pathfinding-worker.spec.ts`
- Create: `playwright.preview.config.ts` (same as `playwright.config.ts`, but with `webServer.command: "npm run build && npm run preview -- --port 4173 --strictPort"`, `port: 4173`, `use.baseURL: "http://localhost:4173/RobotSpaceBattler/"`, `timeout: 180_000` on webServer)
- Modify: `package.json` (add script `"playwright:preview": "playwright test -c playwright.preview.config.ts pathfinding-worker"`)

**Interfaces:**
- Consumes: `self.__pathfindingState.served` in the worker global (Task 2).

- [ ] **Step 1: Write the spec** `"pathfinding runs in a module worker with no console errors"`:
  - Before `goto`, collect `page.on("console")` messages of type `error` or `warning`, and `page.on("pageerror")`.
  - Wait for the worker with `const worker = await page.waitForEvent("worker", { predicate: w => /pathfinding/i.test(w.url()), timeout: 15_000 })`, then `page.goto("./")`. Set up the wait promise before `goto`.
  - `await expect.poll(() => worker.evaluate(() => (self as any).__pathfindingState?.served ?? 0), { timeout: 20_000 }).toBeGreaterThan(0)`.
  - After the poll, filter the collected messages with `/pathfind|worker|Function ID|loadModules/i` and expect `[]`. That includes the fallback warning: seeing it means the worker failed.
  - If robots don't request paths unless a match is running, look at `obstacle-editor.spec.ts` for how the app reaches a running state, and copy that.
- [ ] **Step 2: Prove the spec catches failure.** Temporarily change the worker URL in `PathWorkerManager`'s default `createWorker` to `"../worker/does-not-exist.worker.ts"` and run `npx playwright test pathfinding-worker`. Expected: FAIL (no worker event, or the fallback warning gets collected). Revert the change and don't commit it.
- [ ] **Step 3:** `npx playwright test pathfinding-worker` (dev server, port 5174) is expected to PASS. Then `npm run playwright:preview` (build plus preview) is also expected to PASS.
- [ ] **Step 4: Commit** `test(e2e): prove pathfinding runs in module worker on dev and preview`.

### Finish

- [ ] Run the full validation line from Global Constraints and paste the output summary into the handoff report.
- [ ] Don't push. Report back with the branch name, the commits, the test results, and a draft PR body. The body must include the CONSTITUTION-CHECK section from `.github/pull_request_template.md` and `Fixes #157`.
