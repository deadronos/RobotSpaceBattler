# TASK009 - Simulation FX system scaffold

**Status:** Completed  
**Added:** 2025-09-17  
**Updated:** 2025-09-17

## Original Request

Implement a lightweight FX / visual-effects system in `src/components/Simulation.tsx` where a TODO placeholder currently exists. The FX system should be non-blocking, driven by events produced by existing systems (hits, explosions), and easy to extend with particle/flash primitives.

## Thought Process

Visual feedback is important for clarity during simulation and tests. The project already emits damage/impact events through systems; wiring a thin FX system that subscribes to those events and spawns transient visuals (sprite flashes, simple particles) will improve UX without coupling to game logic. Keep the implementation small and testable: an event consumer that enqueues short-lived scene objects.

## Implementation Plan

- Add `src/systems/FxSystem.ts` (or a small module under `src/components/`) that accepts an event queue for impact/damage and produces render-only ECS entries or React state updates.
- Wire the FX system into the Simulation frame loop where TODO exists.
- Provide two simple FX primitives: "hitFlash" (screen-space flash at world position) and "impactParticles" (few ephemeral sprites). Keep visuals optional behind a `uiStore` flag `showFx`.
- Add a small smoke test to `playwright/tests/smoke.spec.ts` or a unit test that asserts FX events enqueue objects (rendered not required in unit tests).

## Acceptance Criteria

- FX system exists as a small, documented module and is invoked from the Simulation loop.
- FX are triggered by damage/impact events and cleaned up after their lifespan.
- FX are toggleable via `uiStore` or a config flag.
- A minimal test verifies the FX event plumbing (not full render verification).

## Notes

- Keep performance in mind: FX should not block the main simulation or mutate authoritative physics state.
- Prefer reusing existing event channels used by weapon/damage systems.

## Outcome

- Implemented a minimal, event-driven FX system:
  - New `src/ecs/fx.ts` defines `FxComponent` and allowed types.
  - New `src/systems/FxSystem.ts` consumes `impact` and `death` events to spawn transient FX entities with TTL, and cleans them up over time.
  - New `src/components/FXLayer.tsx` renders simple geometry per FX type with fade-out.
  - `src/ecs/miniplexStore.ts` entity type extended to include optional `fx`.
  - `src/store/uiStore.ts` adds `showFx` flag with toggle; default true.
  - `src/components/Simulation.tsx` wires `fxSystem` after scoring/respawn and renders `<FXLayer />` when `showFx` is enabled.
- Testing:
  - Added `tests/fx-system.test.ts` validating FX spawn from events and TTL cleanup.
- All unit tests pass locally; build succeeded.

## Status

- Completed on 2025-09-17.
