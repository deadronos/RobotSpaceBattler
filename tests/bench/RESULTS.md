# AI scaling benchmark results (#171, #201)

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

## After phase 2 (#201, allocation-free planning and cheaper LOS)

| robots | median ms/tick | p95 ms/tick | AI KB/tick | combat B/shot |
| -----: | -------------: | ----------: | ---------: | ------------: |
|     20 |          0.026 |       0.044 |        7.3 |          1930 |
|    100 |          0.454 |       0.501 |       36.3 |          1328 |
|    200 |          1.699 |       1.809 |      147.0 |          1254 |

Relative to the #171 grid baseline that is another 46% / 46% / 44% less time
per tick and 87% / 89% / 83% less allocation, so AI allocation at 100 robots is
now ~36 KB/tick (target: below 50 KB/tick). Relative to the original all-pairs
scan, time is 52% / 57% / 56% lower and allocation 96% / 99% / 99% lower.

What changed:

- `planRobotMovement` and its helpers (`src/simulation/ai/pathing/`) compute
  with in-place scratch vectors, a reused desire array and `blendRange`, and
  write the final velocity straight into the robot's own vector. The per-robot
  `context.obstacles.filter(...)` copies are gone.
- `computeTeamAnchors` reuses its assignment objects, anchor vectors, rosters
  and directive/centroid scratch state, and sorts each roster in place.
- Static line of sight (walls and pillars) goes through a cell index
  (`staticOcclusionIndex.ts`) that only tests shapes in the cells a segment
  actually crosses: ~4x cheaper per check and allocation free.
- `buildNeighbors` walks the grid's team list instead of running a second grid
  query per robot, and the sensor/targeting path uses `SpatialGrid.queryInto`
  with explicit counts so result buffers are not resized (and reallocated)
  every tick.

## What is left

- Remaining time is dominated by line-of-sight checks between robot pairs that
  are actually in sensor range (about 40% of the arena at a 38 unit range).
  Every pair is still tested twice per tick (once from each side); a per-tick
  pair cache could halve that, at the cost of threading pair identity through
  the sensor calls.
- Remaining AI allocation is boxed doubles at call boundaries plus
  `robot.pathComponent.requestedTarget`, which is a fresh `{ x, y, z }` object
  whenever the nav target moves (the pathfinding system keeps references to the
  requested target while a request is in flight).
- Combat per-shot allocation that remains is the projectile id string and the
  ECS add/remove bookkeeping (miniplex, instance manager); the vector
  temporaries were removed.
