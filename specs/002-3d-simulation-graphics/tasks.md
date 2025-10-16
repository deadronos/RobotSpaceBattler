# Tasks: 3D simulation fight graphics

**Input**: Spec: `spec.md` | Plan: `plan.md` | Research: `research.md` | Data model: `data-model.md` | Contracts: `contracts/`  
**Tests**: TDD-first approach required by spec — tests MUST be authored first and fail.

---

## Phase 1: Setup (Shared Infrastructure)

Purpose: Prepare test helpers, perf harness, and skeleton files so every story can be worked
on independently and via TDD.

- [x] T001 [P] [Setup] Create component directory and exports
  - Create directory `src/components/battle/` and add `index.ts` that re-exports components.
  - File: `src/components/battle/index.ts` (new)
  - Success: `index.ts` exports `BattleUI` and `RobotOverlay` (both may be placeholders initially).

- [x] T002 [P] [Setup] Add Playwright visual-diff helper (SSIM threshold 0.97)
  - Create: `playwright/utils/visualDiff.ts` implementing a helper that:
    - Accepts two PNG buffers and returns SSIM (and a boolean pass/fail using threshold 0.97).
    - Uses existing dev deps (`pngjs`, `pixelmatch`) and documents any new dev-dependency required (e.g., `ssim.js` or `ssim` polyfill) in the task comments.
  - File: `playwright/utils/visualDiff.ts` (new)
  - Test: unit test `tests/unit/visualDiff.test.ts` that compares two tiny fixtures and asserts expected threshold behavior.

- [x] T003 [P] [Setup] Add Playwright E2E skeleton for battle UI (ARIA + visual-diff)
  - Create: `playwright/tests/battle-ui.spec.ts` with an initial failing test that:
    - Navigates to the app scene route used for manual dev testing (e.g., `/` or `/simulate`).
    - Asserts accessibility snapshot via `toMatchAriaSnapshot()` and captures a screenshot to run `visualDiff` helper (expect fail initially).
  - File: `playwright/tests/battle-ui.spec.ts` (new)

- [x] T004 [P] [Setup] Add Playwright perf test skeleton using existing fixture
  - Create: `playwright/tests/battle-perf.spec.ts` that imports `perf` fixture from `playwright/fixtures/perfFixture.ts`, measures a sample round, and stores a perf artifact.
  - File: `playwright/tests/battle-perf.spec.ts` (new)

- [x] T005 [P] [Setup] Add unit test utilities for r3f component mounting
  - Create a small test helper to mount react-three-fiber components in Vitest using `@react-three/test-renderer` and `@testing-library/react`.
  - File: `tests/utils/r3fHelper.ts` (new)
  - Add example usage in `tests/unit/battle-ui.test.tsx` (created in later tasks).

- [x] T006 [P] [Setup] Add test skeletons for unit & integration tests
  - Files (new):
    - `tests/unit/battle-ui.test.tsx` (unit tests for component behavior — failing tests to be written per TDD order)
    - `tests/integration/battle-selectors.test.ts` (integration tests for selector adapters)

**Checkpoint**: All test harnesses and skeletons exist so story work can proceed TDD-first.

---

## Phase 2: Foundational (Blocking prerequisites)

Purpose: Implement core types, selectors and store changes that every user story depends on.
These tasks MUST complete before user story implementation begins.

- [x] T010 [P] [Foundational] Add canonical UI types from `data-model.md`
  - Create `src/types/ui.ts` with TypeScript interfaces: `RoundView`, `RobotView`, `CameraState`, `BattleUiState` (mirror `data-model.md`).
  - File: `src/types/ui.ts` (new)
  - Rationale: Strong typing ensures selectors and components can be validated in tests.

- [x] T011 [P] [Foundational] Add failing unit test for UI store preferences
  - Create a test `tests/unit/ui-store-preferences.test.ts` that imports `createUiStore` (from `src/store/uiStore.ts`) and asserts that the new preference fields exist with safe defaults:
    - `reducedMotion: false`, `minimalUi: false`, `followModeShowsPerRobot: true` (or documented defaults in the test).
  - File: `tests/unit/ui-store-preferences.test.ts` (new)

