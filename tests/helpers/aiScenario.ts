import { updateAISystem } from "../../src/ecs/systems/aiSystem";
import { updateCombatSystem } from "../../src/ecs/systems/combatSystem";
import {
  BattleWorld,
  createBattleWorld,
  RobotEntity,
  toVec3,
} from "../../src/ecs/world";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createTestRobot } from "./robotFactory";

/** Deterministic LCG in [0, 1). */
export function createLcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const NOOP_TELEMETRY: TelemetryPort = {
  reset: () => {},
  recordSpawn: () => {},
  recordFire: () => {},
  recordDamage: () => {},
  recordDeath: () => {},
};

/**
 * Builds a deterministic world of `count` robots split between two teams,
 * spread over the arena with a mix of roles, captains and injuries.
 */
export function buildScenarioWorld(count: number, seed = 7): BattleWorld {
  const world = createBattleWorld();
  const rand = createLcg(seed);
  const roles: RobotEntity["role"][] = ["assault", "medic", "tank"];
  for (let i = 0; i < count; i += 1) {
    const team = i % 2 === 0 ? "red" : "blue";
    const side = team === "red" ? -1 : 1;
    const x = side * (5 + rand() * 40);
    const z = (rand() - 0.5) * 80;
    world.world.add(
      createTestRobot({
        id: `${team}-${i}`,
        team,
        role: roles[Math.floor(rand() * roles.length)],
        isCaptain: i < 4,
        kills: Math.floor(rand() * 3),
        position: toVec3(x, 0, z),
        health: 40 + Math.floor(rand() * 60),
        maxHealth: 100,
        spawnIndex: i,
      }),
    );
  }
  return world;
}

/** Wraps the AI / combat calls of a tick so callers can time or meter them. */
export type ScenarioProbe = (phase: "ai" | "combat", run: () => void) => void;
const runDirect: ScenarioProbe = (_phase, run) => run();

/**
 * Approximate bytes allocated per tick by the AI and combat systems: the sum
 * of positive `heapUsed` deltas around each call, after a warm-up.
 */
export function measureAllocationsPerTick(
  count: number,
  ticks: number,
  warmup = 120,
): { aiBytes: number; combatBytes: number } {
  const world = buildScenarioWorld(count);
  const rng = createLcg(3);
  const totals = { ai: 0, combat: 0 };
  let metering = false;
  const probe: ScenarioProbe = (phase, run) => {
    if (!metering) return run();
    const before = process.memoryUsage().heapUsed;
    run();
    const delta = process.memoryUsage().heapUsed - before;
    if (delta > 0) totals[phase] += delta;
  };
  for (let tick = 0; tick < warmup + ticks; tick += 1) {
    metering = tick >= warmup;
    stepScenario(world, rng, tick, 1 / 60, probe);
  }
  return { aiBytes: totals.ai / ticks, combatBytes: totals.combat / ticks };
}

/** Advances one tick: AI, movement integration, combat and scripted damage. */
export function stepScenario(
  world: BattleWorld,
  rng: () => number,
  tick: number,
  dt = 1 / 60,
  probe: ScenarioProbe = runDirect,
): void {
  world.state.elapsedMs += dt * 1000;
  probe("ai", () => updateAISystem(world, rng));
  const robots = world.robots.entities;
  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (robot.health <= 0) continue;
    robot.position.x += robot.velocity.x * dt;
    robot.position.z += robot.velocity.z * dt;
  }
  probe("combat", () => updateCombatSystem(world, NOOP_TELEMETRY, dt));
  // Drain projectiles so the world does not grow without bound.
  for (const projectile of [...world.projectiles.entities]) {
    world.removeProjectile(projectile);
  }
  if (tick % 25 === 24) {
    const victim = robots[(tick * 7) % robots.length];
    victim.health = Math.max(0, victim.health - 45);
  }
}

/** FNV-1a 32-bit hash of a string, as hex. */
export function fnv1a(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16);
}

/** FNV-1a hash over the AI-visible state of every robot after each tick. */
export function runScenarioDigest(
  count: number,
  ticks: number,
  seed = 7,
): string {
  const world = buildScenarioWorld(count, seed);
  const rng = createLcg(seed + 1);
  let hash = 2166136261;
  const mix = (text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
  };
  for (let tick = 0; tick < ticks; tick += 1) {
    stepScenario(world, rng, tick);
    for (const r of world.robots.entities) {
      mix(
        `${r.id}|${r.ai.targetId}|${r.ai.mode}|${r.health}|${r.position.x}|${r.position.z}|${r.fireCooldown}|${r.ai.visibleEnemyIds?.join(",")}|`,
      );
    }
  }
  return hash.toString(16);
}
