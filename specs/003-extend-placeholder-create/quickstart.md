# quickstart.md

Run the contract validator and tests for feature `003-extend-placeholder-create`.

Prerequisites:
- Node 18+ and npm installed

Steps:

```bash
# install dependencies
npm install

# run the contract validator tests (Vitest)
npm run test tests/contract-validator.spec.ts
```

Artifacts:
- `specs/003-extend-placeholder-create/schemas/*.json` — JSON Schemas for contract validation
- `specs/003-extend-placeholder-create/examples/*.json` — example payloads
- `tests/contract-validator.spec.ts` — Vitest test harness
