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
  (see `tests/determinism.spec.ts`) over timing-based ones. `runHeadlessMatch`
  (`tests/helpers/headlessMatch.ts`) accepts `pauseAtStep`/`pauseSteps` to prove that a
  pause cannot change a match digest.
- `runHeadlessMatchAtSpeed` (`tests/helpers/speedMatch.ts`) drives `runner.advance`, so
  the accumulator and substep cap are exercised like the render loop. Use it to prove a
  digest is independent of the simulation speed and of the frame chunking (#170).

## Commands

| Command                       | Use                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                    | All Vitest tests                                                                                                                                                                                                                                                                                  |
| `npm run test:watch`          | Watch mode                                                                                                                                                                                                                                                                                        |
| `npm run test:coverage`       | With coverage (what CI runs)                                                                                                                                                                                                                                                                      |
| `npm run playwright:preview`  | Smoke + pathfinding-worker + accessibility e2e on a production build (what CI runs)                                                                                                                                                                                                               |
| `npm run playwright:test`     | All e2e specs against the dev server                                                                                                                                                                                                                                                              |
| `npm run bench`               | AI tick time and allocation benchmark                                                                                                                                                                                                                                                             |
| `npm run perf:vfx-instancing` | Draw-call measurement (instanced vs fallback VFX)                                                                                                                                                                                                                                                 |
| `npm run perf:visuals`        | Real-GPU visual harness: M1 draw calls, M2 draw calls vs robot count, M3 frame time, M4 console, M5 screenshot, M6 bundle, M7 AI bench (#168), and the opt-in M8 scene breakdown (`--breakdown`: lights by type, meshes grouped by material/triangles/instances, programs, ms inside `gl.render`) |

## Accessibility checks

- `playwright/tests/a11y.spec.ts` runs `@axe-core/playwright` against the live
  battle and the Settings dialog with the WCAG 2.0/2.1 A/AA tags. Serious and
  critical violations fail the test; check the assertion output for the rule id
  and offending selector.
- The same spec proves the Settings dialog traps and restores focus, that the
  preferences survive a reload (via `page.emulateMedia({ reducedMotion })`), that
  arrow keys move the camera, and that the speed control plus the match-end
  overlay/summary are keyboard-operable and axe-clean. The match end is forced
  through `?debug`'s `window.__battleWorld` (zero the blue team's health).
- Vitest covers the pure parts: palette resolution, the reduced-motion budget,
  camera maths and per-team marker collection.

## Performance

- Pathfinding: < 16 ms per tick for 20 robots.
- For real-GPU numbers (#206), use headed Chrome with `--use-angle=metal` and without
  Playwright's `--enable-unsafe-swiftshader`. Software GL in CI is not representative.
  `scripts/perf/measure-visuals.js` does this for you: it prints
  `UNMASKED_RENDERER_WEBGL`, runs a vsync and an uncapped pass, and writes
  `test-results/visuals/<label>.{json,md}` plus a mid-match screenshot. Run it
  before and after a visual change (`npm run perf:visuals -- --label=<step>`).
