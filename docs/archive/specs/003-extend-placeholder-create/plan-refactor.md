# Refactor Plan: Address Tech Debt in Core Match Runtime

## Objective
Create a staged refactor that resolves the five high-priority tech debt items identified in `docs/tech-debt-refactor-report.md` while preserving the functional and visual requirements captured in feature specs `001`, `002`, and `003`. The outcome should be a modular runtime that cleanly separates layout, simulation orchestration, AI decision making, combat resolution, and rendering.

## Inputs Consolidated from Existing Specs
- **Autobattler simulation requirements (Spec 001)**: deterministic 10v10 spawns, captain election rules, adaptive AI behavior, weapon triangle balance, victory announcement flow, and space-station arena presentation. 【F:specs/001-3d-team-vs/spec.md†L1-L48】
- **Graphics and UI orchestration requirements (Spec 002)**: round-state HUD transitions, quality scaling knobs, camera/spectator modes, and hybrid event + snapshot data delivery. 【F:specs/002-3d-simulation-graphics/spec.md†L1-L58】
- **Integration and replay guarantees (Spec 003)**: renderer/simulation synchronization, MatchTrace schema, deterministic replays, and quality configuration inheritance. 【F:specs/003-extend-placeholder-create/spec.md†L1-L74】

These specs collectively require that any refactor maintain deterministic simulation outputs, configurable graphics, responsive HUD transitions, and match trace fidelity while improving maintainability.

## Refactor Pillars
1. **Application shell modularization (addresses App.tsx debt)**
   - Extract layout primitives (grid, sidebar, HUD container) into presentational components so that `App` coordinates routing/data loading only.
   - Isolate HUD visibility and quality toggle state into a dedicated UI state store (leveraging existing Redux/Zustand-equivalent infrastructure if available) aligned with Spec 002 latency expectations.
   - Move inline styles to themed style modules (CSS modules or styled system) to unlock reuse for multiple screens.

2. **Simulation orchestration boundaries (addresses Simulation.tsx debt)**
   - Introduce a `useMatchRuntime` hook responsible for ECS lifecycle (bootstrap, run loop, pause/resume) and event publication (MatchTrace, quality change notifications) to align with Specs 002/003 hybrid data delivery.
   - Convert `Simulation` component into a thin render orchestrator that subscribes to runtime events, feeds data into scene graph components, and exposes debug controls.
   - Define domain modules (`runtime/worldSetup.ts`, `runtime/stateTransitions.ts`) so that game flow logic becomes testable.

3. **AI behavior modules (addresses aiSystem.ts debt)**
   - Split AI into `targeting`, `behaviorState`, and `pathing` modules. Each module exposes pure functions operating on typed snapshots to satisfy Spec 001 captain election & adaptive strategy requirements.
   - Implement explicit mode/state machine definitions (enums + transition tables) to make behavior switching auditable and replay friendly per Spec 003.
   - Provide dependency injection for RNG and perception windows to ensure deterministic replays.

4. **Combat systems separation (addresses weaponSystem.ts debt)**
   - Move projectile lifecycle into a dedicated module (`projectiles/system.ts`) with optimized collision helpers (`collision/broadPhase.ts`, `collision/narrowPhase.ts`).
   - Encapsulate weapon firing logic inside `weapons/firingController.ts` that reads from robot loadouts defined in Spec 001 data model.
   - Standardize damage resolution and event emission to keep MatchTrace consistent.

5. **Scene graph responsibility split (addresses Robots.tsx debt)**
   - Introduce reusable `RobotMesh` and `RobotAnimator` components to isolate Three.js mesh creation, instancing, and animation timelines.
   - Move animation side effects into render-loop hooks (`useRobotAnimation`) that pull from the simulation snapshot supplied by `useMatchRuntime`.
   - Provide a batched entity subscription (`useRobotsForFrame`) to eliminate interval polling and leverage the main runtime loop.

## Cross-Cutting Concerns
- **Testing & Observability**: Ensure each extracted module exposes deterministic unit-testable APIs. Update Vitest suites to cover AI transitions, projectile collisions, and runtime state changes while preserving the `MatchTrace` schema contracts.
- **Performance Budgets**: Enforce GPU instancing, LOD toggles, and quality scaling hooks defined in Spec 002 during refactor to avoid regressing frame times.
- **Configuration & Replay**: Maintain RNG seed propagation, event ordering, and trace recording per Spec 003 when moving logic between modules.

## Phased Delivery
1. **Phase 1 – App & HUD shell**: Split layout, introduce UI state store, align HUD toggles with Spec 002 requirements.
2. **Phase 2 – Runtime hook extraction**: Carve out `useMatchRuntime` and supporting modules from `Simulation.tsx`; update component tree accordingly.
3. **Phase 3 – AI module refactor**: Separate targeting and behavior state machine, update references, add unit tests for captain reassignment and behavior transitions.
4. **Phase 4 – Combat systems refactor**: Create dedicated weapon/projectile modules, optimize collision loops, validate MatchTrace events.
5. **Phase 5 – Scene graph modularization**: Replace `RobotActor` monolith with mesh + animation primitives and integrate with runtime snapshots.
6. **Phase 6 – Regression hardening**: Expand tests, run performance/visual smoke tests, verify deterministic replays, and document module interfaces for future contributors.

Each phase should land via incremental PRs that keep the game runnable, with feature flags or branch toggles if necessary.
