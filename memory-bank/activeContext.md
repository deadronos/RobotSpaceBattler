# Active Context

**Created:** 2025-10-17

Current work focus

- Keep specs under `specs/` accurate to the current implementation (“as implemented”, no aspirational tails).
- Maintain the 10v10 simulation loop (BattleRunner + BattleWorld) and the dynamic obstacle system.
- Performance and visual fidelity tuning (instancing, max instance budgets, renderer stats).
- AI behavior iteration (seek/engage/retreat + roaming + obstacle-aware movement).

Recent changes

- Specs cleanup: removed appended legacy/template sections across `specs/` to keep files single-source and lint-clean.
- Specs 001 contracts and docs aligned to current runtime behavior.
- Specs 005 plan template tail removed; file normalized for markdownlint.
- Fixed instanced VFX rendering parity (projectiles/effects/lasers) by ensuring
  instanced geometries provide a white `color` vertex attribute when
  `vertexColors` is enabled and by initializing `instanceColor` early.
- Removed the temporary on-screen instancing debug overlay.

Next steps

1. Keep `memory-bank/` aligned to the current code layout (ECS under `src/ecs`, simulation runtime under `src/runtime`).
1. Triage and update `memory-bank/tasks/*` so tasks reflect current behaviors and known gaps.
1. Optional: run `npm run test` after documentation sweeps to ensure no accidental code edits.

Active decisions


- Keep simulation state in `BattleWorld` as authoritative; rendering reads state and does not mutate it.
- Use Rapier for arena colliders, obstacle integration, and raycasts (LOS/avoidance), not per-robot physics.
- Prefer pure logic modules under `src/simulation/*` for testability.

How to run (short)


- Dev server: `npm run dev`
- Unit tests: `npm run test`
- E2E: `npm run playwright:install` then `npm run playwright:test`

Where to look next


- `tasks/_index.md` — current tasks and statuses
- `designs/` — design snapshots for AI, weapons, and Rapier integration
- `specs/` — feature-level specs and plans (kept “as implemented”)
