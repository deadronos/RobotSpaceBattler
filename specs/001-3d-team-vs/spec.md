# Feature Specification: 3D Team vs Team Autobattler Game Simulation

**Feature Branch**: `001-3d-team-vs`  
**Created**: 2025-10-06  
**Status**: Draft  

## Requirements


### Functional Requirements


- **FR-001**: System MUST spawn exactly 10 red team robots and 10 blue
  team robots at simulation start in designated starting zones.

> Note: FR-015 (previously listed under "Performance & Scale") was
> consolidated into FR-001. FR-001 is the authoritative requirement for
> the 10 vs 10 spawn configuration. References elsewhere have been
> removed to avoid duplication.

- **FR-002**: System MUST provide autonomous AI control for all robots with multi-layered
  behavior: (a) individual tactical AI (cover-seeking, peek-and-shoot, retreat when low
  health); (b) team captain system with auto-assignment and reassignment on captain
  death — captain election MUST be deterministic and follow the algorithm defined in the
  project data model (see "Captain Election Decision" below). At spawn and whenever
  reassignment is required, elect the active robot with the highest current health as
  captain. If multiple robots share the same highest health, apply deterministic
  tie-breakers in the following order: (1) robot with more `stats.kills`; (2) robot with the
  smallest euclidean distance to the team's spawn center; (3) lexicographically smallest
  robot `id` to guarantee a stable, reproducible selection. Re-election MUST occur
  immediately when the current captain is eliminated. If no active robots remain the
  team's `captainId` MUST be null. (c) captain-level coordination for formation
  maintenance and priority target selection; (d) adaptive strategy switching based on
  health and team advantage conditions.

- **FR-003**: System MUST support three weapon types with
  rock-paper-scissors balance: Laser beats Gun, Gun beats Rocket, Rocket
  beats Laser. Each weapon type MUST have distinct visual and behavior
  characteristics.

- **FR-004**: System MUST detect weapon hits on robots and apply damage
  calculations to determine robot elimination.

- **FR-005**: System MUST remove eliminated robots from the active
  simulation and battlefield.

- **FR-006**: System MUST determine and display the winning team when one
  team has eliminated all opponents. The system shall show a victory
  screen with a 5-second auto-restart countdown, a "Stats" button for
  detailed battle statistics, pause/reset controls, and settings access
  for team composition changes.

- **FR-007**: System MUST render the arena as a space-station environment
  with proper directional and ambient lighting.

- **FR-008**: System MUST render real-time dynamic shadows for robots,
  projectiles, and arena geometry.

- **FR-009**: System MUST render humanoid robot meshes for all 20 robots
  with team color differentiation (red vs blue).

- **FR-010**: System MUST maintain interactive frame rates (target 60 fps
  on modern Chromium browsers).

- **FR-011**: System MUST use an ECS architecture with Miniplex for game
  logic, queries, and system updates.

- **FR-012**: System MUST handle physics interactions (robot movement,
  projectile trajectories, collisions) using a physics engine.

- **FR-013**: System MUST provide a hybrid camera system with: (a) free
  camera controls for zoom, pan, and rotate via mouse, keyboard, and
  touch gestures (including pinch-zoom); (b) toggleable cinematic mode
  that automatically follows action highlights.

- **FR-014**: System MUST initialize and reset the simulation state for
  replay or restart scenarios, supporting both automatic restart after
  the victory countdown and manual restart/team reconfiguration from the
  victory screen.

- **FR-015**: System MUST include a minimal app scaffold before running tests that mount the application. The scaffold MUST contain the following files (small, single-purpose implementations):
  - `src/main.tsx` — application entry that mounts React to `#root` and imports `App`.
  - `src/App.tsx` — root React component that renders the main `Scene` and exposes basic UI placeholders like a `#status` element and pause control.
  - `src/index.css` — minimal global CSS (ensures `#root` and canvas fill the viewport).
  - `src/components/Scene.tsx` and `src/components/Simulation.tsx` — lightweight placeholders that render a `Canvas` and a simple simulation mount so tests can find a `canvas` element.
  - `src/ecs/world.ts` — minimal `world` export or stub to satisfy imports for early iteration.
  - `src/robots/RobotFactory.tsx` or `src/components/RobotPlaceholder.tsx` — tiny procedural robot placeholder.

  Acceptance criteria:
  - Dev server (`npm run dev`) must start and a Playwright smoke test can connect and detect a `canvas` element and `#status` text.
  - These files are intentionally minimal; they do not need full game logic but must allow tests and CI to import/run the app without missing-import runtime errors.


### Performance & Scale


