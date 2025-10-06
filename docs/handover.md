# Handover: 3D Team vs Team Autobattler — Analysis & Next Steps

Date: 2025-10-06

This document contains the cross-artifact analysis performed for the feature in
`specs/001-3d-team-vs` and recommended next steps for a clean handover to
implementation. It summarizes findings from `spec.md`, `plan.md`, `tasks.md`, and
the project constitution (`.specify/memory/constitution.md`).

---

## Analysis summary

I ran the project's prerequisite checker, loaded the feature artifacts, and
performed a non-destructive cross-artifact analysis to identify inconsistencies,
duplications, ambiguities, and underspecified items. The goal is to ensure the
feature spec, plan, and tasks are aligned and constitution-compliant before
implementation starts.

### Key findings (high level)

- Most functional requirements (FR-001..FR-023) are mapped to tasks and tests
  in `tasks.md`.
- The TDD ordering and constitution gates are present and respected in
  `tasks.md` and `plan.md`.
- A few functional gaps and underspecified items remain and should be
  resolved before implementation (notably stats aggregation and weapon numbers).

---

## Specification Analysis Report

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| D1 | Duplication | MEDIUM | `spec.md` FR-001 / FR-015 | FR-001 requires exactly 10v10 spawn; FR-015 restates "support 10 vs 10". Redundant requirement text. | Consolidate FR-015 into FR-001 (keep one authoritative + cross-ref). |
| U1 | Underspecification | HIGH | `tasks.md` T009 (tests/contracts/weapon-balance.test.ts) vs `spec.md` FR-003 | The contract/test in T009 asserts concrete base damage values (Laser 15, Gun 20, Rocket 30) and numeric multipliers. Those numeric values are not present in `spec.md` (FR-003 only specifies RPS ordering). Tests introduced concrete numbers not present in the spec. | Canonicalize numeric damage values in spec or move them into `contracts/scoring-contract.md`. Update tasks to reference the contract source rather than invent values in tests. |
| A1 | Ambiguity / Assumption | MEDIUM | `tasks.md` T025 (captainAI.ts) vs `spec.md` FR-002 | Tasks specify captain election strategy ("elect highest health robot") while `spec.md` only requires auto-assignment/reassignment on death (no election algorithm). | Add election algorithm (or mark as decision) in `data-model.md` or `spec.md` clarifying the rule, or record it in `contracts/` so tests and systems align. |
| C1 | Coverage gap | HIGH | `spec.md` FR-019 (post-battle statistics) vs `tasks.md` | UI (T034 Victory screen) provides a "Stats" button, but there is no explicit task for a `statsSystem`/stats-aggregation system in tasks.md that collects per-robot/team metrics. This is a functional gap: display (UI) exists without an explicit data collection system. | Add a `statsSystem` task (e.g., `src/ecs/systems/statsSystem.ts` or `src/hooks/useStatsTracking.ts`) to compute and persist per-robot and team metrics, and map it to FR-019. Update tests to assert stats exist. |
| I1 | Inconsistency | MEDIUM | `plan.md` (Task list) vs `tasks.md` | `plan.md` earlier lists a camera contract test (`tests/contracts/camera-system.test.ts`) under Phase 1 artifacts; `tasks.md` contains only two contract tests (spawn and weapon). The camera contract test appears in plan but is not present in `tasks.md`. | Decide whether camera contract test is required. If yes, add a camera contract test task (e.g., `tests/contracts/camera-system.test.ts`) or remove it from the plan. |
| T1 | Terminology / numbering drift | LOW | `plan.md` vs `tasks.md` | Plan drafts earlier referenced ~30 tasks; `tasks.md` contains 37 — plan later notes 37, but some earlier enumerations in `plan.md` still show older numbers. | No functional change required; consider consolidating numbering references in `plan.md` to avoid confusion. |
| A2 | Ambiguity (non-functional) | MEDIUM | `spec.md` FR-010 / FR-017 / `tasks.md` T013/T037 | Performance requirements specify target values (60 fps target, 30 fps floor) — measurable — but acceptance tests must define environment/measurement method (device, resolution, build/dev). The tests/tasks assume "modern Chromium"; this is likely fine but should be explicitly documented. | Add precise test environment spec (e.g., test harness: headless Chromium on CI with GPU flags or device profile) and measurement method (rolling average over N seconds, sampling frequency). Put this in `quickstart.md` or `contracts/performance-contract.md`. |
| D2 | Duplication (infra) | LOW | `tasks.md` T003-T007 | Multiple infra tasks (linters, CI checks, size checks, code-health) are listed. They are valid but partially overlap in intent (T004/T005 both enforce PR-level checks). | Keep, but consider grouping or clarifying ownership and outputs (which check each enforces). |
| U2 | Underspecification (spawn details) | LOW | `tasks.md` T008/T021 vs `spec.md` FR-001 | `tasks.md` contains specific spawn validations (no overlap, spawn zone definitions). `spec.md` requires "designated starting zones" but does not define the zone geometry or anti-overlap rules precisely. | DONE: Spawn geometry and anti-overlap rules have been moved into `specs/001-3d-team-vs/contracts/spawn-contract.md` and captured in `specs/001-3d-team-vs/data-model.md`. Tests and the spawn system should reference `spawn-contract.md` as the canonical source. Verify `tests/contracts/robot-spawning.test.ts` and `src/ecs/systems/spawnSystem.ts` reference this contract. |
| M1 | Missing mapping (small) | LOW | `plan.md` `systems/statsSystem.ts` mentioned vs `tasks.md` | `plan.md` referenced `systems/statsSystem.ts` in the source structure; `tasks.md` does not include a dedicated `statsSystem` item. (Overlaps with C1 but this entry notes the plan→tasks mismatch.) | Add `statsSystem` to tasks.md and specify file path and acceptance criteria. |