- [x] T012 [Foundational] Implement preference fields in the UI store (must be sequential)
  - Edit `src/store/uiStore.ts` (existing):
    - Add to the state and actions: `userPreferences: { reducedMotion: boolean; minimalUi: boolean; followModeShowsPerRobot: boolean }` plus actions to set each preference.
    - Ensure getters and `reset` preserve backward compatibility.
  - File: `src/store/uiStore.ts` (modify)
  - Depends on: T011 (test must be added before implementing — TDD).

- [x] T013 [P] [Foundational] Add failing integration tests for selectors
  - Create `tests/integration/battle-selectors.test.ts` that constructs a minimal simulation snapshot and asserts expected `RoundView` and `RobotView` shapes are returned by the selector functions (to be implemented in T014).
  - File: `tests/integration/battle-selectors.test.ts` (new)
- [x] T014 [x] [Foundational] Implement selectors adapter: `getRoundView`, `getRobotView`, `getActiveCamera`, `getBattleUiState`
  - Create `src/selectors/battleSelectors.ts` implementing read-only selectors that transform authoritative snapshots into the UI view models described in `src/types/ui.ts`.
  - File: `src/selectors/battleSelectors.ts` (implemented)
  - Status: Implemented in repository; selectors return safe, allocation-light view models and are exercised by existing integration tests.

- [x] T015 [P] [Foundational] Add failing tests for the UI adapter events
  - Create `tests/unit/uiAdapter.test.ts` that subscribes to `onRoundStart`/`onRoundEnd` and expects the handlers to be invoked when the adapter receives simulated events.
  - File: `tests/unit/uiAdapter.test.ts` (new)

- [x] T016 [x] [Foundational] Implement `src/systems/uiAdapter.ts` (read-only, evented)
  - Implement a minimal adapter that exposes:
    - `getRoundView()`, `getRobotView(id)`, `getBattleUiState()` and event registration: `onRoundStart`, `onRoundEnd`, `onCameraChange`.
  - File: `src/systems/uiAdapter.ts` (implemented)
  - Status: Implemented; exposes `getFrameSnapshot()` and event hooks. Exercised by unit tests.

- [x] T017 [P] [Foundational] Add event→first-visible-frame measurement helper and failing tests
  - Create Playwright helper `playwright/utils/latency.ts` exporting `measureEventToFirstVisible(page, triggerFn)` which:
    - Records `performance.now()` immediately before invoking `triggerFn()` (which performs the event),
    - Waits for the battle UI root (`[data-testid="battle-ui"]`) to be present and visible, then records `performance.now()` inside the page context and returns the delta.
  - Create E2E failing test `playwright/tests/toggle-latency.spec.ts` that uses the helper to assert latency > 0 (failing initially).
  - Add unit-level helper test `tests/unit/latency.test.ts` that exercises the helper using a minimal mount or mocked page.
  - Files: `playwright/utils/latency.ts` (new), `playwright/tests/toggle-latency.spec.ts` (new), `tests/unit/latency.test.ts` (new)
  - Depends on: T003 (Playwright skeleton), T020 (US1 unit test skeleton) to exist so the helper can be exercised.


- [x] T018 [x] [Foundational] Implement per-frame snapshot getter in `uiAdapter`
  - Add `getFrameSnapshot()` to `src/systems/uiAdapter.ts` that returns a minimal, allocation-light object with frame-aligned values (camera transform, interpolation targets, small numeric deltas) intended for per-frame reads.
  - File: `src/systems/uiAdapter.ts` (implemented)
  - Status: Implemented; the adapter provides a reusable snapshot object to minimize allocations.

**Checkpoint**: Foundation done; selectors + store + adapters are testable and consumed by story components.

---

## Phase 3: User Story 1 - Enter match and watch a round (Priority: P1) 🎯 MVP

