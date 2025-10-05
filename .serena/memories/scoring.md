Scoring subsystem — summary

Location & entrypoint:
- `src/systems/ScoringSystem.ts` — exported function `scoringSystem(params: ScoringSystemParams)`.

Responsibilities:
- Consume death/audit events and compute classification and score deltas per death.
- Classify each death into `opponent`, `suicide`, or `friendly-fire` and determine `scoreDelta` accordingly:
  - opponent -> +1
  - suicide -> -1
  - friendly-fire -> -1
  - environmental/no killer -> 0
- Apply score updates either to an injected `scoreBoard` (useful for tests) or to the global scoreboard helpers via `incrementScore`.
- Append deterministic entries to `runtimeEventLog` for observability and audits. Deterministic IDs are created via an optional `idFactory` or by a fallback deterministic scheme.

Inputs and constraints:
- Accepts `deathEvents` (array of death/audit-like objects) and a `stepContext` for `simNowMs` and `frameCount`.
- Uses `idFactory` when available to create deterministic audit ids; otherwise uses frame/time-based deterministic fallback.

Design notes / constraints:
- Keeps scoring logic focused and small; prefers injected dependencies (`scoreBoard`, `runtimeEventLog`) for deterministic testing.
- Team detection uses `isTeam()` helper; scoring updates should operate on team keys, and tests should inject a `scoreBoard` when asserting precise outcomes.

Files to inspect for related behavior:
- Where death events are produced: systems such as `damageSystem` and `projectileSystem`.
- Scoreboard helpers and store: `src/ecs/scoreBoard.ts` or `src/ecs/*` (see `incrementScore` implementation locations).
