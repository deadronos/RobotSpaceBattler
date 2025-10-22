# Quickstart — 3D Team Fight (demo + contract validation)

1. Install dependencies (from repo root):

   npm install

2. Start dev server and open the app (Vite):

   npm run dev

3. Run contract validator tests (Vitest):

   npm run test -- tests/contract-validator.spec.ts

4. Where to find artifacts:

- JSON Schemas: `specs/003-extend-placeholder-create/schemas/`
- Plan & research: `specs/003-extend-placeholder-create/plan.md`, `research.md`

Notes: The validator uses `ajv` and Vitest. See `tests/contract-validator.spec.ts` for example payloads and assertions.
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
