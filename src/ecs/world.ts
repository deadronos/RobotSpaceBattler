import { createContext, createElement, useContext, useMemo, type ReactElement, type ReactNode } from 'react';
import { World as MiniplexWorld } from 'miniplex';

import { createInitialSimulationState, setPendingTeamConfig, tickSimulation, type SimulationState } from './entities/SimulationState';
import { createDefaultArena, type ArenaEntity } from './entities/Arena';
import { createInitialTeam, resetTeamForRestart, type TeamEntity } from './entities/Team';
import type { Team, Vector3, WeaponType } from '../types';
import { createPhysicsState, getPhysicsSnapshot as getPhysicsSnapshotInternal, applyRobotImpulse, setRobotBodyPosition, spawnProjectileBody, stepPhysics } from './simulation/physics';
import { spawnInitialTeams } from './simulation/spawn';
import { applyMovement, fireWeapons, getAliveRobots, propagateCaptainTargets, updateBehaviors } from './simulation/aiController';
import { applyDamage, cleanupProjectiles, eliminateRobot as eliminateRobotInternal, handleProjectileHits } from './simulation/combat';
import { refreshTeamStats } from './simulation/teamStats';
import { evaluateVictory, openSettings, openStats, pauseAutoRestart as pauseCountdown, resetCountdown, resumeAutoRestart as resumeCountdown, tickVictoryCountdown, closeSettings, closeStats } from './simulation/victory';
import { createPerformanceController, getOverlayState, recordFrameMetrics as recordFrameMetricsInternal, setAutoScalingEnabled as setAutoScalingEnabledInternal, type PerformanceController } from './simulation/performance';
import { createProjectile, type Projectile } from './entities/Projectile';
import type { Robot } from './entities/Robot';
import { getWeaponData } from './systems/weaponSystem';
import { cloneVector } from './utils/vector';
import type { ECSCollections, WorldView } from './simulation/worldTypes';

export interface SimulationWorld extends WorldView {
  performance: PerformanceController;
}

const TEAM_LIST: Team[] = ['red', 'blue'];

const SimulationWorldContext = createContext<SimulationWorld | null>(null);

function createECSCollections(): ECSCollections {
  return {
    robots: new MiniplexWorld<Robot>(),
    projectiles: new MiniplexWorld<Projectile>(),
    teams: new MiniplexWorld<TeamEntity>(),
  };
}

type SimulationWorldProviderProps = {
  value: SimulationWorld;
  children: ReactNode;
};

export function SimulationWorldProvider({ value, children }: SimulationWorldProviderProps): ReactElement {
  const memoizedWorld = useMemo(() => value, [value]);
  return createElement(SimulationWorldContext.Provider, { value: memoizedWorld }, children);
}

export function useSimulationWorld(): SimulationWorld {
  const world = useContext(SimulationWorldContext);
  if (!world) {
    throw new Error('useSimulationWorld must be used within a SimulationWorldProvider');
  }
  return world;
}

function createTeams(arena: ArenaEntity): Record<Team, TeamEntity> {
  return {
    red: createInitialTeam('red', arena.spawnZones.red),
    blue: createInitialTeam('blue', arena.spawnZones.blue),
  };
}

function syncTeams(world: SimulationWorld): void {
  world.ecs.teams.clear();
  (Object.values(world.teams) as TeamEntity[]).forEach((team) => {
    world.ecs.teams.add(team);
  });
}

function resetBattle(world: SimulationWorld): void {
  world.entities = [];
  world.projectiles = [];
  world.physics = createPhysicsState();
  world.ecs.robots.clear();
  world.ecs.projectiles.clear();
  TEAM_LIST.forEach((team) => {
    world.teams[team] = resetTeamForRestart(world.teams[team]);
  });
  syncTeams(world);
  spawnInitialTeams(world, TEAM_LIST);
  refreshTeamStats(world, TEAM_LIST);
}

export function initializeSimulation(): SimulationWorld {
  const arena = createDefaultArena();
  const teams = createTeams(arena);
  const ecs = createECSCollections();
  (Object.values(teams) as TeamEntity[]).forEach((team) => {
    ecs.teams.add(team);
  });
  const world: SimulationWorld = {
    arena,
    entities: [],
    projectiles: [],
    teams,
    simulation: createInitialSimulationState(),
    physics: createPhysicsState(),
    performance: createPerformanceController(),
    ecs,
  };
  spawnInitialTeams(world, TEAM_LIST);
  refreshTeamStats(world, TEAM_LIST);
  syncTeams(world);
  return world;
}

