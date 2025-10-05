# Pull request checklist

<!-- Pull Request template with a required CONSTITUTION-CHECK section.

Fill the CONSTITUTION-CHECK section fully. CI includes checks that will validate
this section is present and that source files do not exceed the constitution
limit (300 LOC) unless an exemption is included.
-->

## Summary
Describe the change at a high level and why it is needed.


## Checklist

- [ ] I have added or updated tests for my change (unit/integration/contract)
- [ ] I ran linting and formatting: `npm run lint && npm run format`
- [ ] I ran the source-size check locally: `npm run check:source-size`


## CONSTITUTION-CHECK

<!-- REQUIRED: contributors MUST complete this section. The CI workflow will fail
     if this section is missing. Provide concrete answers/paths for each item. -->

- File-size & decomposition:
  - Modified files (paths):
    - `src/...`
  - LOC summary or decomposition plan (if any file > 300 LOC):
    - `src/foo.tsx`: 420 LOC — planned extraction: refactor into `hooks/useFoo.ts` and
      `components/FooBody.tsx` or add an in-file `CONSTITUTION-EXEMPT` header with a
      short justification.

- Tests (TDD evidence):
  - Tests added (paths):
    - `tests/unit/testFoo.test.ts`
  - TDD notes / evidence:
    - Describe the TDD steps and link to commits or CI runs where you created failing
      tests before implementing behavior.

- React / r3f guidance (only if change affects rendering or simulation):
  - Rendering vs simulation separation maintained: yes / no — explanation.
  - `useFrame` usage justified (if present): explain why heavy work is offloaded.
  - Asset loading uses Suspense/loader abstraction: yes / no — loader paths.

- Observability & Performance:
  - Logging in hot loops rate-limited: yes / no — explanation.
  - Performance targets affected: e.g., 60 FPS — profiling notes or CI results.

- Deprecation & redundancy:
  - This PR deprecates or removes files/APIs: list and link to migration plan.

- Agentic AI triggers:
  - Does this change grant agents automation privileges or add agents that can
    create/merge PRs or deploy? yes / no — if yes, include maintainer approvals.

- Target platforms & compatibility:
  - Target browser baseline: Chrome 120+ / Edge 120+
  - Required polyfills or build steps (if any):


## Implementation notes
Link to relevant specs, plan.md, data-model.md, or other supporting docs.


## Screenshots / Recordings (if UI change)


## Related issues
- Closes: #


<!-- End of template -->