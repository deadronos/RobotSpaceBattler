# Quickstart: 3D Team vs Team Autobattler

**Feature**: 001-3d-team-vs  
**Date**: 2025-10-06  
**Purpose**: Validate feature implementation and demonstrate core flows

## Prerequisites

```bash
# Ensure dependencies installed
npm install

# Verify build tools
npx vite --version
npx vitest --version
```

## Running the Simulation

### Development Mode

```bash
# Start development server
npm run dev

# Expected output:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

Open browser to `http://localhost:5173/`

**Expected Initial State**:
- Arena renders with space-station environment
- 10 red robots spawn on left side
- 10 blue robots spawn on right side
- Directional lighting with shadows enabled
- Free camera controls active (mouse drag to orbit)

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Expected: Optimized bundle, same behavior as dev
```

## Contract Test Validation

### Test 1: Robot Spawning (FR-001)

```bash
# Run spawn contract test
npx vitest tests/contracts/robot-spawning.test.ts

# Expected output:
# ✓ spawns exactly 10 red robots
# ✓ spawns exactly 10 blue robots  
# ✓ all robots start with 100 health
# ✓ each team has exactly one captain
# ✓ robots spawn in designated zones
# ✓ no spawn position overlaps
# ✓ weapon distribution is balanced

# All tests should PASS
```

**Manual Validation**:
1. Open dev tools console
2. Inspect ECS world: `window.__ecsWorld.with("team").entities`
3. Verify count: 20 robots total (10 red, 10 blue)
4. Verify positions: red robots x < 0, blue robots x > 0

---

### Test 2: Weapon Balance (FR-003)

```bash
# Run weapon balance contract test
npx vitest tests/contracts/weapon-balance.test.ts

# NOTE: Canonical base damage values and multipliers are defined in the
# scoring contract at
# `specs/001-3d-team-vs/contracts/scoring-contract.md`. The contract is the
# source of truth; tests and implementations should reference it rather than
# duplicating numeric values in docs.
# Expected output (validate per scoring contract):
# ✓ All 9 matchup scenarios validate the multipliers defined in the contract
# ✓ Multipliers (advantage/disadvantage/neutral) match the contract
# ✓ All damage values computed from the canonical base damage are positive

# All tests should PASS
```

**Manual Validation**:
1. Let simulation run for 10 seconds
2. Observe combat: projectiles fire, robots take damage
3. Open stats screen (after battle ends)
4. Verify damage dealt numbers are non-zero
5. Check that some matchups deal more damage than others

---

### Test 3: AI Behavior (FR-002)

```bash
# Run AI behavior integration test
npx vitest tests/integration/ai-behavior.test.ts

# Expected output:
# ✓ robots autonomously select targets
# ✓ robots move toward enemies
# ✓ robots fire weapons when in range
# ✓ robots seek cover when damaged
# ✓ low-health robots retreat
# ✓ captain coordinates team formation
# ✓ captain calls priority targets
# ✓ captain reassigns on death
# ✓ adaptive strategy switches tactics

# All tests should PASS
```

**Manual Validation**:
1. Observe robot movement: should not be static
2. Robots should face enemies before firing
3. Damaged robots should move to cover (obstacles)
4. Captain should have visual indicator (glow/outline)
5. When captain dies, another robot becomes captain immediately

---

### Test 4: Victory Flow (FR-006)

```bash
# Run victory flow integration test
npx vitest tests/integration/victory-flow.test.ts

# Expected output:
# ✓ detects when one team eliminated
# ✓ displays victory screen with winner
# ✓ shows 5-second countdown timer
# ✓ countdown can be paused
# ✓ countdown can be reset
# ✓ Stats button opens stats screen
# ✓ stats screen shows per-robot metrics
# ✓ settings button allows team composition changes
# ✓ auto-restart after countdown completes

# All tests should PASS
```

**Manual Validation**:
1. Let battle run to completion (2-5 minutes)
2. Victory screen should appear when one team fully eliminated
3. Countdown should start at 5 seconds
4. Click "Stats" button → stats screen opens
5. Verify stats show: kills, damage dealt, damage taken, time alive
6. Click pause icon → countdown pauses
7. Let countdown reach 0 → simulation resets automatically
8. New battle starts with fresh robots

---

## Integration Test Validation

### Test 5: Physics Sync (FR-012)

```bash
# Run physics integration test
npx vitest tests/integration/physics-sync.test.ts

# Expected output:
# ✓ ECS positions sync with Rapier physics
# ✓ projectile trajectories follow physics
# ✓ collisions trigger damage events
# ✓ eliminated robots removed from physics world
# ✓ position updates every frame
# ✓ no desync between rendering and physics

