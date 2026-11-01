# Testing and benchmarks

## Layout

- Unit and integration tests: `tests/` (mirrors `src/`). Cross-system scenarios go in
  `tests/integration/`.
- E2E: `playwright/tests/`. Output (screenshots, traces) goes to `test-results/`, which is gitignored.
- Fixtures: `tests/helpers/`. The sample obstacle fixture lives at
  `src/simulation/match/fixtures/dynamic-arena-sample.json`, because the app imports it too.

## Vitest

- Two projects in `vitest.config.ts`: `node` for pure simulation and `jsdom` for `*.tsx`,
  `tests/ui/` and `tests/visuals/`. Add DOM-dependent `.ts` tests to `DOM_TESTS`.
- Coverage thresholds live in `vitest.config.ts` and must not be lowered.
- Tests must not depend on order or shared mutable state.
- The simulation is deterministic per seed. Prefer seeded headless-match tests
  (see `tests/determinism.spec.ts`) over timing-based ones.

## Commands

| Command | Use |
|---|---|
| `npm test` | All Vitest tests |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | With coverage (what CI runs) |
| `npm run playwright:preview` | Smoke + pathfinding-worker e2e on a production build (what CI runs) |
| `npm run playwright:test` | All e2e specs against the dev server |
| `npm run bench` | AI tick time and allocation benchmark |
| `npm run perf:vfx-instancing` | Draw-call measurement |

## Performance

- Pathfinding: < 16 ms per tick for 20 robots.
- For real-GPU numbers (#206), use headed Chrome with `--use-angle=metal` and without
  Playwright's `--enable-unsafe-swiftshader`. Software GL in CI is not representative.
