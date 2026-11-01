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
  /**
   * Pathfinding execution mode. `worker` (default) keeps the historical
   * behaviour where worker promises never settle inside the synchronous step
   * loop. `inline` computes paths in-process so navmesh results are applied at
   * deterministic ticks and can be replayed.
   */
  pathfindingMode?: "worker" | "inline";
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
  /** Navmesh path results applied during the run. */
  paths: {
    calculations: number;
    cacheHits: number;
    noPath: number;
    failures: number;
  };
  /** FNV-1a hash folded over the world state after every step. */
  stateHash: string;
  /** Sampled (every 60 steps) per-step hashes, for diffing diverging runs. */
  trace: Array<{ step: number; hash: string }>;
}

function foldNumber(hash: number, value: number): number {
  const scaled = Math.round(value * 1e4) | 0;
  let h = hash;
  for (let shift = 0; shift < 32; shift += 8) {
    h ^= (scaled >>> shift) & 0xff;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

function hashWorld(world: ReturnType<typeof createBattleWorld>, seed: number) {
  let h = seed >>> 0 || 0x811c9dc5;
  h = foldNumber(h, world.state.elapsedMs);
  for (const r of world.robots.entities) {
    h = foldNumber(h, r.position.x);
    h = foldNumber(h, r.position.z);
    h = foldNumber(h, r.health);
  }
  for (const p of world.projectiles.entities) {
    h = foldNumber(h, p.position.x);
    h = foldNumber(h, p.position.z);
  }
  return h;
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
  const paths = { calculations: 0, cacheHits: 0, noPath: 0, failures: 0 };
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
    recordPathfinding: vi.fn<NonNullable<TelemetryPort["recordPathfinding"]>>(
      (event) => {
        if (event.type === "cache_hit") paths.cacheHits += 1;
        else if (event.type === "calculation") paths.calculations += 1;
        else if (event.type === "no_path") paths.noPath += 1;
        else paths.failures += 1;
      },
    ),
  };
  const world = createBattleWorld();
  const matchMachine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
  const runner = createBattleRunner(world, {
    seed: options.seed,
    telemetry,
    matchMachine,
    maxMatchDurationMs: options.maxMatchDurationMs,
    pathfindingMode: options.pathfindingMode ?? "worker",
  });

  let steps = 0;
  let running = 0x811c9dc5;
  const trace: HeadlessMatchResult["trace"] = [];
  try {
    while (matchMachine.getSnapshot().phase === "running" && steps < maxSteps) {
      runner.step(dt);
      steps += 1;
      const h = hashWorld(world, running);
      running = h;
      if (steps % 60 === 0) {
        trace.push({ step: steps, hash: h.toString(16) });
      }
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
    paths,
    stateHash: running.toString(16),
    trace,
  };
}