function createPhysicsProjectile(world: SimulationWorld, config: {
  id?: string;
  ownerId: string;
  weaponType: WeaponType;
  position: Vector3;
  velocity: Vector3;
  damage?: number;
}): string {
  const id = config.id ?? `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const weapon = getWeaponData(config.weaponType);
  const projectile = createProjectile({
    id,
    ownerId: config.ownerId,
    weaponType: config.weaponType,
    position: cloneVector(config.position),
    velocity: cloneVector(config.velocity),
    damage: config.damage ?? weapon.baseDamage,
    distanceTraveled: 0,
    maxDistance: weapon.effectiveRange * 2,
    spawnTime: world.simulation.simulationTime,
    maxLifetime: 5,
  });
  world.projectiles.push(projectile);
  world.ecs.projectiles.add(projectile);
  spawnProjectileBody(world.physics, projectile);
  return id;
}

export function stepSimulation(world: SimulationWorld, deltaTime: number): void {
  const scaledDelta = deltaTime * world.simulation.timeScale;
  world.simulation = tickSimulation(world.simulation, deltaTime);

  getAliveRobots(world).forEach((robot) => {
    robot.stats.timeAlive += scaledDelta;
  });

  updateBehaviors(world);
  propagateCaptainTargets(world);
  applyMovement(world, scaledDelta);
  fireWeapons(world);

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

  world.simulation = evaluateVictory({ robots: world.entities, teams: world.teams, simulation: world.simulation });
  world.simulation = tickVictoryCountdown(
    { robots: world.entities, teams: world.teams, simulation: world.simulation },
    deltaTime,
    () => resetBattle(world)
  );
}

export function getProjectiles(world: SimulationWorld): Projectile[] {
  return world.projectiles;
}

export function inflictDamage(world: SimulationWorld, robotId: string, amount: number): void {
  applyDamage(world, robotId, amount);
}

export function eliminateRobot(world: SimulationWorld, robotId: string): void {
  eliminateRobotInternal(world, robotId);
}

export function calculateDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export { getDamageMultiplier } from './systems/weaponSystem';

export function getSimulationState(world: SimulationWorld): SimulationState {
  return world.simulation;
}

export function pauseAutoRestart(world: SimulationWorld): void {
  world.simulation = pauseCountdown({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function resumeAutoRestart(world: SimulationWorld): void {
  world.simulation = resumeCountdown({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function resetAutoRestartCountdown(world: SimulationWorld): void {
  world.simulation = resetCountdown({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function openStatsOverlay(world: SimulationWorld): void {
  world.simulation = openStats({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function closeStatsOverlay(world: SimulationWorld): void {
  world.simulation = closeStats({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function openSettingsOverlay(world: SimulationWorld): void {
  world.simulation = openSettings({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function closeSettingsOverlay(world: SimulationWorld): void {
  world.simulation = closeSettings({ robots: world.entities, teams: world.teams, simulation: world.simulation });
}

export function applyTeamComposition(world: SimulationWorld, config: Record<Team, unknown>): void {
  world.simulation = setPendingTeamConfig(world.simulation, config);
}

export function getArenaConfig(world: SimulationWorld): ArenaEntity {
  return world.arena;
}

export function recordFrameMetrics(world: SimulationWorld, fps: number): void {
  world.simulation = recordFrameMetricsInternal(world.performance, world.simulation, world.arena, fps);
}

export function setAutoScalingEnabled(world: SimulationWorld, enabled: boolean): void {
  setAutoScalingEnabledInternal(world.performance, enabled);
}

export function getPerformanceOverlayState(world: SimulationWorld) {
  return getOverlayState(world.performance);
}

export function setPhysicsBodyPosition(world: SimulationWorld, robotId: string, position: Vector3): void {
  const robot = world.entities.find((entity) => entity.id === robotId);
  if (!robot) {
    return;
  }
  robot.position = cloneVector(position);
  setRobotBodyPosition(world.physics, robot, position);
}

export function applyPhysicsImpulse(world: SimulationWorld, robotId: string, impulse: Vector3): void {
  const robot = world.entities.find((entity) => entity.id === robotId);
  if (!robot) {
    return;
  }
  applyRobotImpulse(world.physics, robot, impulse);
}

export function spawnPhysicsProjectile(world: SimulationWorld, config: {
  id?: string;
  ownerId: string;
  weaponType: WeaponType;
  position: Vector3;
  velocity: Vector3;
  damage?: number;
}): string {
  return createPhysicsProjectile(world, config);
}

export function getPhysicsSnapshot(world: SimulationWorld) {
  return getPhysicsSnapshotInternal(world.physics);
}

export function getRobotById(world: SimulationWorld, robotId: string) {
  return world.entities.find((robot) => robot.id === robotId);
}
