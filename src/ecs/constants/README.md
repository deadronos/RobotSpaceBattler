# Runtime Constants - Workflow & Guidelines

This file explains how `src/ecs/constants/weaponConstants.ts` is intended to be maintained and used.

Purpose
- `weaponConstants.ts` contains the runtime numeric constants for weapon base damage and matchup multipliers.
- Tests import these constants so the runtime and test code share the same single source of truth.

Quick update checklist
1. Update the design contract first: edit `specs/001-3d-team-vs/contracts/scoring-contract.md` and explain the rationale for any numeric change.
2. Update `src/ecs/constants/weaponConstants.ts` to match the contract.
3. Update/extend tests in `tests/contracts/weapon-balance.test.ts` to import and assert properties of the constants (not to re-declare literals).
4. Run tests locally:

```bash
npx vitest tests/contracts/weapon-balance.test.ts
```

Example usage (runtime & tests)
```ts
import { BASE_DAMAGE, getDamageMultiplier } from '../../src/ecs/constants/weaponConstants';

const damage = BASE_DAMAGE.laser * getDamageMultiplier('laser', 'gun');
```

Recommended guard
- Add a small unit test that verifies the contract and constants are consistent. A very light approach is to ensure `BASE_DAMAGE` keys match the set of `WeaponType` values.

PR guidance
- Include a link to the updated `scoring-contract.md` in the PR description.
- Add a brief paragraph explaining why the values changed and the expected gameplay impact.
- If this change affects saved data or continuity (leaderboards, recorded matches), document migration or compatibility notes in the PR.

If you'd like, I can add a minimal CI check or a unit test that validates the contract and constants remain synchronized automatically.