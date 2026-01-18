import type { World as RapierWorld } from "@dimforge/rapier3d-compat";

import {
  createNavMeshResource,
  extractArenaConfiguration,
  NavMeshGenerator,
  PathfindingSystem,
} from "../../simulation/ai/pathfinding";
import NavMesh from "navmesh";
import { updateAISystem } from "../../ecs/systems/aiSystem";
import { updateCombatSystem } from "../../ecs/systems/combatSystem";
import { updateEffectSystem } from "../../ecs/systems/effectSystem";
import { updateMovementSystem } from "../../ecs/systems/movementSystem";
import { updateProjectileSystem } from "../../ecs/systems/projectileSystem";
import { BattleWorld, TeamId } from "../../ecs/world";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import { createXorShift32 } from "../../lib/random/xorshift";
import { isActiveRobot } from "../../lib/robotHelpers";
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
import { TelemetryPort } from "./ports";

const VICTORY_DELAY_MS = 5000;

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
  /** Resets the battle to a new match state. */
  reset: () => void;
  /**
   * injects the Rapier physics world for predictive avoidance queries.
   * @param rapierWorld - The Rapier world instance.
   */
  setRapierWorld: (rapierWorld: RapierWorld | null) => void;
  /** Gets the current Rapier world instance. */
  getRapierWorld: () => RapierWorld | undefined;
}

function evaluateVictory(
  world: BattleWorld,
  matchMachine: MatchStateMachine,
): void {
  const snapshot = matchMachine.getSnapshot();
  if (snapshot.phase !== "running") {
    return;
  }

  const alive = world.robots.entities.reduce(
    (acc, robot) => {
      if (isActiveRobot(robot)) {
        acc[robot.team] += 1;
      }
      return acc;
    },
    { red: 0, blue: 0 },
  );

  const teams: TeamId[] = ["red", "blue"];
  const defeated = teams.filter((team) => alive[team] === 0);

  if (defeated.length === 0 || defeated.length === teams.length) {
    return;
  }

  const winner = defeated[0] === "red" ? "blue" : "red";
  matchMachine.declareVictory(winner, VICTORY_DELAY_MS);
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
  const seed = options.seed ?? world.state.seed ?? Date.now();
  const rng = createXorShift32(seed);

  const { telemetry, matchMachine } = options;

  // Initialize pathfinding system
  // Initialize pathfinding system
  const arenaConfig = extractArenaConfiguration();
  const navMeshGenerator = new NavMeshGenerator();
  const navigationMesh = navMeshGenerator.generateFromArena(arenaConfig);
  
  // Convert polygons to navmesh library format (Point2D[] where y is z)
  const libraryPolygons = navigationMesh.polygons.map((poly) =>
    poly.vertices.map((v) => ({ x: v.x, y: v.z }))
  );
  const meshInstance = new NavMesh(libraryPolygons as any); // Type cast if necessary, usually it expects Point[]
  
  const navMeshResource = createNavMeshResource(navigationMesh, meshInstance);
  const pathfindingSystem = new PathfindingSystem(navMeshResource);

  // Wire up pathfinding telemetry
  pathfindingSystem.onTelemetry((event) => {
    // Optional: forward to main telemetry if needed, or just let it log internally
    if (event.type === "path-calculation-failed") {
        // console.warn("Pathfinding failed:", event);
    }
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
    matchMachine.reset();
    matchMachine.start();
  }

  spawnMatch(seed);

  return {
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
        updateAISystem(world, () => rng.next());
        perfMarkEnd("updateAISystem");

        perfMarkStart("pathfindingSystem");
        // Update pathfinding for all robots
        pathfindingSystem.execute(world.robots.entities);
        perfMarkEnd("pathfindingSystem");

        perfMarkStart("updateCombatSystem");
        updateCombatSystem(world, telemetry);
        perfMarkEnd("updateCombatSystem");

        perfMarkStart("updateMovementSystem");
        updateMovementSystem(world, deltaSeconds);
        perfMarkEnd("updateMovementSystem");

        updateProjectileSystem(world, deltaSeconds, telemetry);

        perfMarkStart("updateEffectSystem");
        updateEffectSystem(world);
        perfMarkEnd("updateEffectSystem");

        evaluateVictory(world, matchMachine);
      }

      const shouldRestart = matchMachine.tick(deltaMs);
      if (shouldRestart) {
        spawnMatch();
      }

      world.state.frameIndex += 1;
      perfMarkEnd("battleRunner.step");
    },
    reset: () => {
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
  };
}