- **FR-016**: System MUST handle multiple active projectiles (lasers,
  bullets, rockets) without significant frame rate degradation.

- **FR-017**: System MUST render shadows and lighting effects without
  dropping below 30 fps on the target platform (Chrome 120+, Edge 120+).

- **FR-018**: System MUST support touch input for camera controls on
  mobile/tablet devices, including pinch-to-zoom gestures.

- **FR-019**: System MUST track and display post-battle statistics
  including per-robot kills, damage dealt, damage taken, time survived,
  and team-level aggregate metrics accessible via the victory screen
  "Stats" button.

- **FR-020**: System MUST visually distinguish team captains from regular
  robots (e.g., visual indicator, different material/glow) and display
  captain reassignment when the current captain is eliminated.

- **FR-021**: System MUST implement toggleable automatic quality scaling
  that reduces shadow quality, particle effects, and draw distance when
  frame rate drops below 30 fps.

- **FR-022**: System MUST reduce simulation time scale (slow down game
  speed) proportionally when performance degradation occurs to maintain
  smooth rendering.

- **FR-023**: System MUST display a non-intrusive warning overlay when
  performance degradation is detected or quality scaling is active.


### Key Entities


- **Robot**: Autonomous humanoid combatant with team affiliation
  (red/blue), health/damage state, position, orientation, weapon type, AI
  state (individual: targeting, movement, cover-seeking, retreat; captain:
  formation coordination, priority target designation), captain role flag.

- **Weapon**: Offensive capability with type (laser/gun/rocket), damage
  value, fire rate, projectile behavior, visual effect.

- **Projectile**: Active weapon discharge with trajectory, velocity,
  collision detection, damage on impact, visual representation.

- **Arena**: Space-station battlefield environment with spawn zones,
  boundaries, obstacles, lighting configuration, camera anchor points.

- **Team**: Group of robots (red or blue) with team-level state (active
  count, eliminated count, victory condition).

- **Simulation State**: Overall game state including running/paused/
  completed status, winner determination, frame time, entity registry.
  victory countdown and manual restart/team reconfiguration from the
  victory screen.


### Captain Election Decision


To avoid ambiguity in tests and implementation, the captain election algorithm is a
project-level decision and is REQUIRED to be implemented exactly as specified above.
Rationale: choosing the highest-health robot promotes early survival of the captain
role; deterministic tie-breakers ensure reproducible simulation runs and deterministic
contract/integration tests. This decision is referenced by contract tests and by the
spawn and captain AI systems (e.g., `src/ecs/systems/spawnSystem.ts` and
`src/ecs/systems/ai/captainAI.ts`).

## Implementation Constraints

- **Target Browser Baseline**: Chrome 120+, Edge 120+ (modern Chromium-based browsers with WebGL 2.0 support).

- **Required Build Steps**: None for baseline compatibility; consider
  performance profiling and optimization for lower-end hardware.

- **File/Module Sizing**: Core game systems (ECS queries, AI, physics
  integration, rendering components) SHOULD be decomposed into modules ≤ 300
  LOC. Larger systems MUST be split into dedicated hooks, components, and
  utility modules.

- **ECS Architecture**: High-level game logic MUST use and reuse Miniplex
  ECS queries following best practices documented at
  <https://github.com/hmans/miniplex>.


### Mandatory scaffolding (bootstrapping entrypoints)


To enable UI-driven contract and integration tests, the implementation MUST include a minimal app scaffold before running tests that mount the application. The scaffold MUST contain the following files (small, single-purpose implementations):

- `src/main.tsx` — application entry that mounts React to `#root` and imports `App`.
- `src/App.tsx` — root React component that renders the main `Scene` and exposes basic UI placeholders like a `#status` element and pause control.
- `src/index.css` — minimal global CSS (ensures `#root` and canvas fill the viewport).
- `src/components/Scene.tsx` and `src/components/Simulation.tsx` — lightweight placeholders that render a `Canvas` and a simple simulation mount so tests can find a `canvas` element.
- `src/ecs/world.ts` — minimal `world` export or stub to satisfy imports for early iteration.
- `src/robots/RobotFactory.tsx` or `src/components/RobotPlaceholder.tsx` — tiny procedural robot placeholder.

Acceptance criteria:
- Dev server (`npm run dev`) must start and a Playwright smoke test can connect and detect a `canvas` element and `#status` text.
- These files are intentionally minimal; they do not need full game logic but must allow tests and CI to import/run the app without missing-import runtime errors.

## Review & Acceptance Checklist


### Content Quality


- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed


### Requirement Completeness


- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (none found)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