Goal: Display battle UI during an active round and hide/minimize non-round UI; implement per-robot overlay for followed robot and hotkey toggle behavior. This is the MVP — deliver as the first independently testable increment.

Independent Test Criteria (TDD):

- Unit: `BattleUI` renders nothing / hidden when not in a round; renders main battle HUD when `inRound === true`.
- Integration: Starting and ending a round toggles `activeUI` appropriately and components reflect store state.
- E2E: When loading a scene and starting a round, ARIA snapshot and visual-diff (SSIM >= 0.97) must show the battle UI; when the round ends the summary UI appears.

### Tests (write first)

- [x] T020 [US1] Failing unit test: `tests/unit/battle-ui.test.tsx`
  - Mount `src/components/battle/BattleUI.tsx` with test utilities and assert:
    - When `inRound=false`, `data-testid='battle-ui'` is not present.
    - When store emits `inRound=true`, `data-testid='battle-ui'` becomes present.

- [x] T021 [US1] Failing integration test: `tests/integration/battle-ui-integration.test.ts`
  - Simulate a round start and end by updating the adapter/store and assert the visible UI switches between `battle` and `summary` states.

- [x] T022 [US1] Failing Playwright E2E test: `playwright/tests/battle-ui.spec.ts`
  - Navigates to scene; triggers round start; captures ARIA snapshot via `toMatchAriaSnapshot()` and screenshot for `visualDiff` (expect failure initially).

### Implementation

- [x] T023 [US1] Implement presentational component: `src/components/battle/BattleUI.tsx`
  - Read from `src/hooks/useBattleHudData.ts` (T025) and render main HUD; include `data-testid='battle-ui'` on the root element; follow r3f best-practices (pure renderer, minimal hooks in render loop).
  - File: `src/components/battle/BattleUI.tsx` (new)
  - Depends on: T020 (unit test), T025 (hook)

- [x] T024 [P] [US1] Implement per-robot overlay: `src/components/battle/RobotOverlay.tsx`
  - Reads `RobotView` from hook and renders health, status icons and team info. Only visible when follow-camera is active or when robot explicitly selected.
  - File: `src/components/battle/RobotOverlay.tsx` (new)
  - Can be implemented in parallel with T023 (different files) but requires the hook from T025 to be usable.

- [x] T025 [US1] Implement hook `src/hooks/useBattleHudData.ts`
  - Return view models required by `BattleUI` and `RobotOverlay` by calling `src/selectors/battleSelectors.ts`.
  - File: `src/hooks/useBattleHudData.ts` (new)
  - Depends on: T014 (selectors)

- [x] T026 [US1] Integrate hotkey toggle and route the toggle through `src/store/uiStore.ts`
  - Update or use existing `hooks/useUiShortcuts.ts` to add a configurable hotkey that toggles battle UI visibility by calling `uiStore.setHudVisible()` or an equivalent.
  - Add failing unit test `tests/unit/ui-hotkey.test.ts` before implementation.
  - Files: `tests/unit/ui-hotkey.test.ts` (new), modifications: `src/hooks/useUiShortcuts.ts` (existing)

- [x] T027 [US1] Add styling and small layout CSS in `src/styles/hud.css` (extend existing styles)
  - Add classnames used by `BattleUI` and `RobotOverlay` and ensure styles degrade safely under reduced-motion.
  - File: `src/styles/hud.css` (modify)

- [x] T028 [US1] Add Playwright perf check using `playwright/fixtures/perfFixture.ts`
  - Create `playwright/tests/battle-perf.spec.ts` that starts a representative round and measures FPS distribution via the perf fixture; assert that either 60 fps is achieved on QA hardware or that the performance manager produces fallback behavior (>=30 fps) when stressed.
  - File: `playwright/tests/battle-perf.spec.ts` (new)

- [x] T029 [US1] Accessibility: Add ARIA annotations to all Battle UI elements and ensure `toMatchAriaSnapshot()` passes in E2E tests (once implemented).
  - Files to modify: `src/components/battle/BattleUI.tsx`, `src/components/battle/RobotOverlay.tsx` (these are implementation files above).

