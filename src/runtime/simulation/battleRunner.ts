import { NavMesh } from "navmesh";

import { updateAISystem } from "../../ecs/systems/aiSystem";
import { updateCombatSystem } from "../../ecs/systems/combatSystem";
import { updateEffectSystem } from "../../ecs/systems/effectSystem";
import { updateMovementSystem } from "../../ecs/systems/movementSystem";
import { updateProjectileSystem } from "../../ecs/systems/projectileSystem";
import { BattleWorld } from "../../ecs/world";
import { MATCH_TIME_LIMIT_MS } from "../../lib/constants";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import { createFixedStepper } from "../../lib/fixedStepper";
import {
  DEFAULT_SIM_SPEED,
  normalizeSimSpeed,
  scaledSubstepCap,
} from "../../lib/simSpeed";
import { createXorShift32 } from "../../lib/random/xorshift";
import { generateSeed } from "../../lib/random/seed";
import {
  createNavMeshResource,
  extractArenaConfiguration,
  NavMeshGenerator,
  PathfindingSystem,
} from "../../simulation/ai/pathfinding";
import {
  MatchSpawnOptions,
  spawnMatch as spawnMatchWithFixture,
} from "../../simulation/match/matchSpawner";
import { updateHazardSystem } from "../../simulation/obstacles/hazardSystem";
import { updateObstacleMovement } from "../../simulation/obstacles/movementSystem";
import { MatchStateMachine } from "../state/matchStateMachine";
import { evaluateMatchOutcome } from "./matchOutcome";
import { TelemetryPort } from "./ports";

/** Fixed simulation rate: 60 Hz. */
export const FIXED_STEP_SECONDS = 1 / 60;
/**
 * Max fixed steps per rendered frame at 1×; excess frame time is dropped.
 * Scales with the simulation speed, so 4× keeps the same headroom.
 */
export const MAX_SUBSTEPS = 5;

/**
 * Options to configure a BattleRunner.
 */
export interface BattleRunnerOptions {
  /** Optional random seed (overrides generated seed). */
  seed?: number;
  /** Telemetry interface for recording match events. */
  telemetry: TelemetryPort;
  /** State machine managing match lifecycle. */
  matchMachine: MatchStateMachine;
  /** Optional obstacle fixture data to seed matches. */
  obstacleFixture?: MatchSpawnOptions["obstacleFixture"];
  /**
   * Match time limit in ms (defaults to MATCH_TIME_LIMIT_MS). When reached
   * the match resolves by remaining robots, then total HP, else a draw.
   * Pass null to disable the limit.
   */
  maxMatchDurationMs?: number | null;
  /**
   * Pathfinding execution mode. `"worker"` (default) is used live;
   * `"inline"` computes paths synchronously so headless runs exercise the
   * navmesh deterministically.
   */
  pathfindingMode?: "worker" | "inline";
  /**
   * Initial simulation speed multiplier (default 1×). Supported speeds are
   * 0.5×/1×/2×/4×; other values are snapped to the nearest one. The speed only
   * scales the accumulator input, never the step length, so it cannot change
   * the outcome of a seed.
   */
  speed?: number;
}

/**
 * Controller for running the battle simulation loop.
 * Orchestrates system updates, victory conditions, and match resets.
 */
export interface BattleRunner {
  /**
   * Advances the simulation by a time step.
   * @param deltaSeconds - Time elapsed since last frame.
   */
  step: (deltaSeconds: number) => void;
  /**
   * Advances the simulation by a variable frame delta using a fixed-step
   * accumulator (60 Hz, at most MAX_SUBSTEPS × speed steps per call).
   * @param frameDeltaSeconds - Wall-clock time elapsed since the last frame.
   */
  advance: (frameDeltaSeconds: number) => void;
  /** Sets the simulation speed multiplier (normalised to a supported speed). */
  setSpeed: (speed: number) => void;
  /** Current simulation speed multiplier. */
  getSpeed: () => number;
  /** Resets the battle to a new match state. */
  reset: () => void;
  /** Releases resources owned by the runner (pathfinding worker). */
  dispose: () => void;
}

/**
 * Creates a new BattleRunner instance.
 *
 * @param world - The battle world state container.
 * @param options - Configuration options.
 * @returns A BattleRunner object.
 */
