# Feature Specification: 3D simulation fight graphics

**Feature Branch**: `002-3d-simulation-graphics`
**Created**: 2025-10-13
**Status**: Draft
**Input**: User description: "Implement actual 3D simulation fight graphics; switch or hide UI
between rounds and show a battle UI during rounds."

## Clarifications

### Session 2025-10-13

- Q: Baseline for performance acceptance environment (CI headless vs QA lab reference vs
  synthetic baseline) →
  A: QA lab reference machine; CI verifies quality-scaling behavior.
- Q: Visual regression test approach (pixel diffs vs structural snapshots vs tolerant diffs) →
  A: Structural/ARIA snapshot primary; tolerant visual-diff (SSIM ≥ 0.97) for layout regressions.
- Q: QA lab reference machine specification? →
  A: Single modern desktop: 8-core CPU (Intel i7 or AMD Ryzen 7), 16 GB RAM,
  GeForce RTX 3060-class GPU, Chrome Stable with hardware acceleration, 1920×1080
  resolution.
- Q: Minimal UI behavior for follow-camera? →
  A: Minimal UI shows match-level stats; per-robot overlay appears only while
  follow-camera is active or when a robot is explicitly selected. Overlay includes
  health, status icons, and team affiliation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter match and watch a round (Priority: P1)

As a player, I join or start a match and watch an ongoing round in the arena.

**Why this priority**: This is the primary user experience: watching simulation combat with
clear visual cues and a focused in-round UI.

**Independent Test**: Load the scene, start a round, and verify that the battle UI
appears while the round is running and HUD overlays are hidden or minimized as
specified.

**Acceptance Scenarios**:

1. **Given** the game is in lobby or post-round state, **When** a round starts, **Then** the
	 standard (menu/summary) UI is hidden and the battle UI (in-round HUD) is displayed.
2. **Given** the game is mid-round, **When** the round ends, **Then** the battle UI hides and the round-summary UI appears.
3. **Given** the player toggles UI visibility, **When** they press the configured hotkey,
	 **Then** the battle UI toggles on/off without breaking simulation.
4. **Given** performance drops below the threshold during a round, **When** quality-scaling
	 triggers, **Then** visual fidelity reduces (level-of-detail / particle adjustments)
	 while UI remains responsive and visible.

---

### User Story 2 - Spectator / camera modes (Priority: P2)

As a spectator or player switching camera modes, I can follow individual robots or use a
cinematic overview while the battle UI adapts accordingly.

**Why this priority**: Provides different viewing experiences while preserving in-round
information.

**Independent Test**: Switch camera modes during a running round and verify the battle
UI adapts (for example, show targeted robot details when following a robot).

**Acceptance Scenarios**:

1. **Given** follow-camera mode, **When** the player follows a robot,
   **Then** the minimal UI continues to show match-level stats and a per-robot overlay
   displays the followed robot's health, status icons, and team affiliation.
2. **Given** cinematic overview, **When** toggled, **Then** the battle UI reduces clutter, presenting only high-level match stats.

---

### User Story 3 - Accessibility and reduced-motion (Priority: P3)

As a player with motion sensitivity or accessibility needs, I can enable reduced-motion
or simplified visuals while keeping battle information accessible.

**Why this priority**: Accessibility is required for broad user inclusion and is lower
implementation cost relative to core visuals.

**Independent Test**: Enable reduced-motion preference and validate that camera shakes,
rapid animations, and particle intensity are reduced while textual UI remains
unchanged.

**Acceptance Scenarios**:

1. **Given** user sets prefers-reduced-motion, **When** a round starts, **Then** animations
	 are simplified and no motion-induced effects occur.

---

### Edge Cases

- What happens when a round restarts mid-transition (UI hide/show)? Ensure transitions are idempotent and not stacked.
- If the rendering context is lost (e.g., device sleep), ensure UI state recovers and the
	battle UI returns when rendering resumes.
- If a player disconnects and reconnects during a round, ensure the battle UI reflects the
	current round state and does not reveal hidden match internals.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST show a distinct in-round "battle UI" during active rounds and hide or minimize non-essential UI elements used outside rounds.
- **FR-002**: The system MUST allow toggling between full UI and minimal/spectator UI during rounds via a configurable input (hotkey/controller mapping).
- **FR-003**: The system MUST display per-robot key data in the battle UI for the
  followed robot (health, status icons, team affiliation). When minimal UI is active,
  per-robot details MUST be visible only while follow-camera mode is active or when a
  robot is explicitly selected.
- **FR-004**: The system MUST support at least two camera modes during a round (follow and cinematic) with the UI adapting to the selected mode.
- **FR-005**: The system MUST gracefully handle UI transitions between states (lobby → round start → round end) without causing simulation pauses or loss of game state.
- **FR-006**: The system MUST expose accessibility settings (reduced motion, simplified visuals) that affect in-round rendering but preserve textual UI elements.
- **FR-007**: The system MUST provide performance-scaled visual fidelity (LOD, particle reduction) controlled by the existing performance manager so the battle UI remains responsive.
- **FR-008**: The system MUST be testable via automated tests (unit/integration) that can mount the scene in headless contexts and assert UI visibility and state transitions.


