# Data Model: 3D simulation fight graphics

This document captures the canonical entities and view-models consumed by the
battle UI. Types are expressed as TypeScript interfaces to make them directly
useful for implementation and tests.

## Entities / View Models

### Round (UI-facing view)

```ts
export interface RoundView {
  id: string;
  status: 'initializing' | 'running' | 'ending' | 'finished';
  startTime: number | null; // epoch ms
  endTime: number | null; // epoch ms
  map?: string;
  rules?: Record<string, any>;
  // Expected number of robots participating in this round (helps UI/layout decisions)
  expectedRobotCountRange?: { min: number; max: number };
}
```

Validation rules: `status` must be a listed enum; `startTime` non-null when `running`.

### Robot (UI-facing snapshot)

```ts
export interface RobotView {
  id: string;
  name?: string;
  team: string; // Team enum in game
  currentHealth: number; // 0..max
  maxHealth?: number;
  statusFlags: string[]; // e.g., ['stunned','overheated']
  currentTarget?: string | null; // target robot id
  isCaptain?: boolean;
}
```

Validation rules: `currentHealth` >= 0 and <= `maxHealth` (if provided).

### CameraState

```ts
export interface CameraState {
  mode: 'follow' | 'cinematic' | 'free';
  targetEntityId?: string | null;
  interpolationMs?: number; // smoothing duration
}
```

### UIState (battle-focused subset)

```ts
export interface BattleUiState {
  inRound: boolean;
  activeUI: 'battle' | 'lobby' | 'summary';
  userPreferences: {
    reducedMotion: boolean;
    minimalUi: boolean;
    followModeShowsPerRobot: boolean;
  };
  lastToggleTime: number | null;
}
```

## State Transitions

- Lobby -> Round Start: `inRound` transitions from false -> true, `activeUI` becomes `battle`.  
- Round End: `inRound` true -> false, `activeUI` becomes `summary`.  
- UI Toggle: `minimalUi` toggles without changing authoritative simulation state.  

Transitions must be idempotent: applying the same transition twice is a no-op.

## Selector Contracts (summary)

- `getRoundView(): RoundView | null`  
- `getRobotView(robotId: string): RobotView | null`  
- `getActiveCamera(): CameraState`  
- `getBattleUiState(): BattleUiState`

These selectors are pure, synchronous, and cheap to call from render code — heavy
computations should be pre-computed by systems and stored in snapshot objects.