# All tests should PASS
```

**Manual Validation**:
1. Open dev tools console
2. Log robot positions: `console.log(world.with("position").entities.map(e => e.position))`
3. Positions should update smoothly each frame
4. Projectiles should travel in straight lines
5. Collisions should look accurate (no pass-through)

---

### Test 6: Performance (FR-010, FR-021-023)

> See `specs/001-3d-team-vs/contracts/performance-contract.md` for the formal test environment, device profiles, and measurement method (warmup, sampling, rolling-average windows, and pass/fail criteria).

```bash
# Run performance test
npx vitest tests/integration/performance.test.ts

# Expected output:
# ✓ maintains 60 fps with 20 robots + shadows
# ✓ quality scaling activates below 30 fps
# ✓ shadows disabled when quality scaling active
# ✓ time scale reduces when FPS critically low
# ✓ performance warning overlay displays
# ✓ user can disable auto-scaling

# All tests should PASS
```

**Manual Validation**:
1. Open browser performance monitor (Shift+Ctrl+P → Show Rendering → Frame Rendering Stats)
2. Verify FPS > 60 initially
3. (Optional) Throttle CPU to simulate low-end hardware
4. If FPS drops below 30: warning overlay should appear
5. Shadows should disable automatically (arena looks flatter)
6. Open settings → verify "Auto Quality Scaling" toggle

---

## Camera System Validation

### Free Camera Mode (FR-013)

**Mouse Controls**:
1. Click and drag → orbit camera around arena
2. Scroll wheel → zoom in/out
3. Right-click drag → pan camera

**Keyboard Controls**:
1. Arrow keys → rotate camera
2. W/S keys → zoom in/out
3. A/D keys → strafe left/right

**Touch Controls** (mobile/tablet):
1. Single finger drag → orbit
2. Pinch gesture → zoom
3. Two-finger drag → pan

**Expected**: Smooth, responsive camera movement with no jitter

---

### Cinematic Mode (FR-013)

1. Press "C" key or click "Cinematic" button
2. Camera should auto-follow nearest combat
3. Smooth transitions between action hotspots
4. Press "C" again to exit cinematic mode

**Expected**: Camera automatically tracks most intense combat areas

---

## E2E Validation (Manual)

### Full Battle Flow

```bash
# Run Playwright E2E test (manual execution)
npx playwright test playwright/tests/e2e-simulation.spec.ts --headed

# Expected: Browser opens, simulation runs, battle completes, auto-restarts
```

**Or run manually**:
1. Open http://localhost:5173/
2. Observe full battle from spawn to victory
3. Verify all core features working:
   - ✅ 20 robots spawn
   - ✅ Autonomous movement and combat
   - ✅ Projectiles fire and hit targets
   - ✅ Damage reduces robot health
   - ✅ Robots eliminated when health = 0
   - ✅ Captain indicators visible
   - ✅ Victory screen appears
   - ✅ Stats button works
   - ✅ Auto-restart countdown
   - ✅ Simulation resets and repeats

**Typical Battle Duration**: 2-5 minutes (varies based on AI and weapon distribution)

---

## Troubleshooting

### Robots Don't Spawn

**Check**:
```bash
# Verify ECS world initialized
console.log(window.__ecsWorld)

# Check spawn system
console.log(world.with("team").entities.length) // Should be 20
```

**Fix**: Ensure spawnSystem runs in App.tsx initialization

---

### No Projectiles Appearing

**Check**:
```bash
# Verify projectile entities
console.log(world.with("projectile").entities.length)
```

**Fix**: Check weaponSystem fireWeapon() logic, ensure projectiles created on fire

---

### Camera Not Responding

**Check**: Browser console for errors
**Fix**: Verify useCameraControls hook is active, check for event listener conflicts

---

### Performance Issues (< 30 FPS)

**Check**:
```bash
# Check entity counts
console.log("Robots:", world.with("robot").entities.length)
console.log("Projectiles:", world.with("projectile").entities.length)
```

**Fix**:
- Reduce shadow quality in settings
- Enable performance mode (auto quality scaling)
- Check for projectile cleanup (despawn after collision/distance)

---

## Success Criteria

Feature is considered validated when:

- ✅ All contract tests pass
- ✅ All integration tests pass
- ✅ Manual validation steps complete successfully
- ✅ FPS maintains > 60 in normal conditions
- ✅ FPS stays > 30 with quality scaling active
- ✅ Full battle flow works end-to-end
- ✅ Auto-restart functions correctly
- ✅ Camera controls respond smoothly
- ✅ No console errors during normal operation

---

**Status**: ✅ Quickstart guide complete, ready for implementation execution
