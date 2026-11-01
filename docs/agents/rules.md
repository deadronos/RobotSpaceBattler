# Rules and conventions

## File size

- Files under `src/`, `tests/`, `scripts/` and `playwright/` stay at or below 300 lines.
  `npm run lint` and CI run `scripts/check_source_size.js`.
- Split by responsibility: pure logic, I/O, rendering, state and orchestration live in
  separate modules. A thin re-exporting facade keeps the public API during a split.
- Exemptions are a last resort. Put this in the first 30 lines of the file:

  ```ts
  // SIZE-EXEMPT: <why> (#<issue tracking the refactor>)
  ```

## TypeScript and modules

- `strict: true`, no `any`. Prefer explicit types at module boundaries.
- ESM everywhere (`"type": "module"`). No `require()` or `module.exports`; name a file
  `.cjs` if CommonJS is unavoidable.
- Naming: components and types in PascalCase (`RobotPanel.tsx`), files and variables in camelCase.

## React and r3f

- Function components and hooks only.
- Keep `useFrame` light: no allocation and no heavy work per frame. Prefer instancing
  and refs over React state for anything that moves.
- Memoize only where it prevents a measured re-render or allocation.
- See [architecture.md](architecture.md) for the sim/render split.

## Simulation

- Deterministic per seed: use the seeded RNG and sim time, never `Math.random()` or `Date.now()`.
- Keep iteration and event order stable where tests or replays depend on it.
- Hot paths (AI, combat, pathfinding) avoid per-tick allocation. Check with `npm run bench`.
- Logging in hot loops goes behind a debug flag or a rate limit.

## Hygiene

- No secrets in the repo.
- To deprecate something, add a `DEPRECATED:` header and an issue with the migration path.
- New dependencies need a reason. Check the bundle (`dist/stats.html`) for runtime deps.
- Browser baseline: current Chrome/Edge. Node: see `package.json#engines`.
