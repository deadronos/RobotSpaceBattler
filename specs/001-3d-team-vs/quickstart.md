# Quickstart: 3D Team vs Team Autobattler (As Implemented)

**Feature**: 001-3d-team-vs
**Date**: 2025-10-06

## Prerequisites

```bash
npm install
```

## Run

```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/).

## Controls

- Mouse: orbit camera (OrbitControls).
- `Space`: pause/resume the match.
- `R`: reset the match immediately.
- Gear button: opens Settings modal (contains “Show Debug UI” toggle).

## What you should see

- Space-station arena with lighting and shadows.
- 10 red robots vs 10 blue robots.
- Projectiles and VFX during combat.
- Top-left status label (`#status`) updates with match phase.
- After victory, match restarts automatically after ~5 seconds.

## Debug console (optional)

`App` exposes the battle world for debugging:

```js
window.__battleWorld
```

Examples:

```js
// Count robots
window.__battleWorld.robots.entities.length

// Count alive robots per team
window.__battleWorld.robots.entities.filter((r) => r.team === 'red' && r.health > 0).length
window.__battleWorld.robots.entities.filter((r) => r.team === 'blue' && r.health > 0).length
```

## Tests

Focused unit tests that map directly to this feature:

```bash
npx vitest tests/spawn-system.spec.ts
npx vitest tests/captain-election.spec.ts
npx vitest tests/runtime/matchStateMachine.spec.ts
npx vitest tests/runtime/battleRunner.spec.ts
npx vitest tests/ui/AppShortcuts.test.tsx
```
