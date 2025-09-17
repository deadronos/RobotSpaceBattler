# Spec & Concept — Space Station Auto-Battler (10v10 prototype)

Overview

- Objective: A deterministic-feeling 3D auto-battler with two AI teams (red vs blue) fighting inside a space-station-like environment with shadows, lighting, lasers/guns/rockets and humanoid robots.
- Tech: TypeScript, React, react-three-fiber, @react-three/rapier, @react-three/drei, miniplex (ECS), zustand (state), vite, vitest, playwright, eslint, prettier.

Primary goals for the prototype

- Show 10 vs 10 AI robots active simultaneously with physics interaction.
- Proper lighting + shadows in a contained scene.
- Clear separation of responsibility: rendering, physics, game logic (ECS), AI.
- Testable UI / basic e2e test.

High-level architecture

- Renderer layer: react-three-fiber Canvas + Drei helpers for controls, camera, and simple helpers.
- Physics layer: @react-three/rapier's Physics wrapper and RigidBody components.
- ECS: miniplex holds component bags for entities; systems iterate entity ids and perform logic.
- State: zustand for UI state (pause, simulation speed, selected debug flags).
- AI: simple steering and firing behavior in a separate "AI system".
- Prefabs: procedural robot generator for now, later gltfjsx-generated components.

Main entities & components

- Entity: unique id (miniplex).
- Components:
  - Transform: position, rotation
  - RigidBodyRef: ref to rapier RigidBody (for setting velocity/forces)
  - Team: 'red' | 'blue'
  - Health: hp, maxHp, alive
  - Weapon: cooldown, projectilePrefab, range, power
  - RobotStats: speed, turnSpeed
  - Target: current target entity id
  - Render: reference to mesh for visual debugging

Robots (implementation notes)

- Robots are spawned by the Spawn System (`src/components/Simulation.tsx` spawn logic).
- Procedural robots are constructed from a small set of primitive meshes and components. Each robot entity is composed of a Rapier `RigidBody` (capsule or compound box) and simplified collider for stable physics.
- Component contract (JS/TS shape):

  - Transform: { position: { x,y,z }, rotation: { x,y,z } }
  - RobotStats: { speed: number, turnSpeed: number, sensorRange: number }
  - Weapon: { id: string, type: 'hitscan'|'projectile'|'beam', cooldownMs: number, range: number, power: number, aoe?: number }

- Spawning:
  - The spawn system creates teams using `Team` component and assigns initial `Target` as `null`.
  - Robots are registered in miniplex with their components; `RigidBodyRef` is attached to the Rapier body created in the spawn JSX.

- Behaviors:
  - Robots use steering (Movement System) which sets linear velocity through Rapier API: `RigidBody.setLinvel()`.
  - Avoid direct mesh transforms for physics-driven entities; always use `RigidBody` as the source of truth.

Weapons (implementation notes)

- Two broad categories: hitscan and projectile.

- Hitscan:
  - Instantaneous raycast from muzzle to target, resolved in Weapon System.
  - Use Rapier raycast or Three.js Raycaster against simplified colliders for consistency.
  - Ideal for lasers and instant-hit beams. Friendly fire rules are evaluated in the Weapon System before applying damage.

- Projectile:
  - Spawned as lightweight physics bodies with `velocity` set on creation. Use projectile pooling to minimize GC churn.
  - Fast projectiles should perform sweep/raycast checks to avoid tunneling.
  - On impact they can apply direct damage and optional area-of-effect (AOE) damage; AOE handled by proximity queries against entity positions.

- Beam / continuous weapons:
  - Modeled as a hitscan run repeatedly while active (consumes weapon `cooldownMs` as a tick) or as a special beam component.

- Weapon contract example (TypeScript):

  interface WeaponComponent {
    id: string;
    type: 'hitscan' | 'projectile' | 'beam';
    cooldownMs: number;
    range: number;
    power: number;
    aoe?: number; // optional radius for explosions
  }

AI (implementation notes)

- The AISystem runs at a configurable tick (default 60hz or throttled to 200ms for heavy logic). Default is frame-tied for prototype but heavy decisions are throttled.
- Target selection: nearest-enemy-in-cone, preferred by `RobotStats.sensorRange` and faction rules.
- Determinism: tests use a seeded RNG helper (see `tests/seededRng.test.ts`). If deterministic mode is enabled, seed the RNG at simulation start and avoid non-deterministic browser APIs in the simulation loop.
- Public API surface for AI decisions (example):

  type AIDecision = { action: 'move'|'attack'|'retreat', targetId?: string, aim: { x:number,y:number,z:number } }

- Edge cases:
  - Lost rigidbody refs (e.g. after respawn) must be reattached by the spawn/respawn system.
  - Pathfinding is not included in this prototype; long-range navigation relies on steering and impulse-based avoidance.

Physics & Environment (implementation notes)

- Rapier Authority:
  - Rapier `RigidBody` is authoritative for positions of physics-driven entities. Systems that need transform values should read from `RigidBody` during the Physics Sync System and update ECS `Transform` component accordingly.
  - When adjusting motion, use Rapier API (`setLinvel`, `applyImpulse`, `setAngvel`) not direct mesh manip.

- Colliders and scale:
  - Keep robot colliders simple (capsule or a low-poly compound box). Ensure consistent units (1 unit ~= 1 meter).

- Scene boundaries:
  - The playable area is a bounded box defined in `src/components/Simulation.tsx`. Entities leaving bounds are clamped, destroyed, or teleported back depending on simulation rules (configured in UI store).

- Performance tips:
  - Pool ephemeral objects (projectiles, particle effects).
  - Throttle AI and telemetry collection where possible.

