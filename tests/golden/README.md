# Golden traces

This folder contains tools and sample traces for deterministic regression testing.

Generate a golden trace locally with:

```bash
# Windows PowerShell
$env:SEED=424242; $env:STEPS=10; node tests/golden/generate.js

# or with npm script (not included by default):
# npm run generate:golden -- --seed=424242 --steps=10
```

The generator writes an NDJSON file to `tests/golden/traces/<name>.ndjson` containing
three sections separated by `---`:

1. Event log NDJSON (DeathAuditEntry lines)
2. Persisted projectiles NDJSON
3. Entity snapshots NDJSON

Comparison helper

- `src/utils/golden.ts` exposes `compareWithGolden(filePath, combinedTrace)` and
  `buildCombinedTrace(parts)` to create and compare traces programmatically.

Usage in tests

- In tests, use `buildCombinedTrace` to produce the combined NDJSON string and
  `compareWithGolden` to assert that a newly generated trace matches the checked-in golden.

Keep golden files small and review them in PRs. Golden traces are best used for
end-to-end, low-volume regression checks (e.g., <100 steps) to ensure identical
state and export ordering across code changes.