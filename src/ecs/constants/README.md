# Runtime Constants - Workflow & Guidelines

This file explains how `src/ecs/constants/weaponConstants.ts` is intended to be maintained and used.

Purpose
- `weaponConstants.ts` contains the runtime numeric constants for weapon base damage and matchup multipliers.
- Tests import these constants so the runtime and test code share the same single source of truth.

Quick update checklist
1. Update the canonical scoring contract first: edit the TypeScript contract module `specs/001-3d-team-vs/contracts/scoring-contract.ts` (preferred) and/or the human-readable `specs/001-3d-team-vs/contracts/scoring-contract.md`. Record the rationale for any numeric change.
2. Update `src/contracts/loadScoringContract.ts` if you need to adjust how the contract is exposed to runtime code (this is the stable import path used by runtime and tests).
3. Update `src/ecs/constants/weaponConstants.ts` only if you need to add helpers; prefer importing canonical values from `src/contracts/loadScoringContract` rather than duplicating numbers.
4. Run tests locally:

```bash
npx vitest tests/contracts/weapon-balance.test.ts
```

Example usage (runtime & tests)
```ts
// Import canonical values via the stable loader under src/
import { BASE_DAMAGE, MULTIPLIERS } from '../../src/contracts/loadScoringContract';

const damage = BASE_DAMAGE.laser * MULTIPLIERS.laser.gun;
```

Recommended guard
- Add a small unit test that verifies the contract and constants are consistent. A very light approach is to ensure `BASE_DAMAGE` keys match the set of `WeaponType` values.

PR guidance
- Include a link to the updated `specs/001-3d-team-vs/contracts/scoring-contract.ts` (and a corresponding `scoring-contract.md` entry if updated) in the PR description.
- Add a brief paragraph explaining why the values changed and the expected gameplay impact.
- If this change affects saved data or continuity (leaderboards, recorded matches), document migration or compatibility notes in the PR.

If you'd like, I can add a minimal CI check or a unit test that validates the contract and constants remain synchronized automatically.