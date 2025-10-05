# Feature Pull Request

## Summary
Describe the feature and high-level motivation. Keep it focused on user-visible behavior and acceptance criteria.

## Checklist

- [ ] Feature has tests (unit / integration / contract)
- [ ] Linting and formatting run locally: `npm run lint && npm run format`
- [ ] Source-size check run locally: `npm run check:source-size`

## CONSTITUTION-CHECK

- File-size & decomposition:
  - Modified files (paths):
    - `src/...`
  - LOC summary or decomposition plan (if any file > 300 LOC):
    - `src/foo.tsx`: 420 LOC — planned extraction: refactor into `hooks/useFoo.ts` and
      `components/FooBody.tsx` or add `CONSTITUTION-EXEMPT` header with justification.

- Tests (TDD evidence):
  - Tests added (paths):
    - `tests/unit/testFoo.test.ts`
  - TDD notes / evidence:
    - Describe TDD steps and reference commits or CI run IDs where failing tests were
      created before implementation.

- React / r3f guidance (if change affects rendering or simulation):
  - Rendering vs simulation separation maintained: yes / no — explanation.
  - `useFrame` usage justified: yes / no — explain where heavy work is offloaded.
  - Asset loading uses Suspense/loader abstraction: yes / no — loader paths.

- Observability & Performance:
  - Logging in hot loops rate-limited: yes / no — explanation.
  - Performance targets affected: provide profiling notes or CI results.

- Deprecation & redundancy:
  - Files/APIs deprecated or removed: list and link to migration plan.

- Agentic AI triggers:
  - Does this change grant agents automation privileges or add agents that can
    create/merge PRs or deploy? yes / no — if yes, include maintainer approvals.

- Target platforms & compatibility:
  - Target browser baseline: Chrome 120+ / Edge 120+
  - Required polyfills or build steps (if any):


## Implementation notes
Link to relevant specs, plan.md, data-model.md, or other supporting docs.


## Related issues

- Closes: #
