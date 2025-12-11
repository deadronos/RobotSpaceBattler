# Feature Specification: Weapon Diversity

> **Physics Scale Reference**: See [006-dynamic-arena-obstacles/spec.md](../006-dynamic-arena-obstacles/spec.md#physics-scale--collider-design-decisions-2025-12-10) for world unit scale (1:1 meters) and collider sizing decisions. — 10v10 Simulation (Observer)

**Feature Branch**: `005-weapon-diversity`
**Created**: 2025-11-12
**Status**: Draft
**Input**: Update request: "Incorporate specs 001–004; run 10 vs 10 fight simulation with player as observer; implement rock-paper-scissors weapon bonuses; make rockets and lasers visually distinct (AoE explosions, beams/particles)."

## Summary & Context

This spec updates and expands `specs/005-weapon-diversity` to: (a) explicitly reflect the project's 10 vs 10 team simulation established in `specs/001-3d-team-vs`, (b) follow the renderer and UI guidance from `specs/002-3d-simulation-graphics`, (c) respect deterministic replay and simulation/renderer decoupling in `specs/003-extend-placeholder-create`, and (d) assume the improved AI roaming/wall-awareness behaviours from `specs/004-ai-roaming-wall-awareness` are active.

High-level goals:
- Run a 10 (red) vs 10 (blue) automated fight where the human is an observer (no active player control).
- Introduce weapon diversity (guns, lasers, rockets) with rock-paper-scissors balance already scoped in `specs/001` and explicit, testable multipliers here.
- Provide distinct visuals and particle effects: rockets produce projectile trails and AoE particle explosions on impact; lasers produce visible beam/tracer and connected particle/spark effects; guns have distinct ballistic tracers/impacts.
- Ensure telemetry, test harnesses, and performance scaling are available to validate balance and visuals without leaking implementation details.

Related specs:
- `specs/001-3d-team-vs/spec.md` — 10 vs 10 spawn, captain election, ECS architecture, high-level simulation requirements.
- `specs/002-3d-simulation-graphics/spec.md` — in-round UI, camera modes, quality-scaling and VFX guidance.
- `specs/003-extend-placeholder-create/spec.md` — deterministic MatchTrace and replay/contracts guidance.
- `specs/004-ai-roaming-wall-awareness/spec.md` — AI behaviour assumptions (roaming, obstacle avoidance).

## Clarifications

### Session 2025-11-12

- Q: Preferred telemetry/reporting model for test harnesses and authoritative replay? → A: D (MatchTrace file + in-memory aggregator)
- Q: How should rock-paper-scissors (RPS) bonuses be applied? → A: A (Damage only — multiplicative on baseDamage before resistances)

### Session 2025-11-13

- Q: Preferred telemetry timestamp semantics? → A: A (`timestampMs` = milliseconds since match start; integer ms; include optional `frameIndex` for deterministic ordering)

## Objective

Deliver a validated weapon-diversity feature for the 10v10 observer simulation that:
- Implements rock-paper-scissors weapon interactions consistent with `specs/001` (Laser > Gun, Gun > Rocket, Rocket > Laser).
- Adds clearly distinguishable visual and audio cues for each archetype, emphasizing rocket AoE explosions and laser beams/particles.
- Provides measurable acceptance tests and telemetry to validate balance and visual correctness.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Watch a 10v10 automated match (Priority: P1)

As an observer, I want to start or join a 10 vs 10 automated match so I can watch the full round without controlling any robots.

Why: Primary demonstration and evaluation flow for the simulation and new weapons.

Independent Test: Start a match using the simulation UI; observe two teams of 10 robots spawn, fight, and a winner declared; verify the spectator camera and in-round UI behave per `specs/002`.

Acceptance Scenarios:
1. Given the match is configured for 10v10, When the match starts, Then 10 red and 10 blue robots spawn in their designated zones and engage autonomously.
2. Given an observer is connected, When the match runs, Then the observer cannot control robots and may toggle camera modes (free, follow, cinematic) while match continues.

---

### User Story 2 — Observe distinct weapon behaviour & visuals (Priority: P1)

As an observer, I want rockets to show projectile trails and AoE explosions and lasers to show beams/sustained hit VFX so I can easily distinguish archetypes in combat.

Independent Test: Run a match with representative weapon usage and capture a ~30s clip; verify rocket impacts show explosion VFX and damage radius, lasers show visible beam/tracer and persistent hit particles, guns show ballistic tracers and impact sparks.

Acceptance Scenarios:
1. Rocket projectile collisions produce an explosion particle effect and an area-of-effect damage application visible in the log and via damage markers.
2. Laser firings produce a visible continuous beam/tracer between attacker and target for the duration of firing and spark/impact VFX at the contact point.

---

### User Story 3 — Balance validation & rock-paper-scissors tests (Priority: P1)

As a designer, I want automated 1v1 and small-scale tests that verify the declared RPS relations (Laser > Gun, Gun > Rocket, Rocket > Laser) and numeric multipliers are producing expected outcomes so I can tune values.

Independent Test: Execute an automated matrix of controlled 1v1 duels (each pair repeated N times) and aggregate win/damage rates to assert expected dominance.

Acceptance Scenarios:
1. For each weapon pairing, run at least 30 repeated duels with identical starting health and environment; the weapon with declared advantage wins ≥ 70% of trials (initial tuning target).

---

### Edge Cases

- If multiple robots are within a rocket's AoE, apply deterministic damage ordering and avoid double-applying per-robot events in the same frame.
- Laser beams that cross geometry should apply hit detection using the same authoritative rules used by projectiles to keep replay deterministic.
- If visual VFX fail to load, placeholder simple geometry/particle markers must show so the observer still perceives weapon type.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (10v10 Simulation)**: The system MUST run a fully automated 10 vs 10 match (10 red, 10 blue) as the canonical supported simulation size. Acceptance: a match runs from spawn to winner declaration with 20 active robots and no human pilot input required.

- **FR-002 (Observer Mode)**: The human user by default is an observer; observer controls are limited to camera and UI toggles (no movement or weapon control of robots). Acceptance: Observer cannot issue robot control commands; camera toggles function while simulation runs.

- **FR-003 (RPS Balance)**: The system MUST implement rock-paper-scissors relations consistent with `specs/001`: Laser beats Gun, Gun beats Rocket, Rocket beats Laser. Acceptance: Controlled duel tests (see Acceptance Tests) show the declared advantage yields the expected dominance (see testing thresholds).
 - **FR-003 (RPS Balance)**: The system MUST implement rock-paper-scissors relations consistent with `specs/001`: Laser beats Gun, Gun beats Rocket, Rocket beats Laser. The RPS advantage is applied as a damage-only modifier (see FR-004) — it does not alter accuracy, rate-of-fire, or other weapon stats. Acceptance: Controlled duel tests (see Acceptance Tests) show the declared advantage yields the expected dominance (see testing thresholds).

- **FR-004 (Balance Multipliers — Designer-tunable defaults)**: The feature MUST expose design-level multipliers for inter-archetype bonuses. Suggested initial defaults (tunable):
  - Advantage multiplier: +25% damage when attacker archetype has advantage vs defender's archetype.
  - Disadvantage multiplier: −15% damage when attacker archetype is disadvantaged.
  - These numeric defaults are design guidance; acceptance relies on testable outcomes, not fixed values.
 - **FR-004 (Balance Multipliers — Designer-tunable defaults)**: The feature MUST expose design-level multipliers for inter-archetype bonuses and apply them as multiplicative damage modifiers to the weapon's `baseDamage` prior to any resistances or additional modifiers. Suggested initial defaults (tunable):
  - Advantage multiplier: `1.25` (i.e., +25% damage) when attacker archetype has advantage vs defender's archetype.
  - Disadvantage multiplier: `0.85` (i.e., −15% damage) when attacker archetype is disadvantaged.
  - Application rules: the engine SHOULD compute `finalDamage = baseDamage * archetypeMultiplier * otherModifiers` where `archetypeMultiplier` is selected from `{1.25, 0.85, 1.0}` depending on attacker/defender archetype relationship. These multipliers are damage-only and do not change hit probability, rate-of-fire, or projectile behavior. These numeric defaults are design guidance; acceptance relies on testable outcomes, not fixed values.

- **FR-005 (Weapon Visuals & Audio)**: Each archetype MUST have distinct HUD icon, in-world pickup model, firing SFX, and projectile/impact VFX. Acceptance: Design review and blind recognizability test pass targets (see Success Criteria).

- **FR-006 (Rocket AoE & Explosion)**: Rocket projectiles MUST produce a visible explosion VFX and apply area-of-effect damage with a defined radius and falloff profile. Acceptance: Rocket impacts create explosion events with AoE damage logged and visible on debug overlays.

- **FR-007 (Laser Beam & Sustained Damage)**: Laser weapons MUST present a visible beam/tracer for the duration of firing and may apply instantaneous or ticked damage along beam contacts; acceptance: beam visuals align with hit events in MatchTrace and damage logs.

- **FR-008 (Gun Ballistics / Tracers)**: Gun archetype MUST present high-rate ballistic fire with visible tracers/impacts suited for quick engagements; acceptance: tracer and impact VFX match playtest footage.

- **FR-009 (Telemetry & Test Hooks)**: Emit telemetry events for pickup-acquired, weapon-fired, weapon-hit, explosion-AoE, and weapon-damage to enable balance aggregation and test automation. Acceptance: Events emitted with weapon archetype and match identifiers and aggregated in the test harness.
 - **FR-009 (Telemetry & Test Hooks)**: Emit telemetry events for pickup-acquired, weapon-fired, weapon-hit, explosion-AoE, and weapon-damage to enable balance aggregation and test automation. Telemetry MUST be recorded to an authoritative per-match `MatchTrace` file (for deterministic replay and persisted analysis) and also published to an in-memory telemetry aggregator during test runs for fast assertions and harness reads. Acceptance: Events emitted with weapon archetype and match identifiers and aggregated in both `MatchTrace` and the in-memory test harness; the automated duel matrix and balance verifier can read the in-memory summaries and/or the persisted `MatchTrace` as needed.

- **FR-010 (Performance & Quality Scaling)**: Visuals (particles, explosion density, beam resolution) MUST respect the performance manager and quality-scaling parameters from `specs/002`. Acceptance: Quality scaling reduces VFX density and preserves simulation correctness when frame budget is constrained.

- **FR-011 (AI Weapon Use)**: Robot AI SHOULD prefer weapons based on engagement range and RPS advantage where feasible (e.g., choose rocket when clustered enemies present). Acceptance: In a set of simulation runs, AI weapon selection frequency reflects engagement context and RPS heuristics (observational test).

### FR-012 (Rendering Instancing & Pooling)
- **FR-012 (Rendering Instancing & Pooling)**: To meet performance targets under heavy projectile / VFX load, the renderer MUST use GPU-friendly instancing and batched draw calls for visual-only entities. The expected scope is "instanced for virtually all visual-only entities", with the following specifics:
  - Projectiles (guns, rockets): instanced meshes with per-instance color/transform attributes.
  - Laser beams: batched line segments or instanced geometry updated per-frame.
  - Short-lived effects (explosions, sparks, impact rings): instanced geometries or particle systems; avoid creating per-effect React components wherever possible.
  - Background / decorative visual-only entities and small props: use instancing or particle points if re-used.
  - Robots and physics-driven entities: remain per-entity RigidBody / collider-managed objects and NOT instanced by default, _unless_ a later-phase decoupling permits safe visual instancing without breaking determinism or physics.

  Acceptance Criteria (instances/batches only change visuals):
  - The visual rendering change must be purely visual — simulation, MatchTrace, and telemetry semantics must remain unchanged.
  - A controlled perf test (10v10 with heavy projectile fire and effects) demonstrates a measurable improvement (e.g., a demonstrable reduction in draw call counts and lower per-frame React update overhead in dev environment) compared to a baseline run without instancing. Specific numeric thresholds TBD after profiling, but measured improvements are required to consider instancing accepted.
  - Rendering parity: instanced mode must visually match the non-instanced fallback for a sampling of scenarios and pass the blind recognizability acceptance test (SC-003) for archetype visuals.
  - Any fallback behavior (e.g., capacity exhausted) must be telemetry-logged and kept within a low threshold (e.g., fallback occurrences < 5% under test load).

  Implementation constraints:
  - Instancing must be opt-in via `QualityManager` and runtime flags so it can be toggled for comparison & CI runs.
  - The `MatchTrace` and deterministic replay records MUST NOT be affected by instancing decisions; visual instance index mapping is not required for deterministic semantics but must be traceable for debugging.
  - Per-instance runtime attributes (color, lifetime, scale) can be implemented using `InstancedBufferAttribute` and must be updated using efficient `three` methods with minimal allocations.

High-level bullet points: Instancing strategy and scope
- Scope: "fully and almost all entities" refers to every visual-only, ephemeral entity that does not require individual physics or per-frame gameplay logic to be present as a unique runtime object for the simulation. This includes projectiles, beams, impact effects, shots/tracers, debris particles, and sparks. It excludes the authoritative physics/colliders for robots unless decoupled.
- Architecture: Add a lightweight VisualInstanceManager that maintains mappings from `entityId` -> `instanceIndex` and a `freeIndex` pool per instance category (bullet/rocket/laser/effect). Integrate the manager with render-level components, and ensure the ECS `projectileSystem` and `effectSystem` acquire/release indices as part of lifecycle management.
- Implement per-entity fallback: if the instance pool is exhausted (no free indices), fall back to the existing per-entity React component renderer for parity and visibility.
- Quality & telemetry: Integrate instancing toggles into `QualityManager` and track telemetry counts for active instances and fallback events (`VFX:Instancing:Fallback`) to monitor performance and correctness across runs.
- Testing & safety: Add render parity tests and perf regressions to the CI harness to ensure instancing doesn't regress simulation determinism or match telemetry output.
  - Visual parity tests (affected components must pass a screenshot or headless scene diff test for a representative set of scenarios).
  - Perf regression tests: collect draw-call counts and JS render times before/after; assert improvements or fix thresholds.
  - End-to-end duel-matrix and 10v10 smoke tests must run under both instanced and non-instanced modes to demonstrate no behavioural differences in outputs & telemetry.

### Key Entities *(include if feature involves data)*

- **WeaponProfile**: id, name, archetype (gun|laser|rocket), baseDamage, rateOfFire, ammoOrEnergy, projectileSpeed (if applicable), aoeRadius (rocket), aoeFalloffProfile, beamDuration/tickRate (laser), tracerConfig, visualRefs.
 - **WeaponProfile**: id, name, archetype (gun|laser|rocket), baseDamage, rateOfFire, ammoOrEnergy, projectileSpeed (if applicable), aoeRadius (rocket), aoeFalloffProfile, beamDuration/tickRate (laser), tracerConfig, visualRefs.
 - **BalanceMultipliers**: design-level multipliers for archetype interactions. Fields: `advantageMultiplier` (default `1.25`), `disadvantageMultiplier` (default `0.85`), `neutralMultiplier` (default `1.0`). These are applied multiplicatively to `WeaponProfile.baseDamage` for deterministic RPS effects.
- **ProjectileInstance**: id, weaponProfileId, ownerId, position, velocity, timestampMs, contactEventId.
 - **ProjectileInstance**: id, weaponProfileId, ownerId, position, velocity, timestampMs, contactEventId. (Optional `instanceIndex` when visual instancing is used.)
- **ExplosionEvent**: id, origin, radius, timestampMs, damageProfileId.
 - **ExplosionEvent**: id, origin, radius, timestampMs, damageProfileId. (Optional `instanceIndex` for batched visual representation.)
- **WeaponVisual**: iconRef, modelRef, firingSfxRef, impactVfxRef, beamVfxRef, trailVfxRef.
 - **WeaponTelemetry**: events: `pickup-acquired`, `weapon-fired`, `weapon-hit`, `explosion-aoe`, `weapon-damage` (fields include `matchId`, `weaponProfileId`, `attackerId`, `targetId`, `amount`, `timestampMs` — integer milliseconds since match start; optional `frameIndex` for deterministic ordering).
 - **WeaponTelemetry**: events: `pickup-acquired`, `weapon-fired`, `weapon-hit`, `explosion-aoe`, `weapon-damage` (fields include `matchId`, `weaponProfileId`, `attackerId`, `targetId`, `amount`, `timestampMs` — integer milliseconds since match start; optional `frameIndex` for deterministic ordering).
 - **TelemetryAggregator**: ephemeral in-memory aggregator used during automated tests and live runs to accumulate per-match event summaries for fast assertions. Fields: `matchId`, `eventCountsByType`, `damageTotalsByWeapon`, `winCountsByArchetype`, `timestampMs` (summary window; integer milliseconds since match start). The aggregator is optional for production analytics but required for the automated duel matrix harness.

#### VisualInstanceManager (concept)
- Visual-only component coordinator. Provides an API for the renderer and ECS to allocate & release per-category instance indices and map `entityId` => `instanceIndex` for batched rendering. It is a runtime optimization layer; it must be fully optional and togglable via `QualityManager`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The playable build exposes the three archetypes (guns, lasers, rockets) and they are usable during 10v10 matches.
- **SC-002**: Controlled duel matrix (each pairing, 30+ runs) shows declared advantage results in ≥70% win rate for advantaged archetype (initial tuning target).
- **SC-003**: Visual recognizability: blind test with 20+ participants yields ≥90% correct archetype classification for HUD icons and in-world pickup visuals.
- **SC-004**: Rocket impacts produce visible explosion VFX and logged AoE events in ≥95% of impact captures across 50 recorded impacts.
- **SC-005**: Beam/laser firings show beam/tracer and corresponding hit/damage logs align within ±16ms in ≥95% of sample events (replay verification).
- **SC-006**: The simulation runs a 10v10 match end-to-end in the dev environment without crashes in ≥95% of attempts; quality-scaling preserves match outcome when frame budget is constrained (see `specs/002` criteria).
- **SC-007**: Telemetry events are available and allow calculation of per-weapon pickup counts and fire/hit ratios for balancing.

## Assumptions

- Simulation uses the 10v10 spawn and AI behaviours defined in `specs/001` and `specs/004` (captain election, roaming/avoidance). This feature does not change the spawn counts.
- Default balance multipliers: advantage +25% damage, disadvantage −15% damage. These are tunable; acceptance is based on measurable duel outcomes, not fixed numbers.
- Default rocket AoE radius and falloff are design parameters; initial test can use a conservative radius (e.g., 2–3 units) with linear falloff, tuned during playtests.
- Art/sound teams deliver final assets; placeholder assets are acceptable for integration and testing.

## Out of Scope

- Persistent progression, shops, loadouts, or unlock systems.
- Final polished art pipeline and production VFX beyond placeholders.

## Acceptance Tests (examples, must be automated or manual step-by-step)

- Test A — 10v10 Observer Run: Launch a 10v10 match as an observer, record a match video and MatchTrace; verify 20 robots spawn, fight autonomously, and a winner is declared. Verify observer cannot issue robot commands.

- Test B — RPS Duel Matrix: For each pair of weapon archetypes, run 30 controlled duels with identical config and initial health; aggregate wins; assert advantaged archetype wins ≥70% of trials.
 - Test B — RPS Duel Matrix: For each pair of weapon archetypes, run 30 controlled duels with identical config and initial health; aggregate wins using the in-memory telemetry aggregator (fast path) and validate against authoritative `MatchTrace` records; assert advantaged archetype wins ≥70% of trials.
 - Test B — RPS Duel Matrix: For each pair of weapon archetypes, run 30 controlled duels with identical config and initial health; apply the damage-only archetype multipliers (multiplicative on `baseDamage` before resistances); aggregate wins using the in-memory telemetry aggregator (fast path) and validate against authoritative `MatchTrace` records; assert advantaged archetype wins ≥70% of trials.

- Test C — Rocket AoE Capture: Execute 50 rocket impact captures and assert explosion VFX appears and explosion-AoE telemetry event recorded for ≥95% of samples.

- Test D — Laser Beam Alignment: During a sample of 100 laser-firing events, assert beam visual/tracer aligns with logged hits and damage within ±16ms for ≥95% of events.

- Test E — Visual Recognizability: Present icons/screenshots to 20+ testers and assert ≥90% correct classification per archetype.

- Test F — Instancing Performance & Parity: Run a heavy 10v10 match with a stress VFX profile (maximum bullets/rockets/laser beams); run the test under both instancing-enabled and instancing-disabled modes. Acceptance: instanced mode reduces draw calls and JS/React per-frame overhead while matching visual parity and producing identical MatchTrace and telemetry outputs; fallback occurrences remain under a configured threshold.

## Traceability & References

- Related specs: `specs/001-3d-team-vs/spec.md`, `specs/002-3d-simulation-graphics/spec.md`, `specs/003-extend-placeholder-create/spec.md`, `specs/004-ai-roaming-wall-awareness/spec.md`.

## Next steps

1. Implement telemetry hooks, persist `MatchTrace` per-match, and add an in-memory telemetry aggregator for the RPS validation duel harness.
2. Implement the RPS damage-only multiplier logic in the damage resolution pipeline (apply multiplier to `baseDamage` before resistances) and add unit tests demonstrating deterministic application.
3. Integrate placeholder VFX for rockets/lasers and run visual/performance tests under quality-scaling.
4. Run designer blind recognizability study and iterate visuals.
5. Tune balance multipliers based on duel matrix results and repeat tests until success criteria met.
6. Implement rendering instancing & pooling for visual-only entities (projectiles, lasers, effects) with a POC followed by rollout, feature flag toggles, and test/harness validations per `plan.md`.

