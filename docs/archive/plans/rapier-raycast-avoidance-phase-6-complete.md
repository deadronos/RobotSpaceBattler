# Phase 6 Complete: Connect Rapier from Simulation Component

Connected the Rapier physics world from React context to BattleRunner so
the simulation can use it for raycasting.

## Files created/changed

- `src/components/Simulation.tsx` [MODIFY]

## Functions created/changed

- Added `useRapier()` hook call in SimulationInner component
- Added `useEffect` to pass Rapier world to runner.setRapierWorld()
- Added cleanup function to clear world reference on unmount

## Tests created/changed

- No new tests (React hooks with Rapier are difficult to unit test)
- Manual verification approach documented

## Review Status

APPROVED

## Git Commit Message

```text
feat: connect Rapier world from React context to BattleRunner

- Add useRapier() hook to get physics world reference
- Add useEffect to pass world to runner.setRapierWorld()
- Add cleanup to clear world reference on unmount
```
