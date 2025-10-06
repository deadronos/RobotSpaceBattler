# Contracts - Scoring Contract Workflow

This README explains the intended workflow for updating numeric game-balance values that are documented in
`scoring-contract.md` and used by runtime code in `src/ecs/constants/weaponConstants.ts`.

Purpose
- `scoring-contract.md` is the human-readable design record: rationale, tables, and acceptance criteria for weapon balance.
- `weaponConstants.ts` is the runtime constants module used by the game and tests.

Recommended update workflow
1. Edit `specs/001-3d-team-vs/contracts/scoring-contract.md` first. Record the rationale for any numeric change and update the damage table and multipliers.
2. Update or add contract tests in `tests/contracts/weapon-balance.test.ts` (or similar) so the contract's expectations are captured as failing tests before implementation (TDD).
3. Update the runtime constants in `src/ecs/constants/weaponConstants.ts` to reflect the new canonical numbers.
4. Run the contract and unit tests to validate behavior:

```bash
# Run only the weapon balance contract test
npx vitest tests/contracts/weapon-balance.test.ts
```

5. In your PR description:
- Link to the updated `scoring-contract.md` and explain the balancing rationale.
- Add the failing→green test story (TDD evidence) and reference the tests updated.
- Tag the change with `CONTRACT-CHANGE` in the PR body to make it easy to discover design changes.

Developer notes & best practices
- Always prefer the contract as the authoritative source for design decisions.
- Keep the contract prose clear: include the exact numeric table and a short justification for each change so reviewers can evaluate balance impact.
- If the change will affect saved stats, leaderboards, or serialized replays, include a migration note in the PR.
- Consider adding an automated sync-test (lightweight) that fails the CI build if code and contract diverge — see the constants README for an example test idea.

If you want help adding a small CI check or a simple test that parses the contract and compares values to `weaponConstants.ts`, request it and I will add a minimal implementation and unit test.