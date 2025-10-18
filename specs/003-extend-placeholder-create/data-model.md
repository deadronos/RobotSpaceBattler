# Data Model — 3D Team Fight (canonical entities)

This document captures canonical entities and fields used by the feature and the contract validator.

## Team

- id: string (unique team identifier)
- name: string
- units: array of `Unit` ids or objects
- spawnPoints: array of `spawnPointId` strings

Validation notes: `units` may be full objects or references depending on caller; contract validator accepts either but ensures required fields on unit objects.

## Unit / Robot

- id: string
- modelRef: string (asset identifier/path)
- teamId: string (reference to Team.id)
- maxHealth: number
- currentHealth: number (optional in definitions; required in MatchTrace events)
- weapons: array of weapon descriptors
- isCaptain: boolean (optional)

## Spawn Event / Spawn Contract

- spawnPointId: string
- entityId: string
- teamId: string
- initialTransform: { position: {x,y,z}, rotation: {x,y,z}, scale?: {x,y,z} }

## Scoring Event

- teamId: string
- scoreDelta: number
- eventType: string (enum e.g., 'kill', 'objective')

## MatchTrace (event stream)

Each event MUST include:

- type: string (spawn|move|fire|hit|damage|death|score)
- timestampMs: integer (ms since match start, monotonic)
- sequenceId: integer (optional, for tie-breaking)

Event-specific payloads described in `schemas/matchtrace.schema.json`.
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
