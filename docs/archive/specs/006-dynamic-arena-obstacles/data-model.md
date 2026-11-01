# Data Model — Dynamic Arena Obstacles (Phase 1)

Generated: 2025-12-10

This document defines the high-level ECS component shapes and runtime entities for the Dynamic Arena Obstacles feature. These are conceptual and intentionally implementation-agnostic; unit tests should verify behaviour by calling the small public APIs exposed by the simulation.

## Components (conceptual shapes)

1) DynamicObstacle

- `id` (string): unique instance id (for test assertions and telemetry).  
- `type` ("barrier" | "hazard" | "destructible")  
- `blocksVision` (boolean): whether it blocks line-of-sight when present.  
- `blocksMovement` (boolean): whether it blocks traversal/occupation.  
- `shape` (object): describes the collider shape: either `{ kind: 'box', halfWidth: number, halfDepth: number }` or `{ kind: 'circle', radius: number }`.  
- `initialTransform` (Vec3 + rotation): starting position / orientation.  
- `metadata` (object): designer-friendly metadata (displayName, debugColor, editorHints).

2) MovementPattern

- `patternType` ("linear" | "rotation" | "oscillate")  
- `points` (Vec3[]): anchor points for linear patterns (2 or more).  
- `pivot` (Vec3): pivot point for rotation patterns.  
- `speed` (number): movement speed parameter (units per second or degrees/sec).  
- `loop` (boolean): whether to loop; `pingPong` allowed for oscillation.  
- `phaseOffset` (number): initial offset in the motion cycle for deterministic placement.

3) HazardZone

- `shape` (object): same as DynamicObstacle's shape, defines area.  
- `schedule` (object): `{ periodMs: number, activeMs: number, offsetMs?: number }` — deterministic on/off cycle.  
- `effects` (array): one or more effect entries `{ kind: 'damage'|'slow'|'status', amount: number, perSecond?: boolean, durationMs?: number }`.

4) DestructibleCover

- `maxDurability` (number)  
- `durability` (number) — current durability, decremented by damage events.  
- `removalPolicy` ("permanent" | "respawn-seconds") — spec chooses `permanent` for match (FR-009).  
- `blocksVision` / `blocksMovement` flags inherited from DynamicObstacle semantics when present.

## Events & Observability

- `ObstacleState` — periodic snapshot emitted for tests: `{ id, type, position, rotation, active, durability? }`.
- `ObstacleEvent` — emitted for important changes: `obstacle:move`, `hazard:activate`, `hazard:deactivate`, `cover:damaged`, `cover:destroyed` with deterministic timestamps and frameIndex.

## Test hooks

- Deterministic tick stepping: systems must accept a tick delta and consistently update obstacle states. Tests should be able to seed `phaseOffset` and step the simulation a known number of ticks to validate obstacle positions and events.

## Example minimal JSON authoring (sample fixture)

```json
{
  "obstacles": [
    {
      "id": "barrier-a",
      "type": "barrier",
      "shape": { "kind": "box", "halfWidth": 2, "halfDepth": 0.5 },
      "blocksVision": true,
      "blocksMovement": true,
      "movementPattern": { "patternType": "linear", "points": [[-5,0,0],[5,0,0]], "speed": 1, "loop": true }
    },
    {
      "id": "hazard-x",
      "type": "hazard",
      "shape": { "kind": "circle", "radius": 3 },
      "schedule": { "periodMs": 4000, "activeMs": 1000, "offsetMs": 200 },
      "effects": [{ "kind": "damage", "amount": 6, "perSecond": true }]
    }
  ]
}
```
