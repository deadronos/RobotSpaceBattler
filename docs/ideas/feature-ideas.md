# Feature Ideas for Space Station Auto-Battler

Based on the analysis of the current codebase (prototype status, ECS architecture, Rapier physics), here are three feature ideas to enhance the depth and replayability of the simulation.

## 1. Special Abilities System

**Concept:**
Currently, combat is defined by `WeaponProfile` (Laser, Gun, Rocket) with basic rock-paper-scissors logic. Adding an "Ability" system would introduce active skills with cooldowns, distinct from the primary weapon fire.

**Examples:**

- **Energy Shield:** Deploys a temporary bubble shield that absorbs incoming projectiles (uses physics colliders).
- **Overclock:** Temporarily increases movement speed and fire rate but drains health or disables weapons afterward.
- **EMP Blast:** Area-of-effect stun that temporarily disables nearby enemy weapons and movement.

**Implementation Details:**

- **ECS Components:**
  - `AbilityComponent`: Stores ability type, cooldown timer, active duration, and state (Ready, Active, Cooldown).
- **Systems:**
  - `AbilitySystem`: Manages cooldowns and triggers ability effects.
  - Update `CombatSystem` to check for active defensive abilities (e.g., shields) before applying damage.
- **UI:** Add visual indicators (cooldown bars) above unit health bars.

## 2. Dynamic Arena Obstacles

**Concept:**
The current arena (`ArenaGeometry.ts`) consists of static walls and pillars. Introducing dynamic, interactive elements would make positioning more strategic and less predictable.

**Examples:**

- **Moving Barriers:** Walls that slide or rotate periodically, changing sightlines and pathing.
- **Hazard Zones:** Areas that activate intermittently (e.g., steam vents, electrified floors) causing damage or slowing units.
- **Destructible Cover:** Crates or barricades that block shots but can be destroyed after taking enough damage.

**Implementation Details:**

- **ECS Components:**
  - `DynamicObstacle`: Tags an entity as a non-static obstacle.
  - `MovementPattern`: Defines how the obstacle moves (linear, rotation).
  - `HazardZone`: Defines damage/effect properties for an area.
- **Physics:** Use Kinematic rigid bodies for moving walls so they push units but aren't pushed back.
- **Pathing:** Update `isLineOfSightBlocked` to account for dynamic entities, or use raycasting against the physics world instead of static geometric checks.

## 3. Unit Classes & Roles

**Concept:**
Currently, units are differentiated mainly by their weapon. Formalizing "Classes" or "Chassis" types would allow for deeper team composition strategies.

**Examples:**

- **Heavy (Tank):** High health, large hitbox, slow movement, low damage. Prioritizes protecting allies.
- **Scout (Flanker):** Low health, very fast, high vision range. AI prioritizes targeting isolated enemies or rear-line units.
- **Support (Buffer):** Medium stats. Passive aura that buffs nearby allies (fire rate, regeneration).

**Implementation Details:**

- **Data Structure:** Create `UnitClassProfile` similar to `WeaponProfile` but for chassis stats (base HP, speed, turn rate, sensor range).
- **AI Logic:**
  - Enhance `BehaviorState` to support different "personalities" (e.g., `Aggressive`, `Defensive`, `Evasive`).
  - Update `TargetingUtils` to allow class-specific targeting priorities (e.g., Scouts prefer isolated targets).
- **Visuals:** distinct procedural generation parameters or colors for different classes.
