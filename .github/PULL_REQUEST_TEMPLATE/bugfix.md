# Bugfix Pull Request

## Summary
Describe the bug, how to reproduce it, and the fix. Include before/after behaviors.

## Checklist

- [ ] Tests added for the bug scenario
- [ ] Linting and formatting run locally: `npm run lint && npm run format`
- [ ] Source-size check run locally: `npm run check:source-size`

## CONSTITUTION-CHECK

- File-size & decomposition:
  - Modified files (paths):
    - `src/...`
  - LOC summary or decomposition plan (if any file > 300 LOC):
    - If large, describe extraction plan or add `CONSTITUTION-EXEMPT` header and
      justification.

- Tests (TDD evidence):
  - Tests added (paths):
    - `tests/unit/...`
  - TDD notes / evidence: describe failing test creation prior to implementation.

- React / r3f guidance (if change affects rendering or simulation):
  - Rendering vs simulation separation maintained: yes / no — explanation.

- Observability & Performance:
  - Logging in hot loops rate-limited: yes / no — explanation.

- Deprecation & redundancy:
  - Files/APIs deprecated or removed: list and link to migration plan.

- Agentic AI triggers:
  - Does this change grant agents automation privileges? yes / no — explain.

- Target platforms & compatibility:
  - Target browser baseline: Chrome 120+ / Edge 120+


## Implementation notes
Provide details and links to relevant specs or reproduction steps.


## Related issues

- Closes: #
