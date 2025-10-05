# Respawn System Contract

Input: DeathEvent(s) and StepContext.simNowMs

Behavior (RespawnSystem):

- Accept DeathEvent(s) and StepContext.simNowMs (required).

- Queue respawn requests into a spawn queue per spawn zone.

- Compute respawnAtMs = simNowMs + respawnDelayMs (default: 5000).

- When respawning, create SpawnEvent with fields:
  - entityId: string
  - spawnPosition: {x,y,z}
  - team: string|number
  - invulnerableUntil: simNowMs + invulnerabilityMs (default 2000)

- Ensure the spawn queue enforces a maximum spawn rate per zone to avoid overcrowding.

- Output: SpawnEvent(s) produced at or after their respawnAtMs.

Deterministic guarantees:

- All timings and scheduling must use StepContext.simNowMs.

- Randomized spawn position offsets must use StepContext.rng.
