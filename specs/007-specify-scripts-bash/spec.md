# Feature Specification: NavMesh Pathfinding System

**Feature Branch**: `007-navmesh-pathfinding`  
**Created**: 2025-12-10  
**Status**: Draft  
**Input**: User description: "Implement Navigation Mesh (NavMesh) pathfinding system with convex polygon decomposition, A* search across polygons, and string pulling for smooth paths"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Intelligent Robot Navigation Around Complex Obstacles (Priority: P1)

As a match observer, I want robots to navigate smoothly around walls, pillars, and obstacles to reach their targets, so that battles appear tactically intelligent and robots don't get stuck in corners or against barriers.

**Why this priority**: This is the core value proposition - robots that can actually navigate the arena intelligently are essential for believable combat. Without this, robots cluster at walls and fail to reach enemies, breaking the simulation experience.

**Independent Test**: Place a robot and target on opposite sides of a wall cluster. Observe the robot successfully navigate around obstacles along a natural path rather than getting stuck or taking inefficient routes.

**Acceptance Scenarios**:

1. **Given** a robot and target separated by multiple walls, **When** the robot attempts to reach the target, **Then** the robot navigates around obstacles via the shortest valid path
2. **Given** a robot encounters a corridor intersection, **When** choosing between multiple routes, **Then** the robot selects the path with the lowest total distance to target
3. **Given** a robot is moving toward a target, **When** the path becomes blocked by a new obstacle, **Then** the robot recalculates and follows an alternate route within 2 seconds
4. **Given** multiple robots navigating the same corridor, **When** paths intersect, **Then** robots navigate without colliding or creating permanent deadlocks

---

### User Story 2 - Smooth Natural Movement Paths (Priority: P2)

As a match observer, I want robots to follow smooth, natural-looking paths rather than zigzag grid patterns, so that movement appears fluid and realistic during combat.

**Why this priority**: While functional pathfinding is P1, path quality significantly impacts visual polish and perceived AI quality. This enhances the viewing experience without blocking core functionality.

**Independent Test**: Observe a robot navigating across the arena. Verify paths curve smoothly around obstacles with minimal sharp turns, resembling how a human player might navigate.

**Acceptance Scenarios**:

1. **Given** a robot navigating around a pillar, **When** the path is calculated, **Then** the robot follows a smooth arc rather than rectangular grid movements
2. **Given** a long-distance path across multiple open areas, **When** the robot moves, **Then** the path consists of natural waypoints with minimal direction changes
3. **Given** a robot approaching a narrow corridor entrance at an angle, **When** navigating, **Then** the robot adjusts smoothly without stopping or sharp turns

---

### User Story 3 - Efficient Pathfinding Performance (Priority: P3)

As a system administrator, I want pathfinding to operate efficiently with minimal computational overhead, so that 20 robots can calculate paths simultaneously without frame rate drops or simulation lag.

**Why this priority**: Performance is essential for scalability but doesn't block initial functionality testing. Can be validated with smaller robot counts initially.

**Independent Test**: Run a match with 20 robots (10v10) calculating paths simultaneously. Verify simulation maintains target frame rate with path calculations consuming less than 10% of frame budget.

**Acceptance Scenarios**:

1. **Given** 20 active robots all requiring pathfinding, **When** paths are calculated simultaneously, **Then** pathfinding completes within 16ms total (60fps budget)
2. **Given** a robot needs to recalculate a path mid-navigation, **When** recalculation occurs, **Then** the operation completes without visible stuttering or frame drops
3. **Given** the arena contains dynamic obstacles, **When** obstacles move or spawn, **Then** path recalculation for affected robots completes within 100ms

---

### Edge Cases

- What happens when a robot's target moves behind an obstacle during navigation? (System should detect path invalidation and recalculate)
- How does the system handle narrow passages that require single-file movement? (Robots should queue and wait turn rather than cluster)
- What happens when no valid path exists to the target? (Robot should move to nearest accessible point with line-of-sight to target)
- How does the system handle robots spawning in corners or tight spaces? (Initial path should include local maneuvering to exit tight spaces)
- What happens when dynamic obstacles block all paths to a target? (Robot should adopt fallback behavior like returning to spawn or defensive positioning)
- What happens if path recalculation exceeds the 100ms threshold? (Robot continues using stale path, marks behavior as degraded, retries recalculation on next event)

## Clarifications

### Session 2025-12-10

