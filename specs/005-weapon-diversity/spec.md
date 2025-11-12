# Feature Specification: Weapon Diversity

**Feature Branch**: `005-weapon-diversity`  
**Created**: 2025-11-12  
**Status**: Draft  
**Input**: User description: "Add weapon diversity: introduce multiple weapon types and pickups, balancing, ammo, and UI indicators to encourage varied playstyles."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pick up and use a weapon (Priority: P1)

As a player, I want to pick up a weapon in the world so I can use it immediately in combat.

**Why this priority**: Picking up and using weapons is the core value of weapon diversity; without reliable pickup/use behavior the feature provides no gameplay value.

**Independent Test**: Place a weapon pickup in the world; a player enters pickup area and interacts; verify player now has the weapon, the pickup disappears, and the UI shows the active weapon and ammo.

**Acceptance Scenarios**:

1. **Given** a weapon pickup present and the player without that weapon, **When** the player touches or interacts with the pickup, **Then** the pickup is removed, the player's active weapon becomes the picked weapon, and the UI updates to show the weapon icon and ammo count.
2. **Given** a picked weapon with finite ammo, **When** the player fires until ammo is exhausted, **Then** the weapon stops firing, ammo shows 0, and player may switch to another available weapon or fallback weapon.

---

### User Story 2 - Carry and switch between weapons (Priority: P2)

As a player, I want to carry more than one weapon and switch between them so I can adapt to different combat situations.

**Why this priority**: Weapon switching enables strategic play and makes diversity meaningful instead of cosmetic.

**Independent Test**: Give the player two different weapon pickups; verify switching preserves each weapon's ammo, active weapon changes immediately, and the UI reflects the change.

**Acceptance Scenarios**:

1. **Given** the player has two weapons in inventory, **When** the player switches to the second weapon, **Then** the second weapon becomes active and its ammo count is displayed.
2. **Given** the player switches back to a previously used weapon, **When** that weapon still has remaining ammo, **Then** its ammo count reflects remaining rounds (no unexpected reset).

---

### User Story 3 - Balanced pickup distribution (Priority: P3)

As a designer, I want weapon pickups distributed so matches encourage varied playstyles and no single weapon monopolizes play.

**Why this priority**: Ensures playtesting and live matches surface balanced engagements and variety across maps.

**Independent Test**: Run a batch of test matches or simulated spawn cycles and collect pickup and usage counts to verify distribution targets are met (see Success Criteria).

**Acceptance Scenarios**:

1. **Given** a map with multiple spawn points, **When** the game runs a match, **Then** pickups spawn across locations so that no single weapon represents more than 40% of total pickups over a sample of 50 matches (tunable metric).

---

### Edge Cases

- Player already at maximum weapon capacity attempts to pick up an additional weapon (see Assumptions for inventory policy).
- Player picks up a weapon and immediately disconnects — pickup should respawn after configured delay.
- Pickup spawns in an unreachable or obstructed area — system must detect and respawn or move the pickup after a timeout.
- Multiple players attempt to pick the same pickup at the same frame — deterministically assign to the player that completes the interaction first and notify other players.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (Weapon Archetypes)**: The game MUST include at least three distinct weapon archetypes (for example: short-range melee, medium-range projectile, long-range beam) that offer meaningfully different combat roles.
  - Acceptance: Three archetypes exist in the running build and each can be picked up, equipped, and fired in a live match.

- **FR-002 (Pickup Entities)**: Weapons MUST be represented by pickup entities in the world that players can collect.
  - Acceptance: A placed pickup disappears when collected and spawns again (or is scheduled to) according to the respawn policy.

- **FR-003 (Inventory & Switching)**: Players MUST be able to carry multiple weapons (inventory capacity defined in Assumptions) and switch between them with immediate effect.
  - Acceptance: Switching is responsive and preserves each weapon's ammo state.

- **FR-004 (Ammo & Firing)**: Each weapon MUST have an ammo model that is decremented on fire and prevents firing when empty.
  - Acceptance: Ammo values decrease on fire and display correctly in UI; firing is blocked at zero ammo.

- **FR-005 (Pickup Respawn & Distribution)**: The system MUST support configurable pickup respawn delays and spawn distributions per map to enable balanced availability.
  - Acceptance: Respawn parameters are applied and pickups reappear after the configured delay.

- **FR-006 (UI Feedback)**: The UI MUST show the active weapon icon and ammo count within the HUD immediately after pickup or switch.
  - Acceptance: UI reflects current weapon and ammo in the same frame/update as the change.

- **FR-007 (Telemetry for Balancing)**: The system MUST emit simple usage events for pickups and weapon usage so designers can measure distribution and balance (e.g., pickup-acquired, weapon-fired events).
  - Acceptance: Events are emitted during gameplay with identifiers allowing aggregation by weapon archetype.

### Key Entities *(include if feature involves data)*

- **Weapon**: id, name, archetype, short description, ammoCapacity, spawnWeight/rarity, intended engagement range (design note), icon reference (art asset id).
- **Pickup**: id, weaponId, location, respawnDelay, lastPickedAt, active/inactive flag.
- **PlayerWeaponState**: currentWeaponId, inventory (list of weaponIds), ammoRemaining per weapon, timing for last switch.
- **SpawnPoint**: id, coordinates, spawnWeight, lastSpawnedAt.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Implementation includes at least 3 weapon archetypes available in the playable build.
- **SC-002**: In a sample of 50 standard matches (or equivalent simulated spawn cycles), no single weapon archetype accounts for more than 40% of pickups collected (designer-adjustable target).
- **SC-003**: At least 95% of players encounter at least 2 distinct weapon archetypes within their first 5 minutes of play (measured over a 100-match sample).
- **SC-004**: UI updates for pickup/switch actions are visible to the player within one rendered frame or the equivalent immediate UI update (practical verification: observable immediately during manual playtest).
- **SC-005**: Telemetry events for pickup and weapon usage are present and can be aggregated to report per-weapon pickup counts and fire counts over a match.

## Assumptions

- Default player inventory capacity is 2 weapon slots. If a player at capacity picks up a weapon, the pickup replaces the currently equipped weapon (this behaviour can be modified if designers prefer an alternate policy).
- Default pickup respawn delay for initial rollout: 20 seconds (tunable by map/designer).
- Art assets for new weapons (icons, models) will be provided by the art team; placeholder assets can be used for playtesting.
- Network and persistence considerations (e.g., remote telemetry aggregation) are handled by existing infrastructure and are not part of this feature's implementation details.

## Out of Scope

- Persistent progression, unlocks, or shop systems for weapons.
- Creating final art/animation beyond placeholders (art integration will be coordinated separately).

## Acceptance Tests (examples, must be automated or manual step-by-step)

- Test A (Pickup test): Spawn a weapon pickup, have a player pick it up. Verify pickup disappears, player's active weapon changes, UI shows icon and ammo, and telemetry event `pickup-acquired` is emitted with weapon id.

- Test B (Switching test): Give player two weapons, fire some ammo from weapon A, switch to weapon B, then switch back to A and verify ammo remaining on A equals pre-switch remaining.

- Test C (Distribution test): Run 50 matches or spawn cycles, collect pickup counts per weapon, and assert no single archetype exceeds 40% of total pickups.

---

**Notes**: Designers should treat numerical targets (respawn delay, 40% distribution target) as initial tuning values subject to playtest adjustments. Any changes to inventory capacity or replacement policy should be treated as design decisions and documented in the follow-up plan.
