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

Conclusion
Start with the prototype below, get a working 10v10 simulation, then iterate on visuals, AI complexity, and performance optimizations. Replace procedural assets with Blender exports (gltf + gltfjsx) when you want polished visuals
