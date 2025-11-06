import { cloneVec3, distanceVec3, lengthVec3, Vec3, vec3 } from '../../lib/math/vec3';
import { nextBehaviorState, RobotBehaviorMode } from '../../simulation/ai/behaviorState';
import { computeTeamAnchors } from '../../simulation/ai/captainCoordinator';
import { MovementContext, planRobotMovement } from '../../simulation/ai/pathing';
import {
  getLatestEnemyMemory,
  predictSearchAnchor,
  updateRobotSensors,
} from '../../simulation/ai/sensors';
import { findClosestEnemy, pickCaptainTarget } from '../../simulation/ai/targeting';
import { BattleWorld, RobotEntity } from '../world';
import { ARENA_BOUNDS } from '../../simulation/environment/arenaGeometry';

function buildNeighbors(robot: RobotEntity, allies: RobotEntity[]): Vec3[] {
  return allies
    .filter((ally) => ally.id !== robot.id)
    .filter((ally) => distanceVec3(ally.position, robot.position) < 2.5)
    .map((ally) => cloneVec3(ally.position));
}

export function updateAISystem(battleWorld: BattleWorld, rng: () => number): void {
  const robots = battleWorld.robots.entities;
  if (robots.length === 0) {
    return;
  }

  const anchors = computeTeamAnchors(robots);

  robots.forEach((robot) => {
    const allies = robots.filter((ally) => ally.team === robot.team && ally.health > 0);
    const { visibleEnemies } = updateRobotSensors(robot, robots, battleWorld.state.elapsedMs);

    // If we currently don't see any enemies, only respect very recent memory
    // for pursuing — otherwise the robot becomes passive and may roam.
    const ENGAGE_MEMORY_TIMEOUT_MS = 1500; // user-configured default

    let target: RobotEntity | undefined;
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

    if (target) {
      robot.ai.targetId = target.id;
      robot.ai.searchPosition = null;
      robot.ai.roamTarget = null;
      robot.ai.roamUntil = null;
    } else {
      const latestMemory = getLatestEnemyMemory(robot);
      const memoryEntry = latestMemory?.[1] ?? null;

      // Only pursue memory if it is recent enough (line-of-sight timeout)
      if (latestMemory && latestMemory[1].timestamp >= battleWorld.state.elapsedMs - ENGAGE_MEMORY_TIMEOUT_MS) {
        robot.ai.searchPosition = predictSearchAnchor(memoryEntry);
        robot.ai.targetId = latestMemory?.[0];
      } else {
        // Memory stale — clear pursuit and consider roaming
        robot.ai.searchPosition = null;
        robot.ai.targetId = undefined;

        const now = battleWorld.state.elapsedMs;
        const roamUntil = robot.ai.roamUntil ?? 0;
        if (!robot.ai.roamTarget || (roamUntil && roamUntil <= now)) {
          // pick a random roam point within arena bounds with a small margin
          const margin = 6;
          const minX = ARENA_BOUNDS.min.x + margin;
          const maxX = ARENA_BOUNDS.max.x - margin;
          const minZ = ARENA_BOUNDS.min.z + margin;
          const maxZ = ARENA_BOUNDS.max.z - margin;
          const rx = minX + rng() * (maxX - minX);
          const rz = minZ + rng() * (maxZ - minZ);
          const roamPoint = vec3(rx, 0, rz);
          robot.ai.roamTarget = roamPoint;
          // set searchPosition to roam target so pathing will go there
          robot.ai.searchPosition = roamPoint;
          robot.ai.roamUntil = now + 3000 + Math.floor(rng() * 4000);
        } else if (robot.ai.roamTarget) {
          // continue towards existing roam target
          robot.ai.searchPosition = robot.ai.roamTarget;
        }
      }
    }

    const targetDistance = target ? distanceVec3(robot.position, target.position) : null;
    robot.ai.targetDistance = targetDistance;

    const assignment = anchors[robot.id];
    const anchorCandidate = target
      ? assignment?.anchorPosition ?? null
      : robot.ai.searchPosition ?? assignment?.anchorPosition ?? null;
    robot.ai.anchorPosition = anchorCandidate;
    robot.ai.directive = assignment?.directive ?? robot.ai.directive ?? 'balanced';
    robot.ai.strafeSign = assignment?.strafeSign ?? robot.ai.strafeSign ?? 1;
    robot.ai.anchorDistance = anchorCandidate
      ? distanceVec3(robot.position, anchorCandidate)
      : robot.ai.anchorDistance ?? null;

    const behavior = nextBehaviorState(
      {
        health: robot.health,
        maxHealth: robot.maxHealth,
        mode:
          robot.ai.mode === 'retreat'
            ? RobotBehaviorMode.Retreat
            : robot.ai.mode === 'engage'
              ? RobotBehaviorMode.Engage
              : RobotBehaviorMode.Seek,
      },
      {
        targetDistance,
        anchorDistance: robot.ai.anchorDistance ?? null,
        rng,
      },
    );

    robot.ai.mode = behavior;

    const neighborPositions = buildNeighbors(robot, allies);
    const neighborsContext: MovementContext = {
      formationAnchor: anchorCandidate ?? undefined,
      strafeSign: robot.ai.strafeSign ?? 1,
      neighbors: neighborPositions.length > 0 ? neighborPositions : undefined,
    };

    const movementPlan = planRobotMovement(
      robot,
      behavior,
      target,
      undefined,
      neighborsContext,
    );

    robot.velocity = movementPlan.velocity;
    robot.orientation = movementPlan.orientation;
    robot.speed = lengthVec3(movementPlan.velocity);
  });
}