export function createBattleRunner(
  world: BattleWorld,
  options: BattleRunnerOptions,
): BattleRunner {
  const seed = options.seed ?? world.state.seed ?? generateSeed();
  const rng = createXorShift32(seed);

  const { telemetry, matchMachine } = options;
  const matchTimeLimitMs =
    options.maxMatchDurationMs === undefined
      ? MATCH_TIME_LIMIT_MS
      : options.maxMatchDurationMs;

  // Initialize pathfinding system
  const arenaConfig = extractArenaConfiguration();
  const navMeshGenerator = new NavMeshGenerator();
  const navigationMesh = navMeshGenerator.generateFromArena(arenaConfig);

  // Convert polygons to navmesh library format (Point2D[] where y is z)
  const libraryPolygons = navigationMesh.polygons.map((poly) =>
    poly.vertices.map((v) => ({ x: v.x, y: v.z })),
  );
  const meshInstance = new NavMesh(libraryPolygons);

  const navMeshResource = createNavMeshResource(navigationMesh, meshInstance);
  const pathfindingSystem = new PathfindingSystem(navMeshResource, {
    telemetry,
    executionMode: options.pathfindingMode ?? "worker",
  });

  function spawnMatch(nextSeed?: number) {
    const matchSeed = nextSeed ?? Math.floor(rng.next() * 0xffffffff);
    telemetry.reset(`match-${matchSeed}`);
    spawnMatchWithFixture(world, {
      seed: matchSeed,
      resetWorld: true,
      obstacleFixture: options.obstacleFixture,
      onRobotSpawn: (robot) =>
        telemetry.recordSpawn(robot, world.state.elapsedMs),
    });
    pathfindingSystem.reset();
    matchMachine.reset();
    matchMachine.start();
  }

  spawnMatch(seed);

  let speed = normalizeSimSpeed(options.speed ?? DEFAULT_SIM_SPEED);

  const stepper = createFixedStepper({
    stepSeconds: FIXED_STEP_SECONDS,
    // The cap follows the speed so 4× still has five frames' worth of headroom.
    maxSubSteps: () => scaledSubstepCap(MAX_SUBSTEPS, speed),
  });

  const runner: BattleRunner = {
    step: (deltaSeconds: number) => {
      perfMarkStart("battleRunner.step");
      const deltaMs = deltaSeconds * 1000;
      const snapshot = matchMachine.getSnapshot();

      // Only the running phase advances the world. While paused (and in the
      // victory phase) the world clock, obstacles, hazards and the sim tick
      // counter all freeze, so a pause cannot leak sim time into AI timers,
      // hazard windows, obstacle movement or damage/hit-flash timestamps.
      // `frameIndex` therefore counts simulation steps, not render frames.
      if (snapshot.phase === "running") {
        world.state.elapsedMs += deltaMs;

        updateObstacleMovement(world, deltaMs, telemetry);
        updateHazardSystem(world, deltaMs, telemetry);

        perfMarkStart("updateAISystem");
        updateAISystem(world, () => rng.next());
        perfMarkEnd("updateAISystem");

        perfMarkStart("pathfindingSystem");
        // Applies due worker results in request order at the start of the step,
        // then dispatches new requests. Results never land outside step().
        pathfindingSystem.execute(
          world.robots.entities,
          world.state.elapsedMs,
          world.state.frameIndex,
        );
        perfMarkEnd("pathfindingSystem");

        perfMarkStart("updateCombatSystem");
        updateCombatSystem(world, telemetry, deltaSeconds);
        perfMarkEnd("updateCombatSystem");

        perfMarkStart("updateMovementSystem");
        updateMovementSystem(world, deltaSeconds);
        perfMarkEnd("updateMovementSystem");

        updateProjectileSystem(world, deltaSeconds, telemetry);

        perfMarkStart("updateEffectSystem");
        updateEffectSystem(world);
        perfMarkEnd("updateEffectSystem");

        evaluateMatchOutcome(world, matchMachine, matchTimeLimitMs);

        world.state.frameIndex += 1;
      }

      // Outside the running phase this only drains the victory auto-restart
      // countdown, which must keep ticking while the world is frozen.
      const shouldRestart = matchMachine.tick(deltaMs);
      if (shouldRestart) {
        spawnMatch();
      }

      perfMarkEnd("battleRunner.step");
    },
    advance: (frameDeltaSeconds: number) => {
      // Speed only scales the accumulator input: every step is still exactly
      // FIXED_STEP_SECONDS, so a seed produces the same step sequence at any
      // speed. A slow machine simply takes fewer steps than real time allows.
      stepper.advance(frameDeltaSeconds * speed, runner.step);
    },
    setSpeed: (nextSpeed: number) => {
      speed = normalizeSimSpeed(nextSpeed);
    },
    getSpeed: () => speed,
    reset: () => {
      stepper.reset();
      spawnMatch();
    },
    dispose: () => {
      pathfindingSystem.dispose();
    },
  };
  return runner;
}
