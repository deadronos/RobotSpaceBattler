# Tasks: 3D Team vs Team Autobattler — Spec UI & Flow

**Input**: `/specs/001-3d-team-vs/plan.md`, data-model.md, contracts/, quickstart.md  
**Scope**: Deliver FR-006 – FR-023 player experience (victory flow, stats, overlays, performance feedback) using TDD and constitutional constraints.

## Execution Flow
```
1. Load plan.md → extract Gate ordering, file paths, FR mappings
2. Verify prerequisite scaffolding exists (`src/main.tsx`, `src/App.tsx`, Canvas mount)
3. Generate tasks gate-by-gate (tests → data/hooks → HUD → overlays → integration → styling → E2E)
4. Ensure every task references a single file/folder and includes FR linkage
5. Output checklist with dependencies, parallel lanes, and validation criteria
```

## Format
- `[ID] [P?] Description`
- `[P]` indicates parallel-safe tasks (no shared files/dependencies once gate unlocked)
- Each description names the exact file(s) and cites key FRs
- Default status `[ ]` (unchecked) — update manually during execution

## Path Conventions
- Source: `src/`
- Tests: `tests/`
- Playwright: `playwright/tests/`
- Styles: `src/styles/`

---

## Gate 0: UI Flow Tests (4 tasks)
*Goal: establish failing tests before implementation (Constitution Principle II — Test-First).*

- [ ] T001 Create Vitest integration suite `tests/integration/ui/victory-overlay.test.ts` asserting victory overlay countdown, winner label, Stats button, Settings button, manual restart, and auto-reset after 5s. Targets FR-006 + FR-014. Use Testing Library + msw mocks for store actions.
- [ ] T002 Create Vitest integration suite `tests/integration/ui/stats-modal.test.ts` validating Stats modal renders team aggregates, robot rows (kills, damage dealt/taken, time alive), captain indicators, and sorting controls. Covers FR-019 + FR-020.
- [ ] T003 Create Vitest integration suite `tests/integration/ui/performance-banner.test.ts` verifying quality-scaling banner appears when `performanceStats.qualityScalingActive` flips true, displays FPS and scaling state, supports dismiss + auto-hide, and hides when FPS recovers. Covers FR-021 – FR-023.
- [ ] T004 Create unit tests `tests/unit/store/uiStore.test.ts` & `tests/unit/selectors/uiSelectors.test.ts` covering Zustand actions (open/close stats/settings, toggle HUD, set countdown) and selector outputs (team counts, captain info, countdown formatting). Ensures deterministic data layer before UI renders.

## Gate 1: Data & Hooks (4 tasks)
*Goal: build deterministic data plumbing consumed by HUD and overlays.*

- [ ] T005 Implement `src/store/uiStore.ts` (≤200 LOC) defining Zustand slices for HUD visibility, modal state, countdown overrides, performance banner flags, and persisted team composition draft. Include action creators and selectors exported for tests (FR-006, FR-014, FR-021).
- [ ] T006 Implement `src/selectors/uiSelectors.ts` (≤220 LOC) mapping Miniplex queries to typed view models (team tallies, captain badge info, weapon distribution, performance KPIs). Memoize selectors; expose helpers used across hooks and tests (FR-019, FR-020, FR-021).
- [ ] T007 Implement `src/hooks/useBattleHudData.ts` to combine ECS selectors + uiStore state into a HUD DTO (status text, team summaries, control states). Use `useSyncExternalStore` or Zustand hook to subscribe for React correctness. Supports FR-006, FR-013.
- [ ] T008 Implement `src/hooks/usePostBattleStats.ts` aggregating per-robot and per-team metrics from `SimulationState` snapshots, sorting by kills → damage, formatting durations, and exposing summary totals for Stats modal (FR-019).

## Gate 2: HUD Composition (4 tasks)
*Goal: render persistent HUD surfaces once data hooks exist.*

- [ ] T009 Implement `src/components/hud/HudRoot.tsx` (≤180 LOC) that positions HUD via CSS grid, renders match title/status, composes `TeamStatusPanel`, `BattleTimer`, and `ControlStrip`, and exposes an overlay toggle region. Include `role="banner"` and `aria-live="polite"` for status text (FR-006).
- [ ] T010 Implement `src/components/hud/TeamStatusPanel.tsx` for each team, showing alive/eliminated counts, captain marker, weapon distribution chips, and team color accent. Read data from `useBattleHudData`. Covers FR-001, FR-020.
- [ ] T011 Implement `src/components/hud/BattleTimer.tsx` showing elapsed battle time and, when victory pending, the countdown overlay badge. Provide semantic labels for screen readers. Supports FR-006, FR-014.
- [ ] T012 Implement `src/components/hud/ControlStrip.tsx` with buttons for Pause/Resume, Cinematic toggle, HUD toggle, and Settings. Dispatch uiStore actions, respect keyboard focus outlines, and disable controls when overlays/modal already active. Covers FR-006, FR-013.

