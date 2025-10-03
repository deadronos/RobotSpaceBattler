# Plan alignment report — Simulation feature

Date: 2025-10-03
Scope: alignment analysis across spec.md, plan.md, tasks.md and current src/ implementation

## Purpose
Record the results of a cross-artifact alignment pass performed after tasks generation and initial implementation. This file summarizes the analysis, highlights critical and high-severity gaps, and lists recommended remediation steps prioritized for execution.

---

## Summary
- Overall alignment: good. The project implemented the StepContext-driven model (FixedStepDriver), rAF TickDriver, a runtime event log, and a physics adapter abstraction. Core systems accept StepContext and many TDD tasks were implemented.
- Two CRITICAL issues were found: several simulation systems still fall back to non-deterministic APIs (Date.now(), Math.random()), violating the Constitution (Deterministic Simulation). These should be remediated immediately.
- Additional HIGH and MEDIUM items (performance target consistency, missing NDJSON export perf test, simNowMs naming drift, partial id canonicalization) follow after the critical fixes.

---

## Top findings (prioritized)

1. CRITICAL — Date.now() / Math.random() in simulation systems
   - Locations: src/systems/WeaponSystem.ts, RespawnSystem.ts, AISystem.ts; fallback id generation in WeaponSystem uses Math.random + Date.now.
   - Impact: breaks determinism (tests/replays cannot be guaranteed identical).
   - Remediation: remove non-deterministic fallbacks. Require StepContext.simNowMs and StepContext.rng/idFactory for systems; add tests asserting callers supply them.

2. CRITICAL — Math.random-based id/time fallbacks
   - Locations: WeaponSystem event id fallback, other places where system-level RNG defaults to Math.random
   - Impact: non-reproducible event ids and sequences in tests.
   - Remediation: require idFactory injection from FixedStepDriver/StepContext; if missing, fail loudly (or provide deterministic idFactory derived from StepContext).

3. HIGH — Performance target mismatch
   - Spec asks for <16ms target (dev), tasks/benchmark use default 30ms and strict gating optional.
   - Impact: unclear acceptance criteria and CI gating policy.
   - Remediation: pick an authoritative target (e.g., 16ms) and document whether it is strict CI gate or dev guidance; create a CI job for strict runs when appropriate.

4. HIGH — Missing NDJSON export perf test (FR-016)
   - Spec requires NDJSON export performance (100 entries <50ms) but no explicit task/test was added for this.
   - Remediation: add a tested benchmark that serializes 100 DeathAuditEntry objects to NDJSON and measures time; optionally gate in PERFORMANCE_STRICT mode.

5. MEDIUM — simNowMs vs simTimeMs naming drift
   - Location: fixedStepDriver pause token uses simTimeMs; StepContext uses simNowMs.
   - Impact: developer confusion and subtle test mismatches.
   - Remediation: standardize on `simNowMs` everywhere and update tokens/tests accordingly.

6. MEDIUM — Partial ID canonicalization (T052 partial)
   - Status: miniplexStore keeps numeric internal id but exposes gameplayId string. Implementation is functional but migration is incomplete.
   - Remediation: finish the migration plan so game logic uses gameplayId and legacy numeric id usage is removed or consistently wrapped.

7. MEDIUM — Rapier hit → entity id mapping underspecified
   - Implementation: extractEntityIdFromRapierHit() heuristics exist and the Rapier adapter uses them, but the spec should define mapping contract explicitly.
   - Remediation: document collider userData conventions and add unit tests for Rapier hit payloads.

8. LOW — Golden trace helper missing (T031 guidance incomplete)
   - Quickstart includes instructions but no script to generate golden traces consistently.
   - Remediation: add a small helper (tests/golden/generate.ts) and a task to commit or update golden traces with explicit review process.

---

## Requirements -> tasks coverage (summary)
- Requirements explicitly mapped to tasks: 16/17 (~94%) — most FRs are covered by tasks and code.
- FR-016 (NDJSON export perf) lacks a dedicated task/test implementation — add one.

---

## Recommended immediate remediation plan (safe, small steps)
1. Enforce determinism in systems (CRITICAL)
   - Update WeaponSystem, RespawnSystem, AISystem to require `StepContext.simNowMs` and `StepContext.rng`/`idFactory`. Remove Date.now/Math.random fallbacks.
   - Add unit tests that verify deterministic behavior when called with FixedStepDriver and that check errors/guards when StepContext is missing.

2. Add NDJSON export perf test (HIGH)
   - New test that serializes 100 audit entries to NDJSON and measures time. Make strict check controllable via PERFORMANCE_STRICT env var.

3. Standardize naming (MEDIUM)
   - Harmonize simNowMs vs simTimeMs naming; update pause token and tests.

4. Finalize ID canonicalization (MEDIUM)
   - Add a migration checklist: ensure gameplayId present on all entity creation paths; update any code that still reads numeric entity.id for gameplay logic.

5. Add Rapier mapping contract + unit tests (MEDIUM)
   - Document expected collider.userData keys and add unit tests for extractEntityIdFromRapierHit with multiple hit payload shapes.

6. (Optional) Add golden-trace generator utility and a managed golden directory (LOW)

---

## Suggested short-term tasks to add (explicit task text suggestions)
- Add task: T016A — Replace Date.now() & Math.random() fallbacks in simulation systems with StepContext-supplied values; add unit tests to enforce presence.
- Add task: T016B — Add NDJSON export performance test (serialize 100 DeathAuditEntry objects; measure <50ms under PERFORMANCE_STRICT run).
- Add task: T052B — Finish id canonicalization migration: scan repo for numeric id usage and migrate gameplay logic to gameplayId; add tests.
- Add task: T033A — Add unit tests for createRapierAdapter mapping: validate mapping for multiple Rapier payload shapes.

---

## Next actions (pick one)
- If you want the CRITICAL remediation applied now: tell me to implement remediation 1 (remove non-deterministic fallbacks) and I will prepare the patch + unit tests.
- If you prefer lower-risk steps first: I can add the NDJSON export perf test and a golden trace helper instead.

Would you like me to prepare the code edits for the top critical issue (remove Date.now/Math.random fallbacks and require StepContext) now? If yes, confirm whether to:
- throw/guard when StepContext is missing, or
- synthesize a deterministic idFactory from StepContext when not explicitly passed (recommended: require idFactory and fail loudly when absent).

---

(End of plan-aligning.md)
