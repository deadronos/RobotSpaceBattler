## Plan: Phase 3.2 — Weapon Behavior & Visuals (Spec 005)

Implement distinct weapon behaviors (rocket AoE, laser beams, gun tracers) with deterministic telemetry and placeholder React visuals for observability and replay support.

**Phases: 7 phases**

---

### Phase 1: WeaponProfile Model & Loader (T015)
**Objective:** Implement WeaponProfile data model and loader to provide runtime access to weapon configurations

**Files/Functions to Modify/Create:**
- `src/lib/weapons/WeaponProfile.ts` (new) - Profile class, registry, loader
- `src/lib/weapons/weaponProfiles.json` (new) - Sample weapon data (gun, laser, rocket)

**Tests to Write:**
- `tests/weapon/WeaponProfile.spec.ts`:
  - `should load profile from JSON data`
  - `should validate required fields`
  - `should throw on invalid archetype`
  - `should register profiles in registry`
  - `should retrieve profile by id`
  - `should return undefined for unknown profile`

**Steps:**
1. Write tests for WeaponProfile class (constructor, validation, getters)
2. Run tests (expect failures)
3. Implement WeaponProfile class with validation logic
4. Write tests for WeaponProfileRegistry (register, get, getAll)
5. Run tests (expect failures)
6. Implement registry with Map-based storage
7. Write tests for loadWeaponProfiles (JSON parsing, batch registration)
8. Run tests (expect failures)
9. Implement loader function with error handling
10. Create sample weaponProfiles.json with 3 weapon types
11. Run all tests (expect passes)
12. Run linter and format code

---

### Phase 2: Core Projectile System Enhancement (T016)
**Objective:** Enhance existing projectileSystem to support new weapon types and spawn/update patterns

**Files/Functions to Modify/Create:**
- `src/simulation/projectiles/ProjectileSystem.ts` (new) - Enhanced spawn/update logic
- `src/ecs/systems/projectileSystem.ts` (modify) - Integration point
- `src/ecs/components.ts` (modify) - Add projectile type/metadata fields

**Tests to Write:**
- `tests/simulation/projectile-system.spec.ts`:
  - `should spawn projectile with weapon profile data`
  - `should track projectile type (gun/laser/rocket)`
  - `should update gun projectile position each tick`
  - `should handle projectile expiry (distance/time)`
  - `should remove expired projectiles from world`
  - `should pass weapon metadata to hit handler`

**Steps:**
1. Write tests for enhanced spawn logic with weapon profile
2. Run tests (expect failures)
3. Add weaponProfileId and metadata fields to projectile component
4. Implement spawnProjectile function with profile integration
5. Write tests for projectile type tracking and updates
6. Run tests (expect failures)
7. Enhance updateProjectileSystem to handle new fields
8. Write tests for metadata passing to hit handler
9. Run tests (expect failures)
10. Modify existing applyHit to accept weapon metadata
11. Run all tests (expect passes)
12. Run linter and format code

---

### Phase 3: Rocket AoE System (T017)
**Objective:** Implement rocket projectile with area-of-effect damage, linear falloff, and deterministic multi-target events

**Files/Functions to Modify/Create:**
- `src/simulation/projectiles/rocket.ts` (new) - Rocket impact and AoE logic
- `src/ecs/systems/projectileSystem.ts` (modify) - Rocket hit detection integration

**Tests to Write:**
- `tests/weapon/rocket-aoe.test.ts`:
  - `should apply AoE damage to targets within radius`
  - `should calculate linear falloff correctly`
  - `should emit per-target weapon-damage events`
  - `should sort events by targetId for determinism`
  - `should use same timestampMs for all AoE targets`
  - `should not damage shooter or same team`
  - `should handle edge case: no targets in AoE`
  - `should handle edge case: target exactly at radius boundary`

