# Phase 8: Refactoring & Constitutional Compliance — Quick Start Guide

**Status**: ⧖ Ready to Begin  
**Effort**: ~21 hours  
**Tasks**: T057–T066 (10 tasks)  
**Start Condition**: Phase 7 complete (✅ verified 2025-10-19)

---

## Executive Summary

Phase 8 refactors three oversized files (470, 391, 342 LOC) to meet the constitutional
300 LOC limit. Work is split into three groups: planning, extractions, and validation.

### Quick Facts

| Aspect | Detail |
|--------|--------|
| **Files to Refactor** | 3 |
| **Target LOC** | ≤ 300 per file |
| **Current Total** | 1,203 LOC (all three files) |
| **Task Phases** | Planning (15h) → Extraction (8h) → Validation (4h) |
| **Risk Level** | Low–Medium (all extractions have unit tests first) |
| **Breaking Changes** | None expected (API contracts preserved) |
| **Regression Risk** | Mitigated (406+ test suite validates each step) |

---

## Phase 8 Work Breakdown

### Group 8.1: Planning (T057–T060) — 15 hours, 100% Parallelizable

Create detailed refactor plans with API contracts and test strategies.

| Task | File/Module | Proposal | Effort | Status |
|------|------------|----------|--------|--------|
| **T057** | Repo-wide | Create filesize scan artifact | 2h | [ ] |
| **T058** | `world.ts` | Split into `createWorld.ts`, `simulationLoop.ts`, `worldApi/*` | 4h | [ ] |
| **T059** | `matchPlayer.ts` | Split into `eventIndex.ts`, `playbackClock.ts`, `replayRng.ts` | 4h | [ ] |
| **T060** | `useCameraControls.ts` | Extract math to `src/utils/cameraMath.ts` | 3h | [ ] |

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

| Task | Source File | Target Module | Strategy | Effort | Status |
|------|------------|---------------|----------|--------|--------|
| **T061** | `useCameraControls.ts` | `src/utils/cameraMath.ts` | Extract pure math (low risk) | 2–3h | [ ] |
| **T062** | `world.ts` | `src/ecs/createWorld.ts` | Extract factory logic | 3h | [ ] |
| **T063** | `matchPlayer.ts` | `src/systems/matchTrace/eventIndex.ts` | Extract event indexing | 2–3h | [ ] |

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

| Task | Scope | Validation | Effort | Status |
|------|-------|-----------|--------|--------|
| **T064** | All extractions | Run full test suite (406+ tests + lint + coverage) | 1h | [ ] |
| **T065** | Constitution check | Update script, verify all files ≤ 300 LOC | 1h | [ ] |
| **T066** | Outcomes | Document before/after, API contracts, migration notes | 2h | [ ] |

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

- [ ] Phase 7 complete and verified (T056 ✅)
- [ ] All 406+ tests passing
- [ ] All refactor plans (T057–T060) agreed upon by team
- [ ] Extraction order confirmed (T061 → T062 → T063)

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

### Day 1 (4–5 hours)

- T057: Create filesize scan
- T058: Refactor plan for `world.ts`
- T059: Refactor plan for `matchPlayer.ts`
- T060: Refactor plan for `useCameraControls.ts`

*Output: 4 detailed refactor plans ready for review*

### Day 2 (3–4 hours)

- T061: Extract camera math helpers
- Verify: `npm run test` + `npm run lint` (after T061)
- T062: Extract world factory logic
- Verify: Tests + lint (after T062)

*Output: 2 modules extracted, all tests green*

### Day 3 (3–4 hours)

- T063: Extract event indexing
- Verify: Tests + lint (after T063)
- T064: Full regression test suite
- T065: Constitution check script update
- T066: Document refactor outcomes

*Output: All extractions complete, Phase 8 ready for merge*

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

## Final Checklist (Before T057 Starts)

- [ ] Read this guide
- [ ] Review tasks.md Phase 8 section (full task descriptions)
- [ ] Review COMPLETION-SUMMARY.md (planning rationale)
- [ ] Confirm Phase 7 complete (T056 ✅)
- [ ] Check current LOC of target files
- [ ] Mark T057 as `in-progress` when ready

---

*Generated 2025-10-19 after Phase 7 completion*  
*Phase 8 effort estimate: 21 hours over 3–4 days*  
*Expected completion: 2025-10-23*