## Gate 3: Overlays & Modals (4 tasks)
*Goal: deliver pop-up experiences triggered by battle outcomes & performance state.*

- [ ] T013 Implement `src/components/overlays/VictoryOverlay.tsx` (≤200 LOC) showing winner, countdown timer, Stats & Settings buttons, manual restart control, and team summary chips. Connect to uiStore + `useVictoryCountdown`. Fulfill FR-006 + FR-014.
- [ ] T014 Implement `src/components/overlays/StatsModal.tsx` with focus trap, keyboard navigation, table sorting, and responsive layout. Consume `usePostBattleStats`, display per-robot rows, team totals, and captain highlight. Satisfies FR-019 + FR-020.
- [ ] T015 Implement `src/components/overlays/SettingsDrawer.tsx` sliding drawer that exposes team composition controls (weapon sliders/toggles), apply/cancel, and resets. Persist values through uiStore for next battle spawn. Aligns with FR-006.
- [ ] T016 Implement `src/components/overlays/PerformanceBanner.tsx` to show FPS, quality-scaling state, auto-hide progress, and dismiss button. Support `aria-live` announcements and user toggle. Covers FR-021 – FR-023.

## Gate 4: Interaction & Integration (4 tasks)
*Goal: wire runtime events and input handling into the UI.*

- [ ] T017 Implement `src/hooks/useVictoryCountdown.ts` handling `SimulationState.status` transitions, starting/stopping the 5s countdown, dispatching auto-restart, and exposing `remainingSeconds`. Integrate with `victorySystem` reset pathway (FR-006, FR-014).
- [ ] T018 Implement `src/hooks/useUiShortcuts.ts` binding keyboard/gamepad events (Space pause, C cinematic, O HUD, Esc close modals) with cleanup, optional touch handling for mobile, and testable command mapping. Supports FR-013, FR-006.
- [ ] T019 Implement `src/systems/uiBridgeSystem.ts` (≤200 LOC Miniplex system) syncing ECS state to uiStore: update team counts, performance metrics, and Stats snapshots when battles end. Keep rendering components pure per Constitution Principle IV. Covers FR-006, FR-019, FR-021.
- [ ] T020 Update `src/App.tsx` to mount `HudRoot`, overlays, providers, and hook initializers (`useBattleHudData`, `useUiShortcuts`, `useVictoryCountdown`). Update `/specs/001-3d-team-vs/quickstart.md` to document new controls and overlays. Ensure no direct ECS mutations from components.

## Gate 5: Styling & Accessibility (1 task)
*Goal: unify look & feel, ensure responsive + accessible presentation.*

- [ ] T021 Create `src/styles/hud.css` and `src/styles/overlays.css` defining layout, typography, color tokens, focus states, prefers-reduced-motion handling, and mobile breakpoints. Wire styles into `App.tsx`. Verify contrast ratios meet WCAG AA.

## Gate 6: End-to-End Validation (1 task)
*Goal: prove the complete player flow via browser automation.*

- [ ] T022 Author Playwright spec `playwright/tests/ui-flow.spec.ts` covering: battle completion triggers Victory overlay → open Stats modal and verify captain/metrics → open Settings, tweak composition, apply → wait for restart and confirm HUD resets. Run in headed + CI modes. Covers FR-006, FR-019, FR-014.

---

## Dependencies
```
T001-T004 → T005-T008 → T009-T012 → T013-T016 → T017-T020 → T021 → T022
```
- Gate 2 tasks require hooks from Gate 1 to compile.
- Gate 3 tasks require Stats hook (T008) and HUD data (T007).
- Gate 4 tasks depend on overlays/HUD markup.
- Styling (T021) needs markup finalized; Playwright (T022) runs last.

## Parallel Execution Tips
- After T008, split HUD tasks: T009 & T010 can progress in parallel while T011 & T012 start once shared utilities ready.
- After T016, hooks T017/T018 may proceed concurrently before merging into T019/T020.
- CSS work (T021) can overlap with late integration as long as markup solidified and snapshot tests updated.

## Validation Checklist
- [ ] Gate 0 tests authored and intentionally failing before implementation.
- [ ] uiStore + selectors achieve 100% branch coverage via T004.
- [ ] All HUD/overlay components under 300 LOC, memoized appropriately.
- [ ] Victory countdown verified across T001, T017, T022.
- [ ] Stats modal presents per-robot metrics and captain badges (FR-019/FR-020).
- [ ] Performance banner toggles based on quality scaling (FR-021 – FR-023).
- [ ] Settings drawer persists weapon composition choices into next match (FR-006).
- [ ] Playwright `ui-flow.spec.ts` passes against production build (`npm run build && npm run preview`).

---

**Total Tasks**: 22  
**Status**: ☐ Not started — follow gate order, keep CONSTITUTION-CHECK updated.
