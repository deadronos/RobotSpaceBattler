# Contract: UI Adapter (simulation → UI)

This contract defines the interface that the simulation (authoritative) systems
expose to the UI layer. The goal is a thin, read-only adapter that allows the
rendering components to operate without touching authoritative logic.

## Responsibilities

- Expose snapshot-style selectors that return small, serializable view models.  
- Provide subscription hooks for transient UI events (round-start, round-end) so
  components can react without driving simulation state.  
- Guarantee that selectors are cheap and free of side-effects.

## API (synchronous selectors)

- getRoundView(): RoundView | null  
- getRobotView(robotId: string): RobotView | null  
- getActiveCamera(): CameraState  
- getBattleUiState(): BattleUiState  

## Events (pub/sub)

- onRoundStart(handler: (round: RoundView) => void) -> unsubscribe  
- onRoundEnd(handler: (round: RoundView) => void) -> unsubscribe  
- onCameraChange(handler: (camera: CameraState) => void) -> unsubscribe  

Event handlers must never mutate the underlying simulation state. They should be
used only to update ephemeral view-layer concerns (animations, transient cues).

## Error handling and expectations

- Selectors return `null` when a requested entity is not present; UI must handle
  nulls gracefully (show placeholders or hide overlays).  
- Subscriptions should be debounced/throttled by the adapter when the source
  event floods (e.g., during rapid state changes) to prevent UI stutter.  

## Schema references

See `ui-state.schema.json` for the canonical JSON schema for `BattleUiState` used
in test fixtures and E2E assertions.