- Q: How should the pathfinding system detect when a path needs recalculation? → A: Reactive (event-driven) - Recalculate only when obstacle movement/spawn events occur
- Q: How should the 5MB memory budget be allocated across pathfinding data structures? → A: Dynamic allocation based on arena complexity, but total ≤5MB
- Q: How should pathfinding coordinate with conflicting AI behaviors? → A: Concurrent execution - All behaviors run simultaneously, final movement is weighted blend
- Q: What should happen if path recalculation exceeds 100ms threshold? → A: Fallback to stale path, continue using old path, mark as degraded behavior
- Q: What clearance radius should be used for path generation given robot collision radius of 0.891m? → A: 0.95m

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate navigation paths for robots that avoid static arena geometry (walls, pillars, central obstacles)
- **FR-002**: System MUST find the shortest valid path between any two walkable locations in the arena
- **FR-003**: System MUST generate smooth, curved paths around obstacles rather than grid-based right-angle movements
- **FR-004**: System MUST recalculate paths reactively when obstacle movement/spawn events occur or target location changes (event-driven invalidation, not continuous polling)
- **FR-005**: System MUST support simultaneous path calculations for up to 20 robots without exceeding performance budgets
- **FR-006**: System MUST handle scenarios where no direct path exists by selecting the nearest accessible location
- **FR-007**: System MUST prevent robots from attempting to path through solid obstacles or out of arena bounds (using 0.95m clearance radius for path validation)
- **FR-008**: Pathfinding data MUST be memory efficient, consuming less than 5MB of runtime memory (allocated dynamically based on arena complexity across mesh, paths, and cache)
- **FR-009**: System MUST integrate with existing robot AI behaviors (targeting, combat, retreat) using concurrent execution where all behaviors contribute to final movement as a weighted blend
- **FR-010**: System MUST detect and resolve situations where multiple robots compete for the same narrow passage

### Key Entities *(include if feature involves data)*

- **Navigation Mesh**: Represents walkable space in the arena as a collection of connected regions, each defining a traversable area
- **Navigation Path**: An ordered sequence of positions guiding a robot from current location to target destination
- **Path Node**: A point along a navigation path representing either a waypoint or connection between walkable regions
- **Walkable Region**: A continuous area where robots can freely move, bounded by obstacles or arena edges
- **Obstacle Geometry**: Static arena features (walls, pillars) that define boundaries of walkable space

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of path calculations from any valid start point to any valid end point complete within 5 milliseconds
- **SC-002**: Robots successfully reach their targets in 90% of navigation scenarios without manual intervention or getting permanently stuck
- **SC-003**: Path quality metrics show less than 10% path length overhead compared to theoretical optimal distance
- **SC-004**: In 10v10 matches, pathfinding operations consume less than 15% of total frame time
  during peak simultaneous calculations (Target: PathfindingSystem.execute() <2.4ms per frame,
  cumulative with other systems <16ms/frame at 60fps)
- **SC-005**: Memory usage for pathfinding data structures remains under 5MB regardless of arena complexity
- **SC-006**: Robots navigate around common obstacle patterns (corners, corridors, pillar clusters) with zero permanent deadlock scenarios in 100 test runs
- **SC-007**: Path recalculation in response to dynamic obstacles completes within 100ms, maintaining fluid robot movement
- **SC-008**: Visual observation shows smooth, natural-looking robot movement with curves around obstacles rather than sharp grid-based turns in 95% of paths

## Assumptions *(document reasonable defaults)*

- Arena geometry is known at match start and remains static (walls, pillars, bounds)
- Robots have a standard collision radius of 0.891m; navigation mesh uses 0.95m clearance radius for path generation (includes safety margin)
- Dynamic obstacles (moving barriers, hazards) will trigger path recalculation but are not part of the base navigation mesh
- Target frame rate is 60fps, allocating approximately 16ms per frame budget
- Path calculations may be distributed across multiple frames if needed, with stale paths remaining valid for up to 500ms
- String pulling and path smoothing will optimize paths post-calculation without requiring perfect geometric accuracy
- Robots will use local steering and avoidance for sub-meter precision near obstacles
- The arena is approximately 100x100m with 10-15 major structural elements (wall groups, pillar clusters, central obstacles)
- Standard web browser execution environment without access to dedicated pathfinding hardware or GPU compute

## Constraints *(document limitations)*

- Pathfinding must operate in real-time within browser JavaScript execution environment
- Cannot use native code or WebAssembly for initial implementation (may be optimization path later)
- Must integrate with existing ECS architecture and robot AI systems
- Path data must be deterministic for replay and testing purposes
- Cannot rely on server-side pathfinding or cloud computation
- Must handle arena changes (dynamic obstacles) without full mesh regeneration
