// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import type { BattleWorld } from "../../src/ecs/worldTypes";
import { vec3 } from "../../src/lib/math/vec3";
import {
  createBattleRunner,
  FIXED_STEP_SECONDS,
} from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import { createMatchStateMachine } from "../../src/runtime/state/matchStateMachine";
import { runHeadlessMatch } from "../helpers/headlessMatch";

const DT = FIXED_STEP_SECONDS;

function createNoopTelemetry(): TelemetryPort {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  };
}

function setup(seed = 4242) {
  const world = createBattleWorld();
  const matchMachine = createMatchStateMachine({ autoRestartDelayMs: 1000 });
  const runner = createBattleRunner(world, {
    seed,
    telemetry: createNoopTelemetry(),
    matchMachine,
    maxMatchDurationMs: null,
  });
  return { world, matchMachine, runner };
}

function addMovingBarrier(world: BattleWorld) {
  const barrier = {
    id: "pause-barrier",
    kind: "obstacle" as const,
    obstacleType: "barrier" as const,
    position: vec3(0, 0, 0),
    shape: { kind: "box" as const, halfWidth: 1, halfDepth: 1 },
    blocksVision: true,
    blocksMovement: true,
    active: true,
    movementPattern: {
      patternType: "linear" as const,
      points: [vec3(0, 0, 0), vec3(20, 0, 0)],
      speed: 1,
    },
  };
  world.world.add(barrier as never);
  return barrier;
}

function addDamageHazard(world: BattleWorld) {
  const hazard = {
    id: "pause-hazard",
    kind: "obstacle" as const,
    obstacleType: "hazard" as const,
    position: { x: 0, y: 0, z: 0 },
    shape: { kind: "circle" as const, radius: 3 },
    hazardSchedule: { periodMs: 1000, activeMs: 500, offsetMs: 0 },
    hazardEffects: [{ kind: "damage" as const, amount: 20, perSecond: true }],
    active: false,
  };
  world.world.add(hazard as never);
  return hazard;
}

describe("BattleRunner pause", () => {
  it("freezes the world clock, sim tick, obstacles, hazards and hazard damage", () => {
    const { world, matchMachine, runner } = setup();
    const barrier = addMovingBarrier(world);
    const hazard = addDamageHazard(world);

    // Let the match run so the barrier has moved and the clock has advanced.
    for (let i = 0; i < 10; i += 1) runner.step(DT);

    // Park a robot inside the hazard: running hazard updates would hurt it.
    const victim = world.robots.entities[0];
    victim.position.x = 0;
    victim.position.z = 0;

    matchMachine.pause();
    const before = {
      elapsedMs: world.state.elapsedMs,
      frameIndex: world.state.frameIndex,
      barrierX: barrier.position.x,
      hazardActive: hazard.active,
      victimHealth: victim.health,
    };

    for (let i = 0; i < 180; i += 1) runner.step(DT);

    expect(world.state.elapsedMs).toBe(before.elapsedMs);
    expect(world.state.frameIndex).toBe(before.frameIndex);
    expect(barrier.position.x).toBe(before.barrierX);
    expect(hazard.active).toBe(before.hazardActive);
    expect(victim.health).toBe(before.victimHealth);

    runner.dispose();
  });

  it("resumes the world exactly where it paused", () => {
    const { world, matchMachine, runner } = setup();
    const barrier = addMovingBarrier(world);

    for (let i = 0; i < 30; i += 1) runner.step(DT);
    matchMachine.pause();
    const pausedAt = {
      elapsedMs: world.state.elapsedMs,
      frameIndex: world.state.frameIndex,
      barrierX: barrier.position.x,
    };
    for (let i = 0; i < 120; i += 1) runner.step(DT);

    matchMachine.resume();
    for (let i = 0; i < 30; i += 1) runner.step(DT);

    expect(world.state.elapsedMs).toBeCloseTo(
      pausedAt.elapsedMs + 30 * DT * 1000,
    );
    expect(world.state.frameIndex).toBe(pausedAt.frameIndex + 30);
    // 30 steps of movement at 1 unit/s, no catch-up jump for the paused time.
    expect(barrier.position.x).toBeCloseTo(pausedAt.barrierX + 0.5, 5);

    runner.dispose();
  });

  it("keeps the victory auto-restart countdown ticking while frozen", () => {
    const { world, matchMachine, runner } = setup();
    world.robots.entities.forEach((robot) => {
      robot.health = 0;
    });

    runner.step(DT);
    expect(matchMachine.getSnapshot().phase).toBe("victory");
    const frozen = {
      elapsedMs: world.state.elapsedMs,
      frameIndex: world.state.frameIndex,
      restartTimerMs: matchMachine.getSnapshot().restartTimerMs,
    };
    expect(frozen.restartTimerMs).toBeGreaterThan(0);

    runner.step(0.5);
    expect(world.state.elapsedMs).toBe(frozen.elapsedMs);
    expect(world.state.frameIndex).toBe(frozen.frameIndex);
    expect(matchMachine.getSnapshot().restartTimerMs).toBeCloseTo(
      (frozen.restartTimerMs ?? 0) - 500,
    );

    runner.step(5);
    expect(matchMachine.getSnapshot().phase).toBe("running");
    expect(world.state.elapsedMs).toBe(0);
    expect(world.state.frameIndex).toBe(0);

    runner.dispose();
  });
});

describe("pause determinism", () => {
  it("a pause of any length leaves the seeded match digest unchanged", () => {
    const baseline = runHeadlessMatch({ seed: 7 });
    const paused = runHeadlessMatch({
      seed: 7,
      pauseAtStep: 120,
      pauseSteps: 300,
    });

    expect(paused.pausedSteps).toBe(300);
    expect(paused.steps).toBe(baseline.steps);
    expect(paused.winner).toBe(baseline.winner);
    expect(paused.elapsedMs).toBe(baseline.elapsedMs);
    expect(paused.robots).toEqual(baseline.robots);
    expect(paused.counts).toEqual(baseline.counts);
    expect(paused.stateHash).toBe(baseline.stateHash);
    expect(paused.trace).toEqual(baseline.trace);
  }, 60000);
});
