/**
 * Battle Simulation Step Module
 *
 * Orchestrates the main simulation loop step execution.
 * Coordinates AI, physics, weapons, damage, and victory checks.
 */

import type { Team } from "../../types";
import { tickSimulation } from "../entities/SimulationState";
import { resetBattle } from "../management/battleStateManagement";
import { applyMovement, getAliveRobots, propagateCaptainTargets, updateBehaviors } from "../simulation/aiController";
import { stepPhysics } from "../simulation/physics";
import { refreshTeamStats } from "../simulation/teamStats";
import { evaluateVictory, tickVictoryCountdown } from "../simulation/victory";
import { cleanupProjectiles, handleProjectileHits } from "../systems/damageSystem";
import { capturePostBattleStats } from "../systems/statsSystem";
import { runWeaponSystem } from "../systems/weaponSystem";
import type { SimulationWorld } from "../world";

const TEAM_LIST: Team[] = ["red", "blue"];

/**
 * Execute one simulation step.
 *
 * Main orchestration function that:
 * 1. Updates simulation time and robot stats
 * 2. Runs AI behavior updates
 * 3. Applies movement and weapons
 * 4. Steps physics and handles collisions
 * 5. Checks for victory and updates countdown
 *
 * @param world - The simulation world
 * @param deltaTime - Time elapsed since last step (seconds)
 */
export function stepSimulation(
  world: SimulationWorld,
  deltaTime: number,
): void {
  const scaledDelta = deltaTime * world.simulation.timeScale;
  world.simulation = tickSimulation(world.simulation, deltaTime);

  getAliveRobots(world).forEach((robot) => {
    robot.stats.timeAlive += scaledDelta;
  });

  updateBehaviors(world);
  propagateCaptainTargets(world);
  applyMovement(world, scaledDelta);
  runWeaponSystem(world);

  const physicsResult = stepPhysics({
    state: world.physics,
    robots: world.entities,
    projectiles: world.projectiles,
    arena: world.arena,
    deltaTime: scaledDelta,
  });

  handleProjectileHits(world, physicsResult.hits);
  cleanupProjectiles(world, physicsResult.despawnedProjectiles);
  refreshTeamStats(world, TEAM_LIST);

  world.simulation = evaluateVictory({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
  // Capture a persistent snapshot of per-robot and per-team metrics when victory is detected
  world.simulation = capturePostBattleStats({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
  world.simulation = tickVictoryCountdown(
    {
      robots: world.entities,
      teams: world.teams,
      simulation: world.simulation,
    },
    deltaTime,
    () => {
      resetBattle(world);
      // post-battle stats are captured immediately after victory is evaluated; no-op here.
    },
  );
}
