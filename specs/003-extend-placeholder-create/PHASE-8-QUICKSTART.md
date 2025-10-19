# Phase 8: Refactoring & Constitutional Compliance — Quick Start Guide

**Status**: 🔄 In Progress  
**Effort**: ~21 hours (~5 hours completed, ~16 hours remain)  
**Tasks**: T057–T066 (10 tasks, 5 complete)  
**Current**: T057–T061 Complete | Next: T062 (world.ts evaluation) or T063 (matchPlayer extraction) | Started: 2025-10-19

---

## Executive Summary

Phase 8 refactors three oversized files (470, 391, 342 LOC) to meet the constitutional
300 LOC limit. Work is split into three groups: planning, extractions, and validation.

### Quick Facts

| Aspect | Detail |
|--------|--------|
| **Files to Refactor** | 3 (primary) + 1 (bonus) |
| **Target LOC** | ≤ 300 per file |
| **Progress** | 1/3 primary extractions done (cameraMath ✅) |
| **useCameraControls** | **299 LOC ✅** |
| **world.ts** | **300 LOC ✅** |
| **matchPlayer.ts** | **391 LOC ⚠️** |
| **Task Phases** | Planning (15h) ✅ → Extraction (8h) 🔄 → Validation (4h) ⧖ |
| **Risk Level** | Low–Medium (all extractions have unit tests) |
| **Breaking Changes** | None expected (API contracts preserved) |
| **Regression Risk** | Mitigated (406+ test suite validates) |

---

## Phase 8 Work Breakdown

### Group 8.1: Planning (T057–T060) — 15 hours, 100% Parallelizable

Create detailed refactor plans with API contracts and test strategies.

| Task | File/Module | Proposal | Effort | Status |
|------|------------|----------|--------|--------|
| **T057** | Repo-wide | Create filesize scan artifact | 2h | [x] ✅ 2025-10-19 |
| **T058** | `world.ts` | Split into `createWorld.ts`, `simulationLoop.ts`, `worldApi/*` | 4h | [x] ✅ 2025-10-19 |
| **T059** | `matchPlayer.ts` | Split into `eventIndex.ts`, `playbackClock.ts`, `replayRng.ts` | 4h | [x] ✅ 2025-10-19 |
| **T060** | `useCameraControls.ts` | Extract math to `src/utils/cameraMath.ts` | 3h | [x] ✅ 2025-10-19 |

**Planning Checklist** (for each refactor plan):

- [ ] Current LOC breakdown by function/class
- [ ] Proposed module structure with dependencies
- [ ] Public API surface (exports) preserved
- [ ] Test strategy (what unit tests move/stay/new)
- [ ] Migration steps (code movement order)
- [ ] Rollback plan (if needed)
- [ ] Estimated LOC after refactor (goal: all ≤ 300)

### Group 8.2: Extractions (T061–T063) — 8–9 hours, Sequential

Execute low-risk code movements with full test validation.

| Task | Source | Target | Strategy | Hours | Status |
|------|--------|--------|----------|-------|--------|
| **T061** | useCameraControls | cameraMath | Extract math | 2–3h | ✅ |
| **T062** | world.ts | createWorld | Extract factory | 3h | [ ] |
| **T063** | matchPlayer | eventIndex | Extract events | 2–3h | [ ] |

**Extraction Checklist** (for each task):

- [ ] Unit tests written FIRST for extracted logic
- [ ] Code moved to new module (same public API)
- [ ] Original file updated with thin re-exports
- [ ] All tests pass: `npm run test`
- [ ] No lint errors: `npm run lint`
- [ ] Coverage ≥ 60%: `npm run test:coverage`
- [ ] Commit with clear message: `refactor: extract [module] from [file]`

### Group 8.3: Validation & Documentation (T064–T066) — 3–4 hours, Sequential

Verify no regressions and document outcomes.

| Task | Scope | Validation | Hours | Status |
|------|-------|-----------|-------|--------|
| **T064** | All extractions | Full test suite | 1h | [ ] |
| **T065** | Constitution | Verify LOC limit | 1h | [ ] |
| **T066** | Outcomes | Document refactor | 2h | [ ] |

**Validation Checklist** (after all extractions):

- [ ] `npm run test` → 406/407 passing (or more) ✅
- [ ] `npm run lint` → 0 errors ✅
- [ ] `npm run test:coverage` → ≥ 60% ✅
- [ ] All src files scanned: `scripts/check_source_size.js`
- [ ] Result: 0 violations (all files ≤ 300 LOC) ✅
- [ ] Constitution check script passes ✅
- [ ] Refactor summary document created with metrics

