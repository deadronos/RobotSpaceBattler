# Phase 0: Research & Technical Decisions

**Feature**: 3D Team vs Team Autobattler Game Simulation  
**Date**: 2025-10-06  
**Status**: Complete

## Research Summary

All technical decisions for this feature have been resolved through specification clarification and architecture planning. No unknowns remain from the Technical Context.

## Key Technical Decisions

### Decision 1: Physics Architecture - Rapier3D Authoritative

**Chosen**: @react-three/rapier with Rapier3D as authoritative physics engine

**Rationale**:
- Deterministic physics required for consistent AI behavior and damage calculations
- Rapier3D provides high-performance WASM-based rigid body dynamics
- @react-three/rapier provides React integration with minimal boilerplate
- Authoritative physics ensures ECS world state always reflects true collision/position data
- Supports 20+ dynamic bodies (robots + projectiles) with acceptable performance

**Alternatives Considered**:
- **cannon-es**: Older, less performant, JavaScript-based (not WASM)
- **Ammo.js (Bullet)**: More complex API, larger bundle size, overkill for this scale
- **Custom physics**: Would violate "library-first" constitutional principle, high maintenance

**Implementation Notes**:
- Physics state is source of truth; ECS entities sync FROM physics, not TO
- usePhysicsSync hook will read Rapier transforms and update ECS entity positions
- Collision events trigger damage calculations in ECS systems
- Fixed timestep (60Hz physics, interpolated rendering)

---

### Decision 2: ECS Architecture - Miniplex Queries

**Chosen**: Miniplex for entity-component-system management

**Rationale**:
- Lightweight ECS library optimized for React integration
- Query-based system fits well with React hooks pattern
- Excellent TypeScript support with type-safe queries
- Small bundle size (~5KB) compared to alternatives
- Active maintenance and r3f community adoption

**Alternatives Considered**:
- **bitECS**: More performant but lower-level API, steeper learning curve
- **ecsy**: Unmaintained (archived), larger footprint
- **Custom ECS**: Reinventing wheel, violates constitution

**Implementation Notes**:
- World initialized in App.tsx, passed via React context
- Queries for robots by team: `world.with("team", "health", "position")`
- Queries for active projectiles: `world.with("projectile", "velocity", "damage")`
- Captain queries: `world.with("team", "isCaptain")`
- System functions consume queries and update entities each frame

---

### Decision 3: State Management - Zustand for UI State

**Chosen**: Zustand for UI-only state (victory screen, settings, camera mode toggle)

**Rationale**:
- Lightweight (1KB), minimal boilerplate
- No Provider hell - simple hook-based API
- Separation of concerns: Miniplex handles game state, Zustand handles UI state
- Avoids coupling UI to ECS world for non-game data

**Alternatives Considered**:
- **Redux Toolkit**: Overkill for simple UI state, larger bundle
- **React Context**: Works but Zustand provides better devtools and performance
- **Storing in ECS**: Wrong abstraction - UI state isn't game simulation data

**Implementation Notes**:
- Store includes: camera mode (free/cinematic), quality settings, stats panel visibility
- No game simulation state in Zustand (robots, weapons, health all in Miniplex)
- UI components read Zustand, render based on ECS queries

---

### Decision 4: Rendering Strategy - Separation from Simulation

**Chosen**: r3f components as pure renderers, ECS systems handle logic

**Rationale**:
- Constitutional requirement: rendering separated from simulation/physics
- Enables headless testing of game logic without WebGL context
- useFrame limited to visual updates (interpolation, camera movement)
- All game state changes happen in ECS systems, components just display

**Alternatives Considered**:
- **Logic in useFrame**: Violates constitution, makes testing harder
- **Logic in component state**: Breaks single source of truth, hard to serialize

**Implementation Notes**:
- Robot.tsx component: reads `entity.position`, `entity.health` → renders mesh + health bar
- Systems run outside React: spawn, AI, damage, victory detection
- Custom hook `useECSQuery` to subscribe components to entity changes
- useFrame only for: camera interpolation, particle systems, visual effects

---

### Decision 5: Asset Strategy - Procedural Meshes (MVP)

**Chosen**: Procedural geometry generation with THREE.js primitives, @react-three/gltfjsx for future

**Rationale**:
- MVP requirement: get simulation running quickly without 3D modeling bottleneck
- THREE.js BoxGeometry, CylinderGeometry sufficient for recognizable robots/weapons
- Team colors via material assignment (red/blue MeshStandardMaterial)
- Allows focus on gameplay mechanics first, visual polish later

**Alternatives Considered**:
- **Blender models first**: Blocks development, introduces asset pipeline complexity
- **Asset store models**: Licensing concerns, may not fit art style
- **glTF-Transform**: Useful later but premature optimization for MVP

**Implementation Notes**:
- meshGenerators.ts: functions for `createRobotMesh()`, `createWeaponMesh()`, `createProjectileMesh()`
- Mark procedural meshes as DEPRECATED in code comments when ready for artist-created assets
- @react-three/gltfjsx already in dependencies for smooth transition
- Suspense boundaries around mesh loading for future asset swaps

---

### Decision 6: Camera System - Hybrid Free + Cinematic

**Chosen**: Three separate hooks for camera control (free, touch, cinematic)

**Rationale**:
- Constitutional file size limit: single camera system would exceed 300 LOC
- Separation of concerns: mouse/keyboard, touch, cinematic are independent behaviors
- Enables toggling cinematic mode on/off at runtime
- Each hook can be tested independently

