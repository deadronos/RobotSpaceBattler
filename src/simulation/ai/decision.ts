import { refreshRoamTarget } from "../../ecs/systems/roaming";
import { BattleWorld, RobotEntity } from "../../ecs/world";
import { ENGAGE_MEMORY_TIMEOUT_MS } from "../../lib/constants";
import { distanceVec3 } from "../../lib/math/vec3";
import { isLineOfSightBlockedRuntime } from "../environment/arenaGeometry";
import {
  getLatestEnemyMemory,
  predictSearchAnchor,
  updateRobotSensors,
} from "./sensors";
import {
  findClosestAlly,
  findClosestEnemy,
  pickCaptainTarget,
} from "./targeting";

// Scratch buffers reused across calls (the simulation is single threaded).
const visibleAlliesScratch: RobotEntity[] = [];
const losOptionsScratch: {
  obstacles: BattleWorld["obstacles"]["entities"] | undefined;
} = { obstacles: undefined };

/** Result of `updateTargeting`. The object is reused between calls. */
export interface TargetingResult {
  target: RobotEntity | undefined;
  visibleEnemies: RobotEntity[];
}
const targetingResultScratch: TargetingResult = {
  target: undefined,
  visibleEnemies: [],
};

/**
 * Updates the targeting and sensor logic for a single robot.
 * Decides on a target based on visibility, memory, and role (captain).
 *
 * @param robot - The robot to update.
 * @param robots - The list of all robots in the world.
 * @param potentialEnemies - The list of potential enemies (optimization for sensors).
 * @param battleWorld - The world state.
 * @param rng - Random number generator.
 * @param potentialAllies - Optional list of potential allies (optimization for medics).
 * @returns The chosen target (if any) and the currently visible enemies. The
 * returned object and array are scratch buffers: read them before the next call.
 */
export function updateTargeting(
  robot: RobotEntity,
  robots: RobotEntity[],
  potentialEnemies: RobotEntity[],
  battleWorld: BattleWorld,
  rng: () => number,
  potentialAllies?: RobotEntity[],
): TargetingResult {
  // Sensors mainly update enemy visibility
  const { visibleEnemies } = updateRobotSensors(
    robot,
    robots,
    battleWorld.state.elapsedMs,
    battleWorld,
    potentialEnemies,
  );

  let target: RobotEntity | undefined;

  // Medic Logic: Target Allies
  if (robot.role === "medic") {
    const allies = potentialAllies ?? robots;

    const visibleAllies = visibleAlliesScratch;
    let visibleCount = 0;
    losOptionsScratch.obstacles = battleWorld.obstacles.entities;
    for (let i = 0; i < allies.length; i += 1) {
      const ally = allies[i];
      if (
        ally.id !== robot.id &&
        ally.team === robot.team &&
        !isLineOfSightBlockedRuntime(
          robot.position,
          ally.position,
          losOptionsScratch,
        )
      ) {
        visibleAllies[visibleCount] = ally;
        visibleCount += 1;
      }
    }
    if (visibleAllies.length !== visibleCount) {
      visibleAllies.length = visibleCount;
    }

    target = findClosestAlly(
      robot,
      visibleAllies.length > 0 ? visibleAllies : allies,
    );
  } else {
    // Offensive Logic
    if (robot.ai.targetId) {
      const targetId = robot.ai.targetId;
      for (let i = 0; i < visibleEnemies.length; i += 1) {
        if (visibleEnemies[i].id === targetId) {
          target = visibleEnemies[i];
          break;
        }
      }
    }

    if (!target) {
      if (robot.isCaptain) {
        target = pickCaptainTarget(robot, robots, visibleEnemies);
      }
    }

    if (!target) {
      target = findClosestEnemy(robot, robots, visibleEnemies) ?? undefined;
    }
  }

  if (target) {
    robot.ai.targetId = target.id;
    robot.ai.searchPosition = null;
    robot.ai.roamTarget = null;
    robot.ai.roamUntil = null;
  } else {
    if (robot.role !== "medic") {
      const latestMemory = getLatestEnemyMemory(robot);
      const memoryEntry = latestMemory?.[1] ?? null;

      // Only pursue memory if it is recent enough
      if (
        latestMemory &&
        latestMemory[1].timestamp >=
          battleWorld.state.elapsedMs - ENGAGE_MEMORY_TIMEOUT_MS
      ) {
        // Remembered positions do not change while the enemy is out of
        // sight, so keep the existing anchor instead of cloning every tick.
        const current = robot.ai.searchPosition;
        const remembered = memoryEntry?.position;
        if (
          !current ||
          !remembered ||
          current.x !== remembered.x ||
          current.y !== remembered.y ||
          current.z !== remembered.z
        ) {
          robot.ai.searchPosition = predictSearchAnchor(memoryEntry);
        }
        robot.ai.targetId = latestMemory?.[0];
      } else {
        // Memory stale - clear pursuit and consider roaming
        robot.ai.searchPosition = null;
        robot.ai.targetId = undefined;
        refreshRoamTarget(robot.ai, battleWorld.state.elapsedMs, rng);
      }
    } else {
      // Medic roaming logic
      robot.ai.searchPosition = null;
      robot.ai.targetId = undefined;
      refreshRoamTarget(robot.ai, battleWorld.state.elapsedMs, rng);
    }
  }

  const targetDistance = target
    ? distanceVec3(robot.position, target.position)
    : null;
  robot.ai.targetDistance = targetDistance;

  targetingResultScratch.target = target;
  targetingResultScratch.visibleEnemies = visibleEnemies;
  return targetingResultScratch;
}
