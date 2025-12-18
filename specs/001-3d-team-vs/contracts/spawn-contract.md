# Spawn Contract: Robot Team Initialization (As Implemented)

**Feature**: 001-3d-team-vs  \
**Validates**: FR-001 (Robot spawning)  \
**Date**: 2025-10-06

This contract documents the current spawning behavior.

## Spawn Rules

1. **Team Size**: Each match spawns exactly 10 robots per team (20 total).
2. **Spawn Points**: Spawn points are taken from `TEAM_CONFIGS[team].spawnPoints.slice(0, 10)`.
3. **Initial Health**: All robots spawn with `health = maxHealth = 100`.
4. **Weapon Distribution**: Weapons are assigned by spawn index rotation:
   - `weapon = ["laser", "gun", "rocket"][spawnIndex % 3]`.
   - This yields a deterministic per-team distribution of 4/3/3 across the 10 spawns.
5. **Captain Election**: After spawning a team, captaincy is applied using the captain election contract.

## Notes on Determinism

`TEAM_CONFIGS` currently uses `Math.random()` to add jitter when generating spawn centers and spawn grids.
This means exact spawn coordinates can vary across page reloads, but once the app is running the spawn
points are stable within that session.

## References

- Team config and spawn points: `src/lib/teamConfig.ts`
- Spawning logic: `src/ecs/systems/spawnSystem.ts`
- Tests: `tests/spawn-system.spec.ts`
# Spawn Contract: Robot Team Initialization

**Feature**: 001-3d-team-vs  
**Validates**: FR-001 (Robot spawning)  
**Date**: 2025-10-06

## Contract Description

This contract defines the robot spawning behavior at simulation initialization. Both red and blue teams must spawn exactly 10 robots each in designated spawn zones.

## Spawn Rules

1. **Team Size**: Each team spawns exactly 10 robots
2. **Spawn Zones**: Red team spawns in red zone, blue team in blue zone
3. **Position Assignment**: Each robot gets a unique spawn point within its team's zone
4. **No Overlap**: Spawn zones must not overlap (minimum 20 units separation)
5. **Initial Health**: All robots spawn with 100 health
6. **Weapon Distribution**: Weapons randomly assigned with even distribution (3-4 of each type per team)
7. **Captain Election**: One robot per team is designated captain at spawn

## Spawn Zone Specifications

### Red Team Spawn Zone

```typescript
{
  team: "red",
  center: { x: -30, y: 0, z: 0 },
  radius: 10,
  spawnPoints: [
    { x: -35, y: 0, z: -5 },
    { x: -35, y: 0, z: 0 },
    { x: -35, y: 0, z: 5 },
    { x: -30, y: 0, z: -5 },
    { x: -30, y: 0, z: 0 },
    { x: -30, y: 0, z: 5 },
    { x: -25, y: 0, z: -5 },
    { x: -25, y: 0, z: 0 },
    { x: -25, y: 0, z: 5 },
    { x: -30, y: 0, z: -10 }
  ]
}
```

### Blue Team Spawn Zone

```typescript
{
  team: "blue",
  center: { x: 30, y: 0, z: 0 },
  radius: 10,
  spawnPoints: [
    { x: 35, y: 0, z: -5 },
    { x: 35, y: 0, z: 0 },
    { x: 35, y: 0, z: 5 },
    { x: 30, y: 0, z: -5 },
    { x: 30, y: 0, z: 0 },
    { x: 30, y: 0, z: 5 },
    { x: 25, y: 0, z: -5 },
    { x: 25, y: 0, z: 0 },
    { x: 25, y: 0, z: 5 },
    { x: 30, y: 0, z: -10 }
  ]
}
```

## Expected Behavior

### Test Case 1: Red Team Spawn

```typescript
// Input
initializeSimulation()

// Expected Output
redRobots = world.with("team").where(e => e.team === "red")
assert(redRobots.length === 10)
assert(redRobots.every(r => r.health === 100))
assert(redRobots.every(r => r.position.x < 0)) // Red side of arena
assert(redRobots.filter(r => r.isCaptain).length === 1) // Exactly one captain
```

### Test Case 2: Blue Team Spawn

```typescript
// Input
initializeSimulation()

// Expected Output
blueRobots = world.with("team").where(e => e.team === "blue")
assert(blueRobots.length === 10)
assert(blueRobots.every(r => r.health === 100))
assert(blueRobots.every(r => r.position.x > 0)) // Blue side of arena
assert(blueRobots.filter(r => r.isCaptain).length === 1) // Exactly one captain
```

### Test Case 3: Weapon Distribution

```typescript
// Input
initializeSimulation()

// Expected Output
allRobots = world.with("weaponType")
laserCount = allRobots.filter(r => r.weaponType === "laser").length
gunCount = allRobots.filter(r => r.weaponType === "gun").length
rocketCount = allRobots.filter(r => r.weaponType === "rocket").length

// Should be roughly 6-7 of each type across both teams (20 total robots)
assert(laserCount >= 6 && laserCount <= 7)
assert(gunCount >= 6 && gunCount <= 7)
assert(rocketCount >= 6 && rocketCount <= 7)
assert(laserCount + gunCount + rocketCount === 20)
```

### Test Case 4: No Spawn Overlap

```typescript
// Input
initializeSimulation()

// Expected Output
allRobots = world.with("position")
for (let i = 0; i < allRobots.length; i++) {
  for (let j = i + 1; j < allRobots.length; j++) {
    distance = calculateDistance(allRobots[i].position, allRobots[j].position)
    assert(distance > 2.0) // Minimum spacing between robots
  }
}
```

## Test Implementation Requirement

**Test File**: `tests/contracts/robot-spawning.test.ts`

**Acceptance Criteria**:
- ✅ Exactly 10 red robots spawn
- ✅ Exactly 10 blue robots spawn
- ✅ All robots spawn with 100 health
- ✅ Each team has exactly one captain
- ✅ Robots spawn within designated spawn zones
- ✅ No robots overlap at spawn
- ✅ Weapon distribution is balanced (±1 of target distribution)

---

**Status**: ✅ Contract defined, ready for test implementation (TDD)
