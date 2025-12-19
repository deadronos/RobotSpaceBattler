# Contracts

This folder contains human-readable contracts describing the behavior implemented by the repository.

## What is authoritative today

The current runtime implementation lives in `src/` and is the source of truth:

- Spawning: `src/ecs/systems/spawnSystem.ts` and `src/lib/teamConfig.ts`
- Captain election: `src/lib/captainElection.ts`
- Weapons and multipliers: `src/simulation/combat/weapons.ts`
- Victory/restart: `src/runtime/simulation/battleRunner.ts` and `src/runtime/state/matchStateMachine.ts`

The Markdown contracts in this folder document those behaviors.

## TypeScript contract helpers

This folder also contains optional TypeScript files (`scoring-contract.ts`, `spawn-contract.ts`).
They are not consumed by the build (the repository `tsconfig.json` does not include `specs/`).
They exist as machine-readable mirrors of the Markdown contracts.

If you want to make these TS contracts authoritative for runtime code in the future,
that would require explicit wiring in `src/` and corresponding tests.
