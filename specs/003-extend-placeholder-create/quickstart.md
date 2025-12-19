# Quickstart — 3D Team Fight (demo + contract validation)

## Prerequisites

- Node.js 18+
- Dependencies installed

```bash
npm install
```

## Run the app

```bash
npm run dev
```

## Run contract validator tests

```bash
npm run test -- tests/contract-validator.spec.ts
```

## Artifacts

- JSON Schemas: `specs/003-extend-placeholder-create/schemas/`
- Plan & research: `specs/003-extend-placeholder-create/plan.md`, `specs/003-extend-placeholder-create/research.md`

## Notes

The validator uses `ajv` and Vitest. See `tests/contract-validator.spec.ts` for example payloads and assertions.
