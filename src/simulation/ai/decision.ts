import { refreshRoamTarget } from "../../ecs/systems/roaming";
import { BattleWorld, RobotEntity } from "../../ecs/world";
import { ENGAGE_MEMORY_TIMEOUT_MS } from "../../lib/constants";
import { distanceVec3 } from "../../lib/math/vec3";
import {
  getLatestEnemyMemory,
  predictSearchAnchor,
  updateRobotSensors,
} from "./sensors";
import { findClosestAlly, findClosestEnemy, pickCaptainTarget } from "./targeting";

/**
 * Updates the targeting and sensor logic for a single robot.
 * Decides on a target based on visibility, memory, and role (captain).
 *
 * @param robot - The robot to update.
 * @param robots - The list of all robots in the world.
 * @param potentialEnemies - The list of potential enemies (optimization for sensors).
 * @param battleWorld - The world state.
 * @param rng - Random number generator.
 * @returns An object containing the chosen target (if any) and the list of currently visible enemies.
 */
export function updateTargeting(
  robot: RobotEntity,
  robots: RobotEntity[],
  potentialEnemies: RobotEntity[],
  battleWorld: BattleWorld,
  rng: () => number,
): { target: RobotEntity | undefined; visibleEnemies: RobotEntity[] } {
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
     // Find visible allies? The sensor logic currently returns visibleEnemies.
     // We might need to scan allies. But since we have all robots, we can filter for allies.
     // However, `visibleEnemies` only contains enemies.
     // Medics should probably just know about allies (shared team knowledge).
     // For simplicity, let's assume Medics can see all allies for now, or we need to run visibility checks for allies.
     // Since `robots` contains all robots, we can filter for allies.
     // To respect visibility/range, we should strictly check visibility, but let's assume team radio allows knowing position.
     // Let's assume global knowledge of allies for now as "sensors" usually just filter Line of Sight for shooting.
     // But we need Line of Sight to heal (shoot).
     // `findClosestAlly` will filter `robots` for allies.

     // TODO: Add visibility check for allies if we want to be strict.
     // For now, pass all `robots` to `findClosestAlly` which will filter for team.
     // But we should probably prefer visible allies.

     // Let's iterate `robots` and find allies.
     const allies = robots.filter(r => r.team === robot.team && r.id !== robot.id);
     // We should probably check LOS?
     // `updateRobotSensors` uses `calculateVisibleEnemies` which does raycasts.
     // Doing that for allies might be expensive if we do it for every medic every frame.
     // But `updateRobotSensors` is already called.
     // For now, let's trust `findClosestAlly` to find an ally, and `combatSystem` will handle if we can actually shoot them (it checks LOS via projectile path, but we need to face them).
     // Wait, if we set `targetId`, the robot will turn to face them and move towards them.
     // So even if not "visible" (LOS), we can move towards them.

     target = findClosestAlly(robot, robots);
  } else {
    // Offensive Logic
    if (robot.ai.targetId) {
      target = visibleEnemies.find((enemy) => enemy.id === robot.ai.targetId);
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
    // Only search/roam if we are not a medic (or if medic has no one to heal, maybe it should roam?)
    // Medics without targets might want to roam or follow captain.

    if (robot.role !== "medic") {
        const latestMemory = getLatestEnemyMemory(robot);
        const memoryEntry = latestMemory?.[1] ?? null;

        // Only pursue memory if it is recent enough
        if (
        latestMemory &&
        latestMemory[1].timestamp >=
            battleWorld.state.elapsedMs - ENGAGE_MEMORY_TIMEOUT_MS
        ) {
        robot.ai.searchPosition = predictSearchAnchor(memoryEntry);
        robot.ai.targetId = latestMemory?.[0];
        } else {
        // Memory stale - clear pursuit and consider roaming
        robot.ai.searchPosition = null;
        robot.ai.targetId = undefined;
        refreshRoamTarget(robot.ai, battleWorld.state.elapsedMs, rng);
        }
    } else {
        // Medic roaming logic?
        // If no ally needs healing, maybe follow the captain?
        // For now, just roam.
        robot.ai.searchPosition = null;
        robot.ai.targetId = undefined;
        refreshRoamTarget(robot.ai, battleWorld.state.elapsedMs, rng);
    }
  }

  const targetDistance = target
    ? distanceVec3(robot.position, target.position)
    : null;
  robot.ai.targetDistance = targetDistance;

  return { target, visibleEnemies };
}