**Steps:**
1. Write tests for AoE target detection within radius
2. Run tests (expect failures)
3. Implement findTargetsInRadius function
4. Write tests for linear falloff calculation
5. Run tests (expect failures)
6. Implement calculateAoEDamage with falloff formula: `max(0, 1 - distance/radius)`
7. Write tests for multi-target event emission (sorted by targetId)
8. Run tests (expect failures)
9. Implement applyRocketImpact function with event emission
10. Write tests for deterministic ordering and timestamps
11. Run tests (expect failures)
12. Integrate rocket impact handler into projectileSystem
13. Run all tests (expect passes)
14. Run linter and format code

---

### Phase 4: Laser Beam System (T018)
**Objective:** Implement laser beam with continuous damage ticks, ray casting, and per-tick telemetry

**Files/Functions to Modify/Create:**
- `src/simulation/weapons/laserBeam.ts` (new) - Beam creation, tick damage, ray intersection
- `src/ecs/components.ts` (modify) - Add beam component/entity type
- `src/ecs/systems/beamSystem.ts` (new) - Beam update system

**Tests to Write:**
- `tests/weapon/laser-beam.test.ts`:
  - `should create beam entity with duration`
  - `should calculate ray intersection with target`
  - `should apply tick damage at 60 Hz`
  - `should emit weapon-damage event per tick with frameIndex`
  - `should track beam age and remove after duration`
  - `should handle target moving during beam`
  - `should validate timing ±16ms tolerance`
  - `should not damage through obstacles (future: raycasting)`

**Steps:**
1. Write tests for beam entity creation with duration
2. Run tests (expect failures)
3. Implement createLaserBeam function and beam component
4. Write tests for ray intersection with target
5. Run tests (expect failures)
6. Implement calculateRayIntersection function
7. Write tests for tick damage at 60 Hz
8. Run tests (expect failures)
9. Implement applyBeamTickDamage with frameIndex tracking
10. Write tests for per-tick event emission with timing validation
11. Run tests (expect failures)
12. Create beamSystem for continuous update and event emission
13. Write tests for beam expiry and cleanup
14. Run tests (expect failures)
15. Integrate beam system into world update loop
16. Run all tests (expect passes)
17. Run linter and format code

---

### Phase 5: Placeholder React Visuals (T019)
**Objective:** Add React/TSX components for weapon visual effects respecting quality settings

**Files/Functions to Modify/Create:**
- `src/visuals/weapons/RocketExplosion.tsx` (new) - Rocket explosion sphere effect
- `src/visuals/weapons/LaserBeam.tsx` (new) - Laser beam cylinder/line
- `src/visuals/weapons/GunTracer.tsx` (new) - Ballistic tracer line
- `src/visuals/weapons/QualityManager.ts` (new or find existing) - VFX quality settings

**Tests to Write:**
- `tests/visuals/weapon-visuals.spec.ts`:
  - `should render RocketExplosion component`
  - `should render LaserBeam component`
  - `should render GunTracer component`
  - `should respect QualityManager low settings`
  - `should respect QualityManager high settings`
  - `should hide effects when quality is off`

**Steps:**
1. Write tests for RocketExplosion component rendering
2. Run tests (expect failures)
3. Implement RocketExplosion.tsx with basic sphere/particles
4. Write tests for LaserBeam component rendering
5. Run tests (expect failures)
6. Implement LaserBeam.tsx with line/cylinder geometry
7. Write tests for GunTracer component rendering
8. Run tests (expect failures)
9. Implement GunTracer.tsx with line renderer
10. Write tests for QualityManager integration (or identify existing)
11. Run tests (expect failures)
12. Add quality-based conditional rendering to all components
13. Run all tests (expect passes)
14. Run linter and format code

---

### Phase 6: Telemetry Integration in Damage Pipeline (T020)
**Objective:** Instrument weapon events (fired, hit, explosion-aoe, damage) in combat systems

