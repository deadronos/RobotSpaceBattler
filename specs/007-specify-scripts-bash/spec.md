# Feature Specification: NavMesh Pathfinding (Library)

**Feature Branch**: `007-specify-scripts-bash`  
**Created**: 2025-12-10  
**Status**: Implemented and integrated into runtime (module + tests + BehaviorBlender integration); follow-ups: telemetry, debug UI toggles, and partial mesh invalidation  
**Input**: User description: "Implement Navigation Mesh (NavMesh) pathfinding
system with convex polygon decomposition, A* search across polygons, and string
pulling for smooth paths"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compute Paths Over NavMesh (Priority: P1)

As an AI/navigation consumer, I want to compute a navigation path across a
NavMesh between a start position and a requested target, so that higher-level
systems can steer robots around static obstacles.

**Why this priority**: This is the base capability for path-guided navigation.
It is a prerequisite for wiring NavMesh planning into the live robot movement
loop.

**Independent Test**: Generate a NavMesh for an arena containing walls/pillars,
then request a path around the geometry and verify the returned waypoint list is
non-empty and ends at (or near) the requested target.

**Acceptance Scenarios**:

1. **Given** a NavMesh and a start/target separated by obstacles, **When** a path
  is requested, **Then** the system returns a `NavigationPath` with waypoints
  that route around the obstacles.
2. **Given** an unreachable target, **When** `enableNearestFallback` is enabled,
  **Then** the system returns a path to the nearest accessible point to the
  target when possible.
3. **Given** `requestedTarget = null`, **When** `calculatePath(...)` is called,
  **Then** the call is a no-op and does not change component state.

---

### User Story 2 - Optional Path Smoothing (Priority: P2)

As an AI/navigation consumer, I want optional path smoothing so that paths have
fewer redundant waypoints and look more natural when followed.

**Why this priority**: Path quality affects visual polish and downstream steering
stability.

**Independent Test**: Request an unsmoothed path that contains redundant
waypoints, then request the same path with smoothing enabled and verify waypoint
count reduces while still reaching the same destination.

**Acceptance Scenarios**:

1. **Given** smoothing is enabled, **When** a path is calculated, **Then** the
  returned `NavigationPath.smoothed` flag is set and waypoint count is reduced
  when possible.
2. **Given** smoothing is disabled, **When** a path is calculated, **Then** the
  raw waypoint output from search is preserved.

---

### User Story 3 - Bounded Work Per Tick (Priority: P3)

As a system integrator, I want path calculation work to be bounded per tick so
that the pathfinding module can be called without blowing the simulation frame
budget.

**Why this priority**: Performance is essential for scalability but doesn't
block initial functionality testing. It can be validated with smaller workloads
initially.

**Independent Test**: Call `execute(...)` with many pending path requests and
verify it stops processing once the configured `frameBudget` is exceeded.

**Acceptance Scenarios**:

1. **Given** many pending path requests, **When** `execute(...)` runs, **Then**
  it processes requests until it hits `frameBudget` and defers the remainder.
2. **Given** repeated recalculation requests for a single robot, **When**
  `robotId` is provided, **Then** recalculation is throttled according to
  `throttleInterval`.

---

### Edge Cases

- What happens when no valid path exists to the target?
  - With nearest fallback enabled, the system should attempt a path to the
    nearest accessible point.
  - If no fallback path exists, the component status becomes `failed`.
- What happens when `calculatePath(...)` is called too frequently?
  - If `robotId` is provided, throttling may cause the call to return early
    without updating the component.
- What happens when the NavMesh needs to change?
  - The integration system does not rebuild internal search state on mesh
    updates. Consumers should treat meshes as immutable and recreate the system
    for a new mesh.

## Clarifications

### Session 2025-12-10

- Q: How does the module limit worst-case per-tick work? → A: `execute(...)`
  enforces a configurable `frameBudget` and stops early when exceeded.
- Q: How does the module avoid recalculating too often per robot? → A: When a
  `robotId` is provided, `calculatePath(...)` enforces a configurable
  `throttleInterval` using wall-clock time.
- Q: What clearance radius is used by default? → A: `0.95`.
- Q: Are dynamic obstacle invalidation events supported? → A: Not currently.
  Dynamic obstacle handling remains in the reactive steering layer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST generate a `NavigationMesh` from an
  `ArenaConfiguration`.
- **FR-002**: The system MUST compute a `NavigationPath` between a start point
  and a requested target, using the NavMesh.
- **FR-003**: The system MUST support optional path smoothing.
- **FR-004**: The system MUST support optional caching of computed paths.
- **FR-005**: The system MUST provide a bounded-work execution method
  (`execute(...)`) that stops processing when it exceeds its `frameBudget`.
- **FR-006**: The system MUST support per-robot throttling when a `robotId` is
  provided.
- **FR-007**: When no path exists to the requested target, the system MUST
  attempt a nearest-accessible-point fallback when enabled.
- **FR-008**: The system MUST provide callback telemetry for path calculation
  start/complete/failure.

### Key Entities *(include if feature involves data)*

- **Navigation Mesh**: Represents walkable space in the arena as a collection of
  connected regions, each defining a traversable area
- **Navigation Path**: An ordered sequence of positions guiding a robot from
  current location to target destination
- **Path Node**: A point along a navigation path representing either a waypoint
  or connection between walkable regions
- **Walkable Region**: A continuous area where robots can freely move, bounded
  by obstacles or arena edges
- **Obstacle Geometry**: Static arena features (walls, pillars) that define
  boundaries of walkable space

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of `calculatePath(...)` calls complete within 5ms under unit
  test workloads.
- **SC-002**: For unreachable targets, nearest-accessible fallback succeeds
  (returns a non-null path) when a reachable nearest point exists.
- **SC-003**: When smoothing is enabled, waypoint count is reduced in typical
  obstacle layouts.
- **SC-004**: `execute(...)` respects its `frameBudget` by stopping early when
  exceeded.

## Assumptions *(document reasonable defaults)*

- Arena geometry is provided up-front as an `ArenaConfiguration`.
- Default `clearanceRadius` is `0.95`.
- Paths are computed in the XZ plane (2D), then converted back to 3D waypoints.
- Caching uses position quantization (grid size `0.5`) to maximize reuse.
- The module uses wall-clock time (`Date.now()`) for throttling and telemetry.

## Constraints *(document limitations)*

- `PathfindingSystem` does not modify robot positions; it only produces waypoints.
- Dynamic obstacle invalidation and partial mesh updates are not implemented.
- If the mesh must change, recreate `PathfindingSystem` for the new mesh.