---

## Key Success Criteria

### Before Starting

- [x] Phase 7 complete and verified (T056 ✅)
- [x] All 406+ tests passing ✅
- [x] All refactor plans (T057–T060) created ✅ 2025-10-19
- [x] Extraction order confirmed (T061 ✅ complete → T062/T063 next) ✅

### During Extractions

- [ ] Each extracted module has unit tests FIRST
- [ ] Original files preserve public API (thin re-exports if needed)
- [ ] Tests run after EACH extraction
- [ ] No breaking changes to consuming code

### After Phase 8

- [ ] All src files ≤ 300 LOC
- [ ] 406+ tests still passing
- [ ] 0 ESLint errors
- [ ] ≥ 60% code coverage maintained
- [ ] Refactor outcomes documented
- [ ] Team sign-off on compliance

---

## Execution Timeline

### Day 1 (4–5 hours) ✅ COMPLETE

- [x] T057: Create filesize scan ✅ 2025-10-19
- [x] T058: Refactor plan for `world.ts` ✅ 2025-10-19
- [x] T059: Refactor plan for `matchPlayer.ts` ✅ 2025-10-19
- [x] T060: Refactor plan for `useCameraControls.ts` ✅ 2025-10-19
- [x] T061: Extract camera math helpers ✅ 2025-10-19

Output: 4 detailed refactor plans + first extraction complete ✅

### Day 2 (3–4 hours) 🔄 IN PROGRESS

- [ ] T062: Evaluate world.ts (currently 300 LOC — at limit, may skip)
- [ ] T063: Extract event indexing from matchPlayer.ts (391 LOC → target ≤300)
- [ ] Verify: `npm run test` + `npm run lint` (after each task)

Goal: 1–2 modules extracted, all tests green

### Day 3 (3–4 hours) ⧖ PENDING

- [ ] T064: Full regression test suite
- [ ] T065: Constitution check script update
- [ ] T066: Document refactor outcomes

Goal: All extractions complete, Phase 8 ready for merge

---

## Important Notes

### API Preservation

Each extraction must preserve the original module's public API to avoid breaking consumers:

```typescript
// Bad: Breaks imports
// Before: import { calcDistance } from './useCameraControls'
// After: Module removed or API changed

// Good: Preserves API
// Before: import { calcDistance } from './useCameraControls'
// After: export { calcDistance } from '../utils/cameraMath'
```

### Test-First Approach

Always write unit tests for extracted code BEFORE moving it:

1. Write test in new module (`cameraMath.test.ts`)
2. Write implementation in new module (`cameraMath.ts`)
3. Add thin re-export in original file
4. Run all tests → should pass
5. Commit

### Incremental Validation

Run full test suite after EACH extraction:

```bash
npm run test           # Unit + integration tests
npm run lint           # ESLint (0 errors)
npm run test:coverage  # Coverage report (≥ 60%)
```

Stop immediately if tests fail. Debug before proceeding to next extraction.

---

## Rollback Plan

If a refactoring introduces regressions:

1. Run `npm run test` to identify failures
2. Review the extraction checklist
3. Options:
   - **Small fix**: Update extracted module + re-run tests
   - **Major issue**: Revert extraction commit and debug
   - **API breach**: Verify thin re-exports are correct

Estimated rollback time: 15–30 minutes per extraction

---

## Contact & Support

- **Questions on refactor plans**: Review COMPLETION-SUMMARY.md + Phase 8 section
  in tasks.md
- **Test failures**: Check extracted module unit tests first, then integration
- **Coverage concerns**: Ensure extracted logic has equivalent test coverage
- **Breaking changes**: Document in refactor-summary.md for future developers

---

## Current Status Checklist (2025-10-19)

- [x] Phase 8 kickoff & planning complete (T057–T060 ✅)
- [x] First extraction done (T061 ✅ — cameraMath.ts)
- [x] useCameraControls.ts reduced to 299 LOC ✅ (from 343)
- [x] All refactor plans reviewed and ready ✅
- [x] Test suite still passing (406/407 ✅)
- [ ] **NEXT**: T063 — Extract event indexing from matchPlayer.ts (391 LOC → ≤300)
- [ ] Then T064–T066 (validation & documentation)

---

*Phase 8 started: 2025-10-19*  
*Progress: 5/10 tasks complete (~5 hours invested)*  
*Remaining effort: ~16 hours for T062–T066*  
*Next milestone: Complete T063 (matchPlayer extraction) — ~2–3 hours*  
*Expected completion: 2025-10-20 (if extractions complete tomorrow)*