**Checkpoint**: US1 should be fully implementable and testable independently.

---

## Phase 4: User Story 2 - Spectator / camera modes (Priority: P2)

Goal: Support follow and cinematic camera modes and adapt the battle UI accordingly (per-robot overlay visible only while following, minimal UI for cinematic).

Independent Test Criteria:

- Unit: `RobotOverlay` visible only when camera `mode === 'follow'` or robot selected.
- E2E: Switching camera modes updates ARIA snapshot and reduces UI clutter in cinematic mode.

- [x] T030 [US2] Failing unit test: `tests/unit/robot-overlay-follow.test.tsx`
  - Mount `RobotOverlay` and assert visibility toggles with a simulated `CameraState` change.

- [x] T031 [US2] Failing Playwright test: `playwright/tests/camera-mode.spec.ts`
  - Switch camera modes during a running round, assert the battle UI adapts (e.g., per-robot overlay only when following, reduced UI in cinematic mode), and capture ARIA snapshots.

- [x] T032 [US2] Implement camera-aware hook/adapter: extend `src/hooks/useBattleHudData.ts` to accept camera state or create `src/hooks/useFollowCameraOverlay.ts`
  - File: `src/hooks/useFollowCameraOverlay.ts` (new) or modify `useBattleHudData.ts` (existing change).
  - Depends on: T014 (selectors), T010 (types)

- [x] T033 [P] [US2] Implement simplified cinematic HUD: `src/components/battle/CinematicHud.tsx`
  - Renders high-level match stats only (team scores, timer). Should be toggled when `camera.mode === 'cinematic'`.
  - File: `src/components/battle/CinematicHud.tsx` (new)

- [x] T034 [US2] Integration test: `tests/integration/camera-mode-integration.test.ts`
  - Assert that switching camera mode programmatically updates component visibility and that the application remains responsive.

- [ ] T035 [US2] Hook existing camera controls
  - Integrate with `src/hooks/useCameraControls.ts` (existing) to trigger the UI updates. Add a small adapter if necessary in `src/systems/uiAdapter.ts`.

**Checkpoint**: US2 behavior validated by unit + E2E tests.

---

## Phase 5: User Story 3 - Accessibility & reduced-motion (Priority: P3)

Goal: Respect reduced-motion and provide simplified visuals while preserving textual UI; toggles must be runtime-changeable and persist across rounds.

Independent Test Criteria:

- Unit: Toggling `reducedMotion` disables animations in `BattleUI` components.
- E2E: Playwright captures reduced-motion snapshot confirming absence of motion-induced effects.

- [ ] T040 [US3] Failing unit test: `tests/unit/reduced-motion.test.tsx`
  - Mount `BattleUI` with `reducedMotion` preference on and assert that CSS animation classes are not applied and any camera shake or particle intensity hooks are disabled.

- [ ] T041 [US3] Implement `reducedMotion` support in `BattleUI` and relevant effects
  - Modify `src/components/battle/BattleUI.tsx` and any animations to check `uiStore.getState().userPreferences.reducedMotion`.
  - Add a helper utility `src/utils/reducedMotion.ts` if needed.

- [ ] T042 [US3] Failing Playwright test: `playwright/tests/reduced-motion.spec.ts`
  - Toggle the preference in the UI (or via store) and check accessibility snapshot + that animations are suppressed.

- [ ] T043 [US3] Integration test: persistence across rounds
  - `tests/integration/reduced-motion-persistence.test.ts` verifies preference persists and applies across round transitions.

**Checkpoint**: Reduced-motion and accessibility flows are fully tested and documented.

---

## Phase 6: Polish & Cross-Cutting Concerns

Purpose: Final integration, documentation, CI updates, and performance tuning.

- [ ] T050 [Polish] Add triage artifact collection for failing visual diffs
  - Add a Playwright helper that on visual-diff failures bundles the failing frame(s), ARIA snapshot, and a short WebM video into `test-artifacts/battle-ui/` for easier triage.
  - File(s): `playwright/utils/collectTriageArtifacts.ts` (new) and CI step documentation in `.github/workflows/*` (edit)

