# Phase 5 Complete: Wire Rapier World to BattleRunner

Added optional rapierWorld field to BattleWorld and setter/getter methods to
BattleRunner so the React-side physics world can be passed into the simulation.

## Files created/changed

- `src/simulation/world.ts` [MODIFY]
- `src/simulation/battleRunner.ts` [MODIFY]
- `tests/runtime/battleRunner.spec.ts` [NEW]

## Functions created/changed

- `BattleWorld.rapierWorld` - optional field for Rapier physics world reference
- `BattleRunner.setRapierWorld(world)` - stores or clears the world reference
- `BattleRunner.getRapierWorld()` - returns the stored world reference

## Tests created/changed

- 4 tests for rapierWorld getter/setter functionality
- Verified null handling clears reference correctly

## Review Status

APPROVED (after type assertion fix)

## Git Commit Message

```text
feat: wire Rapier world reference to BattleRunner

- Add rapierWorld field to BattleWorld interface
- Add setRapierWorld() and getRapierWorld() to BattleRunner
- Use type-only imports to avoid bundling Rapier WASM
- Add unit tests for world reference management
```