**Alternatives Considered**:
- **Single camera controller**: Would violate 300 LOC limit (~400 LOC estimated)
- **drei OrbitControls**: Doesn't support cinematic auto-follow mode
- **drei CameraControls**: Missing touch gesture support

**Implementation Notes**:
- useCameraControls: mouse drag (pan), scroll (zoom), keyboard arrows (rotate)
- useTouchControls: single-finger drag (pan), pinch (zoom), two-finger rotate
- useCinematicMode: auto-follow closest combat, smooth transitions, user-pausable
- Camera.tsx component orchestrates which hooks are active based on Zustand state

---

### Decision 7: Performance Management - Multi-Pronged Approach

**Chosen**: Quality scaling + time dilation + performance monitoring

**Rationale**:
- Constitutional requirement: 60 fps target, 30 fps minimum
- Quality scaling reduces visual fidelity to maintain frame rate
- Time dilation slows simulation when scaling not enough (keeps animations smooth)
- Performance monitoring provides user feedback and enables user override

**Alternatives Considered**:
- **Quality scaling only**: Insufficient for low-end hardware, simulation becomes choppy
- **Time dilation only**: Visual quality remains high but gameplay slows (less desirable)
- **Hard frame cap**: Causes stuttering, poor UX

**Implementation Notes**:
- performanceManager.ts monitors `performance.now()` delta times
- If FPS < 30 for >1 second: trigger quality scaling (shadows OFF, particles reduced)
- If still < 25 FPS: apply time scale 0.75x (slow-motion effect)
- PerformanceWarning.tsx overlay shows "Performance Mode Active" non-intrusively
- User can disable auto-scaling in settings (toggleable via Zustand)

---

### Decision 8: AI Architecture - Three-Layer System

**Chosen**: Individual AI + Captain AI + Adaptive Strategy (separate modules)

**Rationale**:
- Constitutional file size limit: monolithic AI would far exceed 300 LOC
- Separation enables independent testing of each behavior layer
- Individual AI (cover-seeking, retreat) ~200 LOC
- Captain AI (formation, target priority) ~180 LOC  
- Adaptive strategy (health/advantage-based switching) ~150 LOC

**Alternatives Considered**:
- **Single AI system**: Would violate 300 LOC limit (~500+ LOC estimated)
- **Behavior trees**: Overkill for this scope, adds library dependency
- **State machines**: Considered but layered approach simpler for this design

**Implementation Notes**:
- individualAI.ts: handles cover-seeking, peek-shoot, retreat-when-low-health
- captainAI.ts: elected per-team, coordinates formation, calls priority targets
- adaptiveStrategy.ts: switches individual/captain tactics based on team health advantage
- aiSystem.ts orchestrates: runs individual AI, then captain AI, then adaptive adjustments
- Captain election: highest health robot with most kills (re-elected on captain death)

---

### Decision 9: Weapon Balance - Rock-Paper-Scissors Damage Multipliers

**Chosen**: Base damage + multiplier system (1.5x for advantage, 0.67x for disadvantage)

**Rationale**:
- Clarified requirement: Laser beats Gun, Gun beats Rocket, Rocket beats Laser
- Multiplier approach keeps damage calculations simple and testable
- Base damage ensures no weapon is useless (0.67x still does damage)
- 1.5x multiplier provides clear tactical advantage without being overpowered

**Alternatives Considered**:
- **Hard counters (instant kill)**: Too punishing, reduces tactical depth
- **Equal damage**: Ignores spec requirement for rock-paper-scissors balance
- **Complex formulas**: Unnecessary for MVP, harder to balance

**Implementation Notes**:
- damageCalculator.ts: `calculateDamage(weaponType, targetWeapon, baseDamage)`
- Laser vs Gun: 1.5x multiplier (bonus)
- Laser vs Rocket: 0.67x multiplier (penalty)
- Same weapon type: 1.0x multiplier (neutral)
- Contract test validates all 9 weapon matchup scenarios

---

### Decision 10: Test Strategy - TDD with Vitest

**Chosen**: Vitest for unit/integration tests, Playwright for E2E (manual)

**Rationale**:
- Vitest is Vite-native, fast, excellent TypeScript support
- Compatible with existing project setup (vite.config.ts already present)
- Supports jsdom for React component testing
- Playwright for E2E but manual execution (not CI-blocking per spec)

**Alternatives Considered**:
- **Jest**: Slower with Vite, requires additional config
- **Cypress**: Heavier than Playwright, less TypeScript-friendly
- **No E2E**: Playwright already in project, useful for validation

**Implementation Notes**:
- Contract tests validate spec requirements (FR-001, FR-003, etc.)
- Integration tests validate system interactions (AI + physics, camera + input)
- Unit tests validate pure functions (damage calculator, quality scaler)
- Playwright e2e-simulation.spec.ts: manual validation of full battle flow
- All tests written BEFORE implementation (TDD gate enforced)

---

## Unknowns Resolved

All items from Technical Context marked "NEEDS CLARIFICATION" have been resolved:

✅ **Language/Version**: TypeScript 5.x, React 19+  
✅ **Primary Dependencies**: All specified (r3f, Rapier, Miniplex, Zustand, etc.)  
✅ **Storage**: In-memory ECS + localStorage for settings  
✅ **Testing**: Vitest + Playwright  
✅ **Target Platform**: Chrome 120+, Edge 120+  
✅ **Performance Goals**: 60 fps target, 30 fps minimum  
✅ **Constraints**: 300 LOC, rendering/simulation separation, TDD  
✅ **Scale**: 20 robots, 3 weapon types, hybrid camera, multi-layered AI

**Status**: ✅ All research complete, ready for Phase 1 (Design & Contracts)
