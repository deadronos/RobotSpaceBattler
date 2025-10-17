# Data Model

This document captures the primary entities and shapes for the `003-extend-placeholder-create` feature.

Entities

- MatchTrace
  - rngSeed: integer
  - events: array of Event

- Event (union)
  - type: spawn|move|fire|hit|damage|death|score
  - timestampMs: integer (ms since match start)
  - frameIndex: integer (optional)
  - sequenceId: integer (tie-breaker)
  - payload fields vary by type (see schemas)

- Team
  - id: string
  - name: string
  - units: Unit[]
  - spawnPoints: SpawnPoint[]

- Unit
  - id: string
  - modelRef: string
  - teamId: string
  - maxHealth: number
  - weapons: array
  - isCaptain: boolean

Notes: See JSON schemas in `specs/003-extend-placeholder-create/schemas/` for validation rules.
