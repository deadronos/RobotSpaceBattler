import { ENGAGE_MEMORY_TIMEOUT_MS } from '../../lib/constants';
import { distanceVec3, lengthVec3 } from '../../lib/math/vec3';
import { perfMarkEnd, perfMarkStart } from '../../lib/perf';
import { isActiveRobot } from '../../lib/robotHelpers';
import { nextBehaviorState, RobotBehaviorMode } from '../../simulation/ai/behaviorState';
import { computeTeamAnchors } from '../../simulation/ai/captainCoordinator';
import { planRobotMovement } from '../../simulation/ai/pathing';
import type { MovementContext } from '../../simulation/ai/pathing/types';
import {
  getLatestEnemyMemory,
  predictSearchAnchor,
  updateRobotSensors,
} from '../../simulation/ai/sensors';
import { findClosestEnemy, pickCaptainTarget } from '../../simulation/ai/targeting';
import { BattleWorld, RobotEntity } from '../world';
import { buildNeighbors } from './aiNeighbors';
import { refreshRoamTarget } from './roaming';

/**
 * Updates the AI for all robots in the battle world.
 * Manages sensor updates, target selection, behavior state transitions, and movement planning.
 *
 * @param battleWorld - The current state of the battle world.
 * @param rng - A random number generator function.
 */
export function updateAISystem(battleWorld: BattleWorld, rng: () => number): void {
  perfMarkStart('updateAISystem');

  const robots = battleWorld.robots.entities;
  if (robots.length === 0) {
    perfMarkEnd('updateAISystem');
    return;
  }

  const anchors = computeTeamAnchors(robots);
  const robotsByTeam = new Map<string, RobotEntity[]>();

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!robotsByTeam.has(robot.team)) {
      robotsByTeam.set(robot.team, []);
    }

    if (isActiveRobot(robot)) {
      robotsByTeam.get(robot.team)?.push(robot);
    }
  }

  robots.forEach((robot) => {
    const allies = robotsByTeam.get(robot.team) ?? [];
    const { visibleEnemies } = updateRobotSensors(robot, robots, battleWorld.state.elapsedMs);

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

      // Only pursue memory if it is recent enough
      if (latestMemory && latestMemory[1].timestamp >= battleWorld.state.elapsedMs - ENGAGE_MEMORY_TIMEOUT_MS) {
        robot.ai.searchPosition = predictSearchAnchor(memoryEntry);
        robot.ai.targetId = latestMemory?.[0];
      } else {
        // Memory stale - clear pursuit and consider roaming
        robot.ai.searchPosition = null;
        robot.ai.targetId = undefined;
        refreshRoamTarget(robot.ai, battleWorld.state.elapsedMs, rng);
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

  perfMarkEnd('updateAISystem');
}
