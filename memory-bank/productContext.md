# Product Context

**Created:** 2025-10-17

Why this project exists
- Provide a compact, deterministic simulation playground for experimenting with game systems (AI, weapons, physics) and reproducible tests.

Problems it solves
- Demonstrates patterns for physics-authoritative ECS simulations in the browser
- Provides testable system boundaries so unit tests can exercise logic without Three/Rapier

How it should work
- A seeded fixed-step driver governs simulation ticks
- Systems are pure where possible and accept explicit inputs (world, rng, rapierWorld, simNowMs)
- Rapier is authoritative for transforms; `physicsSyncSystem` copies translations back into ECS

User experience goals
- Fast local dev iter: `npm run dev` shows the arena and HUD
- Deterministic replays for debugging and CI tests
- Clear developer ergonomics: small systems, well-typed entities, and good tests
