import { vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import type { TeamId } from "../../src/lib/teamConfig";
import { createBattleRunner } from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import {
  createMatchStateMachine,
  type MatchRuntimePhase,
} from "../../src/runtime/state/matchStateMachine";

export interface HeadlessMatchOptions {
  seed: number;
  dt?: number;
  maxSteps?: number;
  maxMatchDurationMs?: number | null;
}

export interface HeadlessMatchResult {
  phase: MatchRuntimePhase;
  winner: TeamId | null;
  isDraw: boolean;
  steps: number;
  elapsedMs: number;
  survivors: Record<TeamId, number>;
  robots: Array<{
    id: string;
    team: TeamId;
    health: number;
    x: number;
    z: number;
  }>;
  counts: { spawns: number; fires: number; damage: number; deaths: number };
}

/**
 * Runs a seeded match to completion with a fixed timestep, no renderer and no
 * physics engine. Telemetry is recorded by counting port calls.
 */
export function runHeadlessMatch(
  options: HeadlessMatchOptions,
): HeadlessMatchResult {
  const dt = options.dt ?? 1 / 60;
  const maxSteps = options.maxSteps ?? 60 * 200;

  const counts = { spawns: 0, fires: 0, damage: 0, deaths: 0 };
  const telemetry: TelemetryPort = {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(() => {
      counts.spawns += 1;
    }),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(() => {
      counts.fires += 1;
    }),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(() => {
      counts.damage += 1;
    }),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(() => {
      counts.deaths += 1;
    }),
  };
  const world = createBattleWorld();
  const matchMachine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
  const runner = createBattleRunner(world, {
    seed: options.seed,
    telemetry,
    matchMachine,
    maxMatchDurationMs: options.maxMatchDurationMs,
  });

  let steps = 0;
  try {
    while (matchMachine.getSnapshot().phase === "running" && steps < maxSteps) {
      runner.step(dt);
      steps += 1;
    }
  } finally {
    runner.dispose();
  }

  const snapshot = matchMachine.getSnapshot();
  const robots = world.robots.entities.map((r) => ({
    id: r.id,
    team: r.team,
    health: r.health,
    x: r.position.x,
    z: r.position.z,
  }));
  const survivors: Record<TeamId, number> = { red: 0, blue: 0 };
  for (const r of robots) {
    if (r.health > 0) survivors[r.team] += 1;
  }

  return {
    phase: snapshot.phase,
    winner: snapshot.winner,
    isDraw: snapshot.isDraw,
    steps,
    elapsedMs: world.state.elapsedMs,
    survivors,
    robots,
    counts,
  };
}