### Non-Functional Requirements

- **NFR-001**: Visual performance during rounds MUST target 60 fps when measured on the
  project's QA lab reference machine (see Clarifications Session 2025-10-13). The system
  MUST maintain a fallback target of at least 30 fps via the performance manager's
  quality-scaling when under resource constraints; CI will verify scaling behavior rather
  than assert raw baseline FPS.
- **NFR-002**: UI transitions must complete within 250ms to maintain perceived responsiveness.
- **NFR-003**: Reduced-motion mode MUST disable camera shakes and particle bursts (where applicable) and be togglable at runtime.


## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of test runs for round transitions (start/end) pass automated structural (ARIA)
  snapshot checks and tolerant visual-diff checks (SSIM ≥ 0.97) without requiring manual review; no
  more than 5% of runs are flagged for human triage.
- **SC-002**: On the QA lab reference machine (defined in Clarifications Session
  2025-10-13), average frame time during representative rounds is <=16ms (60 fps) in
  80% of recorded runs. When below threshold, automated CI tests must verify the
  performance manager's quality-scaling compensates to maintain ≥30 fps.
- **SC-003**: Player toggles UI visibility via hotkey with action latency under 100ms in 95% of trials.
- **SC-004**: Accessibility reduced-motion toggles take effect within one frame of change and persist across rounds.

### Qualitative Outcomes

- **SC-005**: Players report that the battle UI improves situational awareness during rounds (measured via user testing or internal QA rating on a 1-5 scale, median >=4).


## Key Entities *(include if feature involves data)*

- **Round**: Represents an active match round. Fields: id, status (initializing, running, ending, finished), startTime, endTime, metadata (map, rules).
- **Robot**: Existing entity; battle UI reads robot: id, team, currentHealth, statusFlags, currentTarget, isCaptain.
- **CameraState**: mode (follow|cinematic|free), targetEntityId (optional), interpolation settings.
- **UIState**: inRound (bool), activeUI (battle|lobby|summary), userPreferences
	(reducedMotion, minimalUi, followModeShowsPerRobot), lastToggleTime.


## Assumptions

- The project uses the existing ECS, a performance manager, and a client-side rendering
	pipeline already present in the codebase.
- The battle UI will be delivered as small, focused modules that follow the project's
	constitution constraints (file size, test-first approach, separation of concerns).
- State required by the battle UI can be exposed from simulation systems via a thin
	adapter or selector layer so rendering remains decoupled from authoritative logic.
- Device-specific rendering features will target modern Chromium browsers and fall
	back gracefully on older platforms.


## Implementation Notes (for planners)

- The battle UI should be decoupled from simulation: rendering must consume authoritative
	state exposed by simulation systems rather than drive simulation behavior.
- UI modules should be small and focused to keep reviewability and testability high. Avoid
	placing heavy computations in the render loop; prefer pre-computed selectors or an
	adapter layer that surfaces read-only state for the UI.
- Reuse the existing performance management system to adjust visual fidelity (LOD,
	particle density, shadow/detail levels) during heavy scenes rather than adding
	separate ad-hoc mechanisms.
- Expose runtime preferences (UI visibility, reduced-motion, minimal UI) in a single UI
	state area so tests can assert behavior deterministically.

 - Implementation note: Use Playwright's accessibility snapshot utilities (toMatchAriaSnapshot)
	 as the primary regression check. Add a tolerant visual-diff stage that computes SSIM for
	 Playwright screenshots with a threshold of 0.97; failures produce a triage artifact bundle
	 (video + failing frames + aria snapshot) for human review.


## Traceability

- FR-001 → SC-001
- FR-002 → SC-003
- FR-003 → SC-005
- FR-004 → SC-002
- FR-005 → SC-001
- FR-006 → SC-004
- FR-007 → SC-002
- FR-008 → SC-001


## Next steps

1. Author failing tests (Gate 0) that assert UI visibility during round start/end and
	 that the UI adapts to camera-mode changes. Tests should be written first and fail.
2. Implement the battle UI modules to satisfy the functional requirements. Keep
	 modules small and testable.
3. Ensure simulation systems expose read-only state for the UI via selectors or an
	 adapter so rendering remains decoupled from authoritative logic.
4. Add end-to-end Playwright scenarios that verify round transitions visually (video or
	 screenshot diffs) and validate accessibility and reduced-motion behaviors.
5. Define and document a QA lab reference machine (hardware + browser configuration) and
   add CI tests that verify quality-scaling behavior; CI should avoid asserting raw
   baseline FPS as an absolute gate.


---

## Spec metadata

- Spec file: `specs/002-3d-simulation-graphics/spec.md`
- Generated: 2025-10-13
- Branch (suggested): `002-3d-simulation-graphics`
- Status: Draft