Notes: Main table limited to the most actionable items. Lower-priority wording/formatting improvements are available if desired.

---

## Coverage Summary Table

| Requirement Key | Has Task? | Task IDs | Notes |
|-----------------|----------:|---------:|-------|
| fr-001-spawn-10v10 | Yes | T008, T021 | Good: contract + spawn system. Spawn geometry and overlap rules have been added to `specs/001-3d-team-vs/contracts/spawn-contract.md` and `specs/001-3d-team-vs/data-model.md`. |
| fr-002-ai-multilayer | Yes | T010, T024, T025, T026 | Covered. Need explicit captain-election algorithm (see A1). |
| fr-003-weapons-rps | Yes | T009, T022 | Tests assert numeric damage values not present in spec → reconcile (see U1). |
| fr-004-hit-damage | Yes | T023, T012 | Covered by Damage system & physics test. |
| fr-005-remove-eliminated | Yes | T023, T036 | Covered. |
| fr-006-victory-screen | Yes | T011, T027, T034 | Covered. |
| fr-007-render-arena | Yes | T030 | Covered. |
| fr-008-dynamic-shadows | Yes | T030, T037 | Covered; tests include performance behavior. |
| fr-009-humanoid-meshes | Yes | T028 | Covered (MVP box geometry). |
| fr-010-60fps-target | Yes | T013, T037 | Covered, but test environment must be explicit (see A2). |
| fr-011-use-ecs-miniplex | Yes | T020 | Covered. |
| fr-012-physics-engine | Yes | T036, T012 | Covered. |
| fr-013-hybrid-camera | Yes | T031, T032, T033 | Covered; plan includes camera contract in earlier draft — reconcile (I1). |
| fr-014-init-reset | Yes | T019, T027, T034 | Covered. |
| fr-015-10v10-support | DUPLICATE | FR-001 | Redundant—merge with FR-001. |
| fr-016-multiple-projectiles | Yes | T013, T029, T036, T037 | Covered. |
| fr-017-shadows>=30fps | Yes | T013, T037 | Covered; clarify measurement method (A2). |
| fr-018-touch-input | Yes | T032 | Covered. |
| fr-019-post-battle-stats | PARTIAL | T034 (UI) | Missing dedicated stats aggregation system/task — add statsSystem. |
| fr-020-captain-visual | Yes | T028 (renderer) | Covered. |
| fr-021-quality-scaling | Yes | T037, T035 | Covered. |
| fr-022-time-scale-reduction | Yes | T037 | Covered. |
| fr-023-warning-overlay | Yes | T013, T035, T037 | Covered. |

Metrics:
- Total functional requirements (FRs): 23 (FR-001..FR-023)
- Requirements with >=1 task: 22 full, 1 partial (FR-019)
- Coverage %: ~95.7% (22/23 fully covered; FR-019 partial)
- Ambiguity count (medium/high items): 3
- Duplication count (notable): 1
- Critical issues: 0 (no constitution MUST violations found)

---

## Constitution Alignment Issues

