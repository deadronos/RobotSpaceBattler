# [TASK019] - Split miniplexStore responsibilities into smaller modules

**Status:** Completed  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

## Original Request

Refactor `src/ecs/miniplexStore.ts` to separate concerns: world factory, entity lookup, render-key generation, and pause velocity helpers should be modularized to improve readability and make unit testing simpler.

## Thought Process

- The store is the canonical project state; splitting it into focused modules reduces cognitive load and makes it easier to mock/replace parts in tests. Preserve existing exported API surface via a thin façade to avoid massive ripples.

## Implementation Plan

- Create `worldFactory.ts` to host `world` creation and `resetWorld` behavior. Export a factory function for tests to create isolated worlds.
- Move `entityLookup` (getEntityById, set/remove) into `entityLookup.ts` and ensure lookups are kept in sync with `world` add/remove. Add unit tests.
- Move `getRenderKey` into `renderKey.ts` and add tests for uniqueness and stability across objects.
- Keep a `miniplexStore.ts` façade exporting the same functions but delegating to the new modules. Update imports across codebase to import from the façade.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                         | Status   | Updated    | Notes                                                                           |
| --- | --------------------------------------------------- | -------- | ---------- | ------------------------------------------------------------------------------- |
| 4.1 | Implement `worldFactory.ts` and tests               | Complete | 2025-10-02 | Added `createWorldController` with lifecycle hooks + unit tests                 |
| 4.2 | Extract `entityLookup.ts` with API + tests          | Complete | 2025-10-02 | Lookup manages id generation, listeners, and reset semantics                    |
| 4.3 | Extract `renderKey.ts` and add uniqueness tests     | Complete | 2025-10-02 | Generator returns stable keys; covered with dedicated tests                     |
| 4.4 | Wire façade (`miniplexStore.ts`) and update imports | Complete | 2025-10-02 | Façade delegates to modules, pause velocity helpers moved to `pauseVelocity.ts` |

## Progress Log

### 2025-10-02

- Created `worldFactory.ts` and `entityLookup.ts`, rewired `miniplexStore` to compose them via lifecycle hooks.
- Added `renderKey.ts` and `pauseVelocity.ts`, exposing wrappers from the façade to keep the public API stable.
- Authored new Vitest suites (`tests/entityLookup.test.ts`, `tests/worldFactory.test.ts`, `tests/renderKey.test.ts`, `tests/pauseVelocity.test.ts`) to validate the extracted modules.