Migration notes

- This SPEC adds concrete component shapes for Robot and Weapon components and clarifies Rapier authority. If your code expects transforms on meshes directly, migrate to reading/writing `RigidBody` via `RigidBodyRef`.

- Example migration snippet:

  // OLD (avoid):
  mesh.position.set(x,y,z);

  // NEW (preferred):
  const rb = getRigidBodyForEntity(eid);
  rb.setTranslation({ x, y, z }, true);

API snippets & examples

- Spawn a robot (simplified):

  // ...existing code...
  const id = store.spawnRobot({ team: 'red', stats: { speed: 3, turnSpeed: 0.08, sensorRange: 12 } });

- Weapon firing (simplified pseudocode):

  // ...existing code...
  function tryFireWeapon(entity, weapon) {
    if (weaponOnCooldown(weapon)) return;
    if (weapon.type === 'hitscan') {
      const hit = rapierWorld.castRay(...);
      if (hit) applyDamage(hit.entityId, weapon.power);
    } else {
      spawnProjectile(entity, weapon);
    }
  }

Testing notes

- Unit tests cover pure logic: damage calculations, cooldown handling, target selection.
- Integration tests (Vitest) use dom/jsdom for game loop checks and small simulation ticks. Playwright E2E verifies the app boots and the canvas renders.


Systems

- Spawn System: create entities (robots) with components
- Physics Sync System: read RigidBody transforms and write to ECS transform (or vice versa)
- Movement System: simple steering to target using RigidBody.setLinvel / applyImpulse
- Weapon System: trigger projectile spawn when cooldown ready and within range
- Projectile System: physics-based projectiles with collision detection and damage application
- AISystem: selects targets, picks behaviors (seek, flee, group)
- Health System: process damage, death, remove entity or play ragdoll
- Render System: optional visual effects, particle spawners
- Debugging/Telemetry System: collection of stats for UI

AI approach

- Start simple: nearest-enemy or random pick within cone + cooldown for retargeting
- Use steering velocities (smooth orientation changes)
- Make AI logic deterministic as possible for reproducible testing (fixed seed RNG for prototypes)
- Offload heavy AI to a worker if scale grows

Rendering & lighting

- Use a directional light for sun/overhead and ambient light for base illumination
- Enable shadows on directional light and meshes (careful with shadow map size/performance)
- Consider baked ambient occlusion for static station geometry later
- Postprocessing (optional): Bloom for lasers, SSAO for depth, Film/Chromatic aberration for stylization

Physics decisions & pitfalls

- Rapier performs well, but CPU & memory scale matters.
- Rapier bodies per-entity is fine for hundreds, but use simple colliders (capsules/boxes) for robots.
- Avoid using many concatenated constraints / complex compound colliders early.
- Projectile collisions at high speed might tunnel through thin colliders; increase solver or perform sweep tests / raycasting before applying position.
- Synchronize transforms carefully: choose authoritative source (physics or ECS). Use RigidBody as source of truth for physical position.

Performance & scaling

- Instancing: use GPU instancing if many identical robot meshes are drawn.
- LOD: use simpler meshes/physics at distance.
- Throttle AI tick rate (e.g., run heavy AI every 200ms instead of every frame).
- Use Web Workers for simulation or expensive pathfinding when scaling beyond small numbers.
- Pool projectiles to avoid GC churn.

Testing & determinism

- Unit test critical pure logic (target selection, damage calculation).
- E2E: Playwright smoke tests to ensure app loads and simulation starts.
- Consider a deterministic simulation mode (fixed timestep, fixed RNG seed) for replay and debugging.

Developer tools & recommended plugins

- Vite
  - @vitejs/plugin-react or @vitejs/plugin-react-swc
  - vite-plugin-checker (TypeScript + ESLint feedback)
- ESLint
  - @typescript-eslint/parser, plugin, eslint-plugin-react
  - eslint-config-prettier to avoid conflicts with Prettier
- Prettier: formatting
- Vitest: unit tests with jsdom + @testing-library/react
- Playwright: end-to-end tests and visual checks

Future features

- Replace procedural robots with glTF characters via gltfjsx.
- Add projectiles with muzzle flash, trails (use @react-three/postprocessing/effects).
- Weapons: hitscan lasers vs physical rockets with explosion area damage.
- Navmesh / pathfinding for complex station interior.
- Networking: client-server authoritative for multiplayer replays or remote matches.

Common pitfalls & recommendations

- Mixing physics and transform updates: always pick one source of truth and avoid setting transforms directly on Mesh when using a RigidBody.
- CPU bound AI: offload or throttle updates.
- Shadows: high-resolution shadow maps cost performance; progressively tune shadow camera size and resolution.
- Colliders and scale: ensure consistent unit scale (1 unit ~ 1 meter) for rapier physics stability.
- Projectile tunneling: use raycasts/sweeps for fast projectiles.
- Memory churn: reuse objects, pool projectiles and ephemeral effects.

Assets & art pipeline

- Author assets as glTF/GLB following `docs/assets.md` (naming, units, metadata). Small example assets live in `public/assets/examples/`.
- Developer helpers: `npm run assets:validate` (runs a lightweight validator) and `npm run assets:optimize` (uses gltf-transform to prune/dedup/quantize). These are intended for local dev and CI checks; production assets should be built and hosted on a CDN or asset server.


Conclusion
Start with the prototype below, get a working 10v10 simulation, then iterate on visuals, AI complexity, and performance optimizations. Replace procedural assets with Blender exports (gltf + gltfjsx) when you want polished visuals
