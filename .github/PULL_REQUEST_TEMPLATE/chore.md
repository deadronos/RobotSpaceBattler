# Chore Pull Request

## Summary
Describe the maintenance or chore being performed (deps update, CI changes, cleanup).

## Checklist

- [ ] Relevant tests updated or added as needed
- [ ] Linting and formatting run locally: `npm run lint && npm run format`
- [ ] Source-size check run locally: `npm run check:source-size`

## CONSTITUTION-CHECK

- File-size & decomposition:
  - Modified files (paths):
    - `scripts/...` or `src/...`
  - LOC summary or decomposition plan (if any file > 300 LOC):
    - Describe plan or add `CONSTITUTION-EXEMPT` header and justification.

- Tests (TDD evidence):
  - Tests added or updated: list paths.

- Agentic AI triggers (chore-specific):
  - Does this change modify agent privileges or automation flows? yes / no — if yes,
    include governance approvals and links.

- Deprecation & redundancy:
  - Files/APIs deprecated or removed: list and link to migration plan.

- Target platforms & compatibility:
  - If the chore affects build targets, list target baseline.


## Implementation notes
Provide links to tickets or additional context.


## Related issues

- Closes: #