- [ ] T051 [Polish] Add CI job step to run Playwright SSIM checks with threshold 0.97 and upload artifacts on failure
  - Update Playwright pipeline in `.github/workflows/playwright.yml` (or add a new workflow) to run the `playwright/tests/*` tests and fail the job only for triage-required failures.

- [ ] T052 [Polish] Update `specs/002-3d-simulation-graphics/quickstart.md` with exact commands and thresholds
  - Document local reproduction steps for ARIA + SSIM checks and perf harness commands.

- [ ] T053 [Polish] Add `CONSTITUTION-CHECK` documentation in PR template for reviewers
  - Ensure the PR checklist includes items for TDD evidence, file size checks, and r3f best practices.

- [ ] T054 [Polish] Add edge-case tests and fixes (render-context loss, reconnect flows)
  - Tests: `tests/integration/render-context-recovery.test.ts` (new) that simulates WebGL context loss and verifies UI recovers and reflects current round state.

- [ ] T055 [Polish] Final code cleanup, linters and formatting
  - Run `npm run lint` and `npm run format` and ensure no linter warnings for modified files. Fix any found issues.
  - Progress: Cleared historical lint violations in `App.tsx`, `HudRoot.tsx`, `VictoryScreen.tsx`, `useUiShortcuts.ts`, `main.tsx`, and `uiStore.ts` so the battle UI suite now passes formatting and ESLint without suppressions.

**Final Checkpoint**: All user stories implemented & test suites passing locally. CI executes Playwright checks and artifacts are produced on failures.

---

## Dependencies & Execution Order

- Setup (Phase 1) tasks: T001..T006 — can start immediately and in parallel.
- Foundational (Phase 2) tasks: T010..T016 — BLOCK all user stories until complete.
- User Stories (Phase 3+): US1 (T020..T029), US2 (T030..T035), US3 (T040..T043) — can start after Foundational completes.
  - MVP recommendation: Complete US1 first (P1) then US2 then US3.
- Polish (Final Phase): T050..T055 — depends on at least one user story implemented; ideally run after all three user stories for final verification.

Dependency graph (high-level):

Phase1 (T001..T006) → Phase2 (T010..T016) ─┬─> US1 (T020..T029)
├─> US2 (T030..T035)
└─> US3 (T040..T043)

After USx complete → Polish (T050..T055)

Parallel opportunities identified:

- Setup tasks T001, T002, T003, T004, T005, T006 are fully parallel (different files).
- Foundational tests and type additions (T010, T011, T013, T015) are parallelizable; implementing store or selectors (T012, T014, T016) are sequential edits to existing files and should be done after their corresponding tests fail.
- Within US1: T023 (BattleUI.tsx) and T024 (RobotOverlay.tsx) are parallel ([P]) because they create different files; T025 (hook) should be completed early since both UI files depend on it.
- UI styling (T027) and hotkey integration (T026) should be done after the component files exist; mark them sequential as they may modify the same files.

Task counts summary:

- Total tasks: 41
- Setup: 6
- Foundational: 9
- User Story 1 (P1): 10
- User Story 2 (P2): 6
- User Story 3 (P3): 4
- Polish & Cross-cutting: 6

Suggested MVP scope (minimum to demo):

1. Complete Phase 1 (Setup)
2. Complete Foundational tasks T010..T016
3. Implement US1 (T020..T029)
4. Validate US1 independently and deploy a demo.

Parallel execution example for US1 (developer team of 3):

- Developer A: T023 (BattleUI implementation) + T029 (Accessibility)
- Developer B: T024 (RobotOverlay) + T027 (Hotkey integration tests)
- Developer C: T025 (Hook & selectors stabilization) + T028 (Performance test integration)

---

If you want I can:

- Create the initial failing test files for T020/T021/T022 (TDD skeleton) now.
- Or create the component skeletons (T023/T024/T025) to unblock rapid iteration.
