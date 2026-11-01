import type { World as RapierWorld } from "@dimforge/rapier3d-compat";
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
import {
  clearRapierBindings,
  syncObstaclesToRapier,
} from "../../simulation/obstacles/rapierIntegration";
import { MatchStateMachine } from "../state/matchStateMachine";
import { evaluateMatchOutcome } from "./matchOutcome";
import { TelemetryPort } from "./ports";

/** Fixed simulation rate: 60 Hz. */
export const FIXED_STEP_SECONDS = 1 / 60;
/** Max fixed steps per rendered frame; excess frame time is dropped. */
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
   * accumulator (60 Hz, at most MAX_SUBSTEPS steps per call).
   * @param frameDeltaSeconds - Wall-clock time elapsed since the last frame.
   */
  advance: (frameDeltaSeconds: number) => void;
  /** Resets the battle to a new match state. */
  reset: () => void;
  /**
   * injects the Rapier physics world for predictive avoidance queries.
   * @param rapierWorld - The Rapier world instance.
   */
  setRapierWorld: (rapierWorld: RapierWorld | null) => void;
  /** Gets the current Rapier world instance. */
  getRapierWorld: () => RapierWorld | undefined;
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

  const stepper = createFixedStepper({
    stepSeconds: FIXED_STEP_SECONDS,
    maxSubSteps: MAX_SUBSTEPS,
  });

  const runner: BattleRunner = {
    step: (deltaSeconds: number) => {
      perfMarkStart("battleRunner.step");
      const deltaMs = deltaSeconds * 1000;
      world.state.elapsedMs += deltaMs;

      updateObstacleMovement(world, deltaMs, telemetry);
      updateHazardSystem(world, deltaMs, telemetry);

      const snapshot = matchMachine.getSnapshot();

      if (snapshot.phase === "running") {
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
      }

      const shouldRestart = matchMachine.tick(deltaMs);
      if (shouldRestart) {
        spawnMatch();
      }

      world.state.frameIndex += 1;
      perfMarkEnd("battleRunner.step");
    },
    advance: (frameDeltaSeconds: number) => {
      stepper.advance(frameDeltaSeconds, runner.step);
    },
    reset: () => {
      stepper.reset();
      spawnMatch();
    },
    setRapierWorld: (rapierWorld: RapierWorld | null) => {
      world.rapierWorld = rapierWorld ?? undefined;
      if (rapierWorld) syncObstaclesToRapier(world);
      else clearRapierBindings(world);
    },
    getRapierWorld: () => {
      return world.rapierWorld;
    },
    dispose: () => {
      pathfindingSystem.dispose();
    },
  };
  return runner;
}
