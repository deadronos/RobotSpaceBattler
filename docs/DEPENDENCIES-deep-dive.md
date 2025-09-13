# Dependency Deep Dive

This document provides practical, deeper notes on every dependency listed in `docs/DEPENDENCIES.md`. For each library you’ll find: what it’s for, core concepts, key APIs seen in this repo, repo-specific integration notes, and official links.

The intent is to help new contributors navigate the stack quickly and avoid common pitfalls.

---

## Table of contents

- Runtime dependencies
  - @dimforge/rapier3d
  - @react-three/fiber (R3F)
  - @react-three/drei
  - @react-three/postprocessing
  - @react-three/rapier (R3R)
  - miniplex
  - react / react-dom
  - three
  - zustand
- Dev dependencies
  - @playwright/test and playwright
  - vitest
  - @testing-library/react / @testing-library/jest-dom
  - jsdom
  - typescript / @types/*
  - vite and @vitejs/plugin-react-swc
  - eslint / prettier
- Cross-library integration highlights
- Gotchas and tips
- RigidBody event payloads & typing (cross-version note)
- Link-checking


## Runtime dependencies

### Versions used in this repo (runtime)

- @dimforge/rapier3d: ^0.19.0
- @react-three/fiber: ^9.3.0
- @react-three/drei: ^10.7.6
- @react-three/postprocessing: ^3.0.4
- @react-three/rapier: ^2.1.0
- three: ^0.180.0
- react / react-dom: ^19.1.1
- miniplex: ^2.0.0
- zustand: ^5.0.8

### @dimforge/rapier3d

- What it is: High-performance 3D physics engine (Rust/WASM) with JS bindings.

- Core concepts:
  - RigidBody (dynamic/fixed/kinematic), Collider (shape/friction/restitution), forces/impulses, CCD, event/callback triggers.
  - Simulation advances in the physics world; transforms are owned by the physics engine.

- Key APIs used here:
  - RigidBody: `translation()`, `linvel()`, `setLinvel(...)`, `setTranslation(...)`.
  - Collider types: via `@react-three/rapier` wrappers (e.g., `CuboidCollider`, `CapsuleCollider`, `BallCollider`).

- Repo integration notes:
  - Physics is authoritative: transforms mirrored back into ECS with `syncRigidBodiesToECS()` (see `src/systems/physicsSync.ts`).
  - Projectiles use CCD and `onCollisionEnter` (from the R3R wrapper) to apply damage and despawn.
  - Robots steer by setting linear velocity toward nearest enemy (AI loop in `src/components/Simulation.tsx`).
  - Access the underlying Rapier body from `@react-three/rapier` via `ref.current.rigidBody` (see callback-ref patterns below).

- Links:
  - Repo: [dimforge/rapier.js](https://github.com/dimforge/rapier.js)
  - Docs: [rapier.rs JavaScript guide](https://rapier.rs/docs/user_guides/javascript)

### @react-three/fiber (R3F)

- What it is: React renderer for three.js (React components represent scene graph).

- Core concepts:
  - `<Canvas>` creates renderer + scene + camera; hooks like `useFrame` for per-tick logic.
  - Reconciler controls three.js objects; avoid imperative mutation when possible.

- Key APIs used here:
  - `<Canvas>` in `src/components/Scene.tsx`.
  - `useFrame((state, delta) => ...)` for AI/physics sync in `Simulation.tsx`.

- Repo integration notes:
  - `useFrame` drives game loop systems (AI, TTL cleanup, muzzle flash timers, scoreboard updates).
  - The scene is wrapped in `<Physics>`; keep transforms physics-owned (don’t mutate mesh positions directly for bodies).
  - `useFrame`’s `delta` is in seconds; use it for time-based cooldowns, TTLs, and lerps.
  - Prefer callback refs or `useLayoutEffect` when you need to read three/rapier handles right after mount.

- Links:
  - Repo: [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)
  - Docs: [docs.pmnd.rs/react-three-fiber](https://docs.pmnd.rs/react-three-fiber)

### @react-three/drei

- What it is: Helper components for R3F (controls, HTML overlays, loaders, etc.).

- Key APIs used here:
  - `<OrbitControls />` for camera interaction.
  - `<Html />` for a centered loading fallback.

- Repo integration notes:
  - Controls live outside `<Suspense>` and `<Physics>`; safe to keep.
  - Keep controls passive for tests/e2e; they don’t impact simulation logic.
  - `<Html center>` is used as a loading fallback; it renders into a DOM overlay and won’t block physics.

- Links:
  - Repo: [pmndrs/drei](https://github.com/pmndrs/drei)
  - Docs: [docs.pmnd.rs/drei](https://docs.pmnd.rs/drei)

### @react-three/postprocessing

- What it is: R3F wrapper around `postprocessing` effect composer.

- Usage here: Not currently used in code; safe to add passes later in `Scene.tsx`.

- Integration notes:
  - Prefer to mount composer once near the scene root.
  - Watch performance; some passes are heavy on lower-end GPUs.
  - Start with light passes (e.g., Bloom/ToneMapping) and profile; ensure it doesn’t interfere with Playwright screenshot stability.

- Links:
  - Repo: [pmndrs/react-postprocessing](https://github.com/pmndrs/react-postprocessing)
  - Docs: [docs.pmnd.rs/react-postprocessing](https://docs.pmnd.rs/react-postprocessing)

### @react-three/rapier (R3R)

- What it is: R3F bindings for Rapier; provides `<Physics>`, `<RigidBody>`, colliders and events.

- Core concepts:
  - Physics context provider; bodies/colliders as declarative components; collision events surfaced as props.

- Key APIs used here:
  - `<Physics gravity={[0, -9.81, 0]}>` in `Scene.tsx`.
  - `<RigidBody>` with refs exposing `rigidBody` (Rapier API).
  - Colliders: `CuboidCollider`, `CapsuleCollider`, `BallCollider`.
  - Events: `onCollisionEnter` on projectile bodies.

- Repo integration notes:
  - On mount, `RobotFactory` calls `onRigidBodyReady(rb)` to stash the Rapier handle on the ECS entity (`ent.rb`).
  - Projectiles are dynamic, gravity-less, with CCD enabled; velocity set via `setLinvel`.
  - The ground floor and arena walls are fixed bodies with colliders only.
  - Event payloads: `onCollisionEnter` receives an event with `other` referring to the other rigid body; this repo uses that to find the victim entity.
  - Ref shape: the React ref points to an object exposing `.rigidBody` (Rapier body). Using a callback ref ensures it’s available as soon as the component mounts.

- Links:
  - Repo: [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier/tree/master/packages/react-three-rapier)
  - Docs: [docs.pmnd.rs/react-three-rapier](https://docs.pmnd.rs/react-three-rapier)

### miniplex

- What it is: Minimal ECS-like entity store.

- Core concepts:
  - `World` holds entities as plain objects; you add/remove and iterate.

- Key APIs used here:
  - `new World<any>()`, `store.add(entity)`, `store.remove(entity)`, iteration over `store.entities.values()`.

- Repo integration notes:
  - One global store instance exported from `src/ecs/miniplexStore.ts`.
  - Entities carry data bags: `id`, `team`, `position`, optional `rb`, `health`, `weapon`, `projectile`, `fx`.
  - Systems are simple loops in `Simulation.tsx` using `useFrame`.
  - `store.entities` is an iterable Set; snapshot it (e.g., `[...store.entities.values()]`) before multi-pass mutations to avoid iterator invalidation.

- Links:
  - Docs: [hmans/miniplex README](https://github.com/hmans/miniplex#readme)

### react / react-dom

- What it is: UI library and DOM renderer.

- Core concepts:
  - Functional components, Suspense, hooks (`useEffect`, `useLayoutEffect`).

- Key APIs used here:
  - `Suspense` fallback in scene composition.
  - Lifecycle hooks to capture Rapier handles after mount (`useLayoutEffect`).

- Repo integration notes:
  - React 19 is used; keep libraries compatible (R3F supports React 18/19).
  - Avoid stateful React updates in `useFrame`; prefer state stores (Zustand) for UI counters.
  - Use `Suspense` with `<Html>` fallbacks for async assets; in this repo, core meshes are procedural, so the fallback shows briefly on first paint.

- Links:
  - Repo: [facebook/react](https://github.com/facebook/react)
  - Docs: [react.dev](https://react.dev)

### three

- What it is: Low-level 3D library used by R3F.

- Key APIs used here:
  - Geometries (`boxGeometry`, `planeGeometry`, `sphereGeometry`, `cylinderGeometry`).
  - Materials (`meshStandardMaterial`).
  - `THREE.Vector3` for math and initial positions.

- Repo integration notes:
  - Let Rapier own transforms for physics bodies; three.js meshes are children of `<RigidBody>` for sync.
  - Lights: `ambientLight`, `directionalLight` configured in `Scene.tsx`.
  - Shadow map sizes (`directionalLight.shadow-mapSize-width/height`) are set to 2048; lower if GPU-bound.

- Links:
  - Repo: [mrdoob/three.js](https://github.com/mrdoob/three.js)
  - Docs: [threejs.org/docs](https://threejs.org/docs)

### zustand

- What it is: Small state manager for UI or lightweight app state.

- Key APIs used here:
  - `create()` to build a store with actions and counters.
  - Selectors used via the default hook in components.

- Repo integration notes:
  - `src/store/uiStore.ts` tracks `paused`, alive counts, and kill counts.
  - Simulation updates counters via `useUI.getState()` in the frame loop (avoids extra React renders).
  - Keep UI state writes minimal inside `useFrame`; batch reads/writes via `getState()` where possible to reduce React tree churn.

- Links:
  - Repo: [pmndrs/zustand](https://github.com/pmndrs/zustand)
  - Docs: [zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs)

---

## Dev dependencies

### @playwright/test and playwright

- What it is: E2E browser automation and test runner.

- Repo integration notes:
  - E2E webServer is configured to start Vite on port 5174 for tests (see `playwright.config.ts`).
  - The smoke spec asserts a `<canvas>` exists and that `#status` contains “Space Station”.
  - Scripts: `npm run playwright:install`, `npm run playwright:test`.

- Links:
  - Repo: [microsoft/playwright](https://github.com/microsoft/playwright)
  - Docs: [playwright.dev](https://playwright.dev)

### vitest

- What it is: Vite-native unit test framework.

- Repo integration notes:
  - Unit tests in `tests/`, using Testing Library and jsdom.
  - Scripts: `npm run test`, `npm run test:coverage`.
  - Keep unit tests free of WebGL reliance; prefer testing pure logic and shallow renders.

- Links:
  - Repo: [vitest-dev/vitest](https://github.com/vitest-dev/vitest)
  - Docs: [vitest.dev](https://vitest.dev)

### @testing-library/react and @testing-library/jest-dom

- What it is: React testing utilities; custom DOM matchers.

- Repo integration notes:
  - Example test `tests/Simulation.test.tsx` renders `<App />` and asserts presence of text/button.
  - `jest-dom` adds matchers like `toBeInTheDocument()`.

- Links:
  - RTL: [testing-library/react-testing-library](https://github.com/testing-library/react-testing-library)
  - Docs: [testing-library.com RTL intro](https://testing-library.com/docs/react-testing-library/intro/)
  - jest-dom: [testing-library/jest-dom](https://github.com/testing-library/jest-dom)

### jsdom

- What it is: DOM implementation for Node testing.

- Repo integration notes:
  - Used by Vitest environment to simulate browser APIs.

- Links:
  - Repo/Docs: [jsdom/jsdom](https://github.com/jsdom/jsdom)

### typescript

- What it is: Typed superset of JavaScript.

- Repo integration notes:
  - TS config at `tsconfig.json`; project uses TS across src.
  - Types for React/DOM installed via DefinitelyTyped packages.

- Links:
  - Repo: [microsoft/TypeScript](https://github.com/microsoft/TypeScript)
  - Docs: [typescriptlang.org](https://www.typescriptlang.org)

### @types/react and @types/react-dom

- What it is: Type definitions for React and React DOM (for TS).

- Links:
  - React types: [DefinitelyTyped/types/react](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react)
  - React DOM types: [DefinitelyTyped/types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom)

### vite and @vitejs/plugin-react-swc

- What it is: Dev/build tool with SWC-based React plugin for fast refresh and transforms.

- Repo integration notes:
  - Dev server: `npm run dev` (port configured in `vite.config.ts`, default 5173).
  - SWC plugin accelerates refresh; no Babel config needed.
  - For Playwright, tests start Vite on 5174 to avoid port conflicts with local dev sessions.

- Links:
  - Vite Repo: [vitejs/vite](https://github.com/vitejs/vite)
  - Vite Docs: [vite.dev](https://vite.dev)
  - Plugin: [vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react)

### eslint, eslint-plugin-react, eslint-config-prettier

- What it is: Linting + React rules + Prettier compatibility.

- Repo integration notes:
  - Run `npm run lint` to check; `eslint-config-prettier` disables stylistic rules conflicting with Prettier.

- Links:
  - ESLint: [eslint.org](https://eslint.org)
  - React plugin: [jsx-eslint/eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
  - Prettier config: [prettier/eslint-config-prettier](https://github.com/prettier/eslint-config-prettier#readme)

### prettier

- What it is: Opinionated formatter.

- Repo integration notes:
  - Run `npm run format` to apply formatting; see `prettierrc.txt` for project style.

- Links:
  - Docs: [prettier.io](https://prettier.io)

---

## Cross-library integration highlights

- Physics authority: Rapier (via `@react-three/rapier`) owns transforms for bodies. ECS mirrors RB translations back to `entity.position`. Avoid mutating mesh positions directly when a RigidBody exists.
- AI loop: Implemented with R3F `useFrame` and uses Rapier API (`setLinvel`) to steer entities. Damage and TTL processed in the same loop.
- ECS: Miniplex serves as a simple data store. Entities are identified by `id` and extended with runtime handles (`rb`) once RigidBodies mount.
- Rendering: Three.js primitives are declared under `<RigidBody>` so rendering follows physics transforms. Lighting and controls configured in `Scene.tsx`.
- UI state: Zustand holds pause flag and counters; simulation updates counts post-removals to avoid stale values.
- Version compatibility: The versions listed above are known to work together in this repo. When upgrading major versions (R3F, three, Rapier, React), verify typings and event payload shapes.

## Gotchas and tips

- RigidBody refs: In `@react-three/rapier`, the Rapier API lives at `ref.current.rigidBody`. Ensure you read it after mount (e.g., `useLayoutEffect`).
- Projectiles: Use `ccd` for fast-moving bodies to prevent tunneling; disable rotations and gravity to keep motion stable.
- Perf: Postprocessing and high shadow map sizes can be expensive; adjust if perf becomes an issue.
- Tests/E2E: E2E assumes dev server on 5173. Unit tests run in jsdom; avoid relying on WebGL context in unit tests.
- Iteration safety: When removing entities during a frame, iterate over a snapshot array (like this repo does) to avoid mutating while iterating the Set.
- Time units: `useFrame` delta is seconds; Rapier velocities are world units per second; keep them consistent when tuning.

---

## RigidBody event payloads & typing (cross-version note)

Small note about collision event payloads across `@react-three/rapier` versions:

- The R3R event handlers (`onCollisionEnter`, `onCollisionExit`, etc.) typically receive an event object that contains references to the involved Rapier rigid bodies. Across versions the exact shape/typing may vary (TypeScript types sometimes lag behind runtime shapes).
- Common runtime fields observed and used in this repo:
  - `event.collider` / `event.rigidBody` — the collider or body on the local side (variant by version)
  - `event.other` — the opposing rigid body (used here to map back to ECS entities)
  - `event.contact` / `event.manifold` — collision contact info (not relied on in this repo)
- Practical tips:
  - Use a defensive handler signature (e.g., `onCollisionEnter={(e: any) => { ... }}`) when typing mismatches occur during upgrades.
  - When upgrading `@react-three/rapier`, check the release notes for event payload changes and update typed handlers accordingly.
  - Prefer callback refs or `useLayoutEffect` when you need to access `.rigidBody` immediately after mount; typed refs may need `as unknown as` casts depending on the R3R version.

## Link-checking

Quick ways to validate the doc links in this repo:

- PowerShell one-liner (fast, requests each link and returns status code):

  ```powershell
  Get-Content docs\DEPENDENCIES-deep-dive.md -Raw | Select-String -Pattern "https?://[^")\s]+" -AllMatches | ForEach-Object { $_.Matches } | ForEach-Object { $url = $_.Value; try { $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -ErrorAction Stop; [PSCustomObject]@{ Url = $url; Status = $r.StatusCode } } catch { [PSCustomObject]@{ Url = $url; Status = $_.Exception.Message } } | Format-Table -AutoSize
  ```

- npm package option (dev-dependency): `linkinator` — install and run `npx linkinator docs --silent` to scan for broken links.

Note: external link checks may be rate-limited by remote hosts; prefer automated CI checks with caching or limited parallelism.

This file complements `docs/DEPENDENCIES.md`. When adding or replacing libraries, update both files and consider adding targeted unit/e2e tests.