**Files/Functions to Modify/Create:**
- `src/simulation/damage/damagePipeline.ts` (modify) - Add telemetry hooks
- `src/ecs/systems/combatSystem.ts` (modify) - Emit weapon-fired events
- `src/ecs/systems/projectileSystem.ts` (modify) - Emit weapon-hit events
- `src/simulation/projectiles/rocket.ts` (modify) - Emit explosion-aoe events

**Tests to Write:**
- `tests/telemetry/weapon-events.spec.ts`:
  - `should emit weapon-fired event on projectile spawn`
  - `should emit weapon-hit event on projectile impact`
  - `should emit explosion-aoe event on rocket impact`
  - `should emit weapon-damage event with correct fields`
  - `should include archetype in weapon-damage event`
  - `should include isAoE flag for rocket damage`
  - `should validate all required telemetry fields present`
  - `should write events to MatchTrace`

**Steps:**
1. Write tests for weapon-fired event emission in combatSystem
2. Run tests (expect failures)
3. Add telemetry.recordWeaponFired call in combat weapon fire logic
4. Write tests for weapon-hit event emission in projectileSystem
5. Run tests (expect failures)
6. Add telemetry.recordWeaponHit call in applyHit function
7. Write tests for explosion-aoe event emission in rocket.ts
8. Run tests (expect failures)
9. Add telemetry.recordExplosionAoe call in applyRocketImpact
10. Write tests for weapon-damage event with all fields
11. Run tests (expect failures)
12. Update telemetry port interface to include new event types
13. Implement event recording in aggregator and matchTrace
14. Run all tests (expect passes)
15. Run linter and format code

---

### Phase 7: Integration & Smoke Tests (T021)
**Objective:** Validate rocket AoE and laser beam behavior with deterministic ordering and timing

**Files/Functions to Modify/Create:**
- `tests/weapon/rocket-aoe.test.ts` (enhance) - Multi-target determinism
- `tests/weapon/laser-beam.test.ts` (enhance) - Timing validation ±16ms
- `tests/integration/weapon-smoke.spec.ts` (new) - End-to-end scenario

**Tests to Write:**
- `tests/weapon/rocket-aoe.test.ts` (enhanced):
  - `should emit events in deterministic order (100 runs)`
  - `should handle 5+ targets simultaneously`
  - `should validate event sequenceId consistency`
- `tests/weapon/laser-beam.test.ts` (enhanced):
  - `should validate tick timing within ±16ms (100 samples)`
  - `should track frameIndex progression`
  - `should handle beam duration edge cases`
- `tests/integration/weapon-smoke.spec.ts`:
  - `should run 1v1 duel with rocket vs laser`
  - `should capture telemetry for all weapon types`
  - `should validate visual component integration`
  - `should verify MatchTrace completeness`

**Steps:**
1. Write enhanced deterministic ordering tests for rocket AoE
2. Run tests (expect failures)
3. Fix any ordering issues found in rocket implementation
4. Write enhanced timing validation tests for laser beam
5. Run tests (expect failures)
6. Fix any timing drift issues in beam system
7. Write integration smoke test for weapon variety
8. Run tests (expect failures)
9. Integrate all systems into cohesive test scenario
10. Debug and fix any integration issues
11. Run all 36+ tests across all phases (expect passes)
12. Run full test suite (`npm test`) - expect 100% pass
13. Run linter and format entire codebase
14. Generate test coverage report (aim for >90% on new code)

---

## Open Questions

1. **QualityManager Location**: Does a QualityManager already exist, or should we create a minimal implementation for Phase 5?
2. **Beam Raycasting**: Should laser beams use true raycasting for obstacle detection, or start with simple line-of-sight for MVP?
3. **Visual Asset Integration**: Should we wire placeholder PNGs into React components immediately, or defer to art delivery?
4. **Telemetry Port Extension**: Does the existing TelemetryPort interface need extension, or can we add methods to the aggregator directly?
5. **ECS Integration Timing**: Should we resolve the existing projectile hit detection issue (from Phase 3.3 notes) before or during this phase?
