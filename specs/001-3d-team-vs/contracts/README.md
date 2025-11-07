# Contracts - Scoring Contract Workflow

This README explains the intended workflow for updating numeric game-balance values that are documented in
`scoring-contract.md` and used by runtime code in `src/ecs/constants/weaponConstants.ts`.

Purpose
- `specs/001-3d-team-vs/contracts/scoring-contract.ts` is the canonical (machine-readable) contract module containing the numeric damage table and multipliers. Maintain the human-readable `scoring-contract.md` for rationale and acceptance criteria.
- `weaponConstants.ts` is the runtime constants module used by the game and tests; prefer importing canonical values via `src/contracts/loadScoringContract.ts`.

Recommended update workflow
1. Edit the canonical TypeScript scoring contract first: `specs/001-3d-team-vs/contracts/scoring-contract.ts`. Document rationale and update the damage table and multipliers.
2. Optionally update the human-readable `specs/001-3d-team-vs/contracts/scoring-contract.md` to match for reviewers.
3. Update or add contract tests in `tests/contracts/weapon-balance.test.ts` (TDD - failing tests first).
4. Ensure `src/contracts/loadScoringContract.ts` still re-exports the values; adjust the loader only if you intend to change the import surface for runtime code.
5. Run the contract and unit tests to validate behavior:

```bash
# Run only the weapon balance contract test
npx vitest tests/contracts/weapon-balance.test.ts
```

6. In your PR description:
- Link to the updated `scoring-contract.md` and explain the balancing rationale.
- Add the failing→green test story (TDD evidence) and reference the tests updated.
- Tag the change with `CONTRACT-CHANGE` in the PR body to make it easy to discover design changes.

Developer notes & best practices
- Always prefer the contract as the authoritative source for design decisions.
- Keep the contract prose clear: include the exact numeric table and a short justification for each change so reviewers can evaluate balance impact.
- If the change will affect saved stats, leaderboards, or serialized replays, include a migration note in the PR.
- Consider adding an automated sync-test (lightweight) that fails the CI build if code and contract diverge — see the constants README for an example test idea.

If you want help adding a small CI check or a simple test that verifies the contract and runtime constants are synchronized (recommended), request it and I will add a minimal implementation and unit test.