I evaluated `tasks.md` and `plan.md` against the project constitution (`.specify/memory/constitution.md`).

- Test-First (II): tasks.md enforces TDD (contract + integration tests written before implementation). ✓
- Size & Separation (III): tasks.md contains explicit LOC estimates and CI source-size check tasks (T005). ✓
- React/r3f Best Practices (IV): Rendering separated from simulation in tasks (render components depend on ECS and hooks). ✓
- Observability & Performance (V): Performance manager, performance tests, and overlays are included (T013, T035, T037). ✓
- Deprecation & Dependency Hygiene (VI): tasks include code-health script and dependency notes (T006, T002). ✓

No CRITICAL constitution violations were detected. The missing `statsSystem` is not a constitution violation but is a functional coverage gap (see C1). The TDD ordering is present and respected in tasks.md.

---

## Unmapped Tasks or Items of Note

- Tasks that are "infrastructure" (T003 ESLint/Prettier, T004/T005 CI checks, T006 check-code-health, T007 global types) do not map to user-facing FRs but are intentionally constitution/infra tasks — this is expected.
- `plan.md` previously mentioned a camera contract test under `tests/contracts/` — this is missing in `tasks.md` (I1).

---

## Suggested Remediation Plan (small, low-risk edits)

If you want concrete fixes I suggest these small, focused edits to `specs/001-3d-team-vs/` artifacts so `tasks.md` and tests align with the authoritative spec:

1. Add stats aggregation task
	- Add new task after T027 (or insert as T028 shift) named: "Txxx Stats aggregation system" with file `src/ecs/systems/statsSystem.ts` (or `src/hooks/useStatsTracking.ts`) and acceptance criteria: collect per-robot kills, damage dealt, damage taken, time survived; expose API for VictoryScreen T034.
	- Update dependencies: Txxx -> required by T034 and victory/integration tests.

2. Reconcile weapon numeric values
	- Either:
	  a) Move numeric values (Laser 15, Gun 20, Rocket 30, multipliers) into `contracts/scoring-contract.md` and point T009 to that contract, or
	  b) Add the numeric values to `spec.md` (FR-003 acceptance criteria) so contract tests are grounded in the spec.
	- Update tasks/tests to reference `contracts/scoring-contract.md`.

3. Document captain-election behavior
	- Add a short clause (e.g., "Captain election: highest current health; tie-breaker: lowest id or random") into `data-model.md` or `spec.md` clarifications.
	- Update tasks T025 to reference that rule (or change T025 to be more generic if you prefer a different method).

4. Camera contract test alignment
	- If camera-level contract is required, add `tests/contracts/camera-system.test.ts` (task) or remove the camera contract reference from `plan.md` so artifacts are consistent.

5. Clarify performance test environment
	- Add an environment/measurement section to `quickstart.md` or create `contracts/performance-contract.md` describing browser version, headless Chromium flags, resolution, and sampling window.

If you want, I can generate the exact edits as PR-friendly patches (e.g., add the `statsSystem` task to `tasks.md`, add a short `contracts/scoring-contract.md` stub, or add a clarifying clause to `spec.md`). Tell me which of the above you want me to apply (or pick top N), and I will prepare exact diffs.

---

## Short answer to the question: "are we finished for now?"

Functionally: almost — the plan and tasks cover most functional and non-functional requirements and appear constitutionally compliant. However, there are three items I recommend addressing before starting implementation (T021+):

- Add a dedicated `statsSystem` task (FR-019 partial coverage). — HIGH priority
- Reconcile weapon numeric values between spec/contracts/tests (U1). — HIGH priority
- Decide/capture the captain-election rule (A1). — MEDIUM priority

Addressing those will raise coverage to fully complete and remove ambiguous test assumptions.

---

## Next steps

Would you like me to:
- (A) Propose concrete edits to fix the top 3 issues (add `statsSystem` task, add scoring-contract or spec numbers, add captain election text)? — I can prepare a patch for the relevant files (`tasks.md`, `spec.md` or `contracts/scoring-contract.md`) and run the repository checks.
- (B) Or would you prefer only guidance and to apply changes yourself?

If (A), say how you want the scoring numbers handled:
- Keep the numeric values used in tests (15/20/30) and move them into `contracts/scoring-contract.md`, or
- Remove numbers from tests and require the implementation to provide damage constants (less deterministic).

Pick one and I’ll prepare the edits and run the checks.

---

End of handover.
