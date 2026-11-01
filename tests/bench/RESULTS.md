# AI scaling benchmark results (#171)

Headless micro-benchmark of one AI tick plus one combat tick at 20 / 100 / 200
robots. Run it with `npm run bench` (`scripts/perf/ai-bench.js`, which runs
`tests/bench/aiScale.bench.spec.ts` with `RUN_BENCH=1`; under `npm test` the
same file is only a short smoke run).

- Scenario: `tests/helpers/aiScenario.ts` (deterministic two-team roster spread
  over the arena, mixed roles, captains, scripted damage, robots move).
- Time: median / p95 of AI + combat milliseconds per tick over 600 ticks after
  150 warm-up ticks.
- Allocation: bytes allocated per tick (garbage included) estimated with the V8
  sampling heap profiler over 300 ticks after warm-up. AI is measured with
  movement integration only; combat is reported per fired shot with every robot
  firing each tick.
- Machine: Apple Silicon Mac, Node 26. Numbers are indicative; compare
  before/after on the same machine.

## Before (all-pairs scan, commit 42d75e6)

| robots | median ms/tick | p95 ms/tick | AI KB/tick | combat B/shot |
| -----: | -------------: | ----------: | ---------: | ------------: |
|     20 |          0.054 |       0.086 |        197 |          2603 |
|    100 |          1.062 |       1.196 |       3088 |          1954 |
|    200 |          3.835 |       4.104 |      11537 |          1735 |

## After (uniform grid, scratch buffers)

| robots | median ms/tick | p95 ms/tick | AI KB/tick | combat B/shot |
| -----: | -------------: | ----------: | ---------: | ------------: |
|     20 |          0.048 |       0.065 |         55 |          1916 |
|    100 |          0.844 |       0.927 |        331 |          1364 |
|    200 |          3.016 |       3.270 |        854 |          1254 |

AI allocation per tick drops by about 72% at 20 robots, 89% at 100 and 93% at 200. Time per tick drops by 11% / 21% / 21%.

## What is left

- Remaining time at 100-200 robots is dominated by line-of-sight checks between
  robot pairs that are actually in sensor range (about 40% of the arena at a
  38 unit range), and by movement planning. The grid removes the all-pairs
  candidate scan and the allocations, but cannot reduce the number of in-range
  LOS checks.
- Remaining AI allocation comes mostly from `planRobotMovement` and its helpers
  in `src/simulation/ai/pathing/` (functional vector maths), the per-tick
  `computeTeamAnchors`, and boxed numbers at call boundaries. These were left
  alone to keep this change focused and to avoid conflicts with the
  pathfinding work in flight.
- Combat per-shot allocation that remains is the projectile id string and the
  ECS add/remove bookkeeping (miniplex, instance manager); the vector
  temporaries were removed.
