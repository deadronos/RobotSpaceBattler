# Product Context — RobotSpaceBattler

**Last updated:** 2025-10-03

## Why this exists

RobotSpaceBattler provides a hands-on sandbox for experimenting with physics-integrated gameplay, procedural asset generation, and modular systems design using modern web tooling. It is targeted at contributors who want a compact, testable environment for trying AI, weapons, and physics-driven interactions without a heavy asset pipeline.

## Problems it addresses

- Teaching and prototyping how to integrate Rapier physics with a React/Three.js renderer while keeping physics authoritative.
- Providing an accessible environment for experimenting with AI and weapon systems with deterministic test modes enabled by the fixed-step driver.
- Enabling reproducible tests and CI workflows for interactive simulation logic so system behavior can be validated in unit and E2E tests.

## UX goals

- Fast startup and immediate visual feedback in the browser; default teams are spawned on boot (see `src/main.tsx`).
- Minimal developer controls for spawning, pausing, toggling FX and friendly-fire, and inspecting internals (PauseControl, FriendlyFireToggle, PrefabsInspector, DevDiagnostics).
- On-demand rendering plus an explicit TickDriver keeps UI updates intentional and deterministic for testing.
- Developer-facing visibility: diagnostics overlay, test hooks, and an exposed ECS world for debug during development.
