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

