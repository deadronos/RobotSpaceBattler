import {
  createContext,
  createElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import type { Team, Vector3, WeaponType } from "../types";
import {
  applyTeamComposition as applyTeamCompositionAPI,
} from "./api/configAPI";
import {
  eliminateRobot as eliminateRobotAPI,
  inflictDamage as inflictDamageAPI,
} from "./api/damageAPI";
import {
  calculateDistance as calculateDistanceAPI,
  getArenaConfig as getArenaConfigAPI,
  getProjectiles as getProjectilesAPI,
  getRobotById as getRobotByIdAPI,
  getSimulationState as getSimulationStateAPI,
} from "./api/queryAPI";
import {
  closeSettingsOverlay as closeSettingsOverlayInternal,
  closeStatsOverlay as closeStatsOverlayInternal,
  getPerformanceOverlayState as getPerformanceOverlayStateInternal,
  openSettingsOverlay as openSettingsOverlayInternal,
  openStatsOverlay as openStatsOverlayInternal,
  pauseAutoRestart as pauseAutoRestartInternal,
  recordFrameMetrics as recordFrameMetricsAPI,
  resetAutoRestartCountdown as resetAutoRestartCountdownInternal,
  resumeAutoRestart as resumeAutoRestartInternal,
  setAutoScalingEnabled as setAutoScalingEnabledAPI,
} from "./api/uiIntegration";
import { type ArenaEntity, createDefaultArena } from "./entities/Arena";
import { type Projectile } from "./entities/Projectile";
import {
  createInitialSimulationState,
  type SimulationState,
} from "./entities/SimulationState";
import { type TeamEntity } from "./entities/Team";
import { createECSCollections } from "./factories/createCollections";
import {
  createPhysicsProjectile as createPhysicsProjectileImpl,
} from "./factories/createProjectile";
import { createTeams } from "./factories/createTeams";
import {
  syncTeams,
} from "./management/battleStateManagement";
import {
  applyPhysicsImpulse as applyPhysicsImpulseInternal,
  getPhysicsSnapshot as getPhysicsSnapshotExternal,
  setPhysicsBodyPosition as setPhysicsBodyPositionInternal,
} from "./management/physicsManagement";
import {
  setRobotHealth as setRobotHealthInternal,
  setRobotKills as setRobotKillsInternal,
  setRobotPosition as setRobotPositionInternal,
} from "./management/robotManagement";
import { stepSimulation as stepSimulationImpl } from "./simulation/battleStep";
import {
  createPerformanceController,
  type PerformanceController,
} from "./simulation/performance";
import {
  createPhysicsState,
} from "./simulation/physics";
import { refreshTeamStats } from "./simulation/teamStats";
import type { WorldView } from "./simulation/worldTypes";
import { reassignCaptain } from "./systems/ai/captainAI";
import { spawnInitialTeams } from "./systems/spawnSystem";

export interface SimulationWorld extends WorldView {
  performance: PerformanceController;
}

const SimulationWorldContext = createContext<SimulationWorld | null>(null);

type SimulationWorldProviderProps = {
  value: SimulationWorld;
  children: ReactNode;
};

export function SimulationWorldProvider({
  value,
  children,
}: SimulationWorldProviderProps): ReactElement {
  const memoizedWorld = useMemo(() => value, [value]);
  return createElement(
    SimulationWorldContext.Provider,
    { value: memoizedWorld },
    children,
  );
}

export function useSimulationWorld(): SimulationWorld {
  const world = useContext(SimulationWorldContext);
  if (!world) {
    throw new Error(
      "useSimulationWorld must be used within a SimulationWorldProvider",
    );
  }
  return world;
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
  spawnInitialTeams(world, ["red", "blue"]);
  refreshTeamStats(world, ["red", "blue"]);
  syncTeams(world);
  return world;
}

function createPhysicsProjectile(
  world: SimulationWorld,
  config: {
    id?: string;
    ownerId: string;
    weaponType: WeaponType;
    position: Vector3;
    velocity: Vector3;
    damage?: number;
  },
): string {
  return createPhysicsProjectileImpl(world, config);
}

export function stepSimulation(
  world: SimulationWorld,
  deltaTime: number,
): void {
  stepSimulationImpl(world, deltaTime);
}

export function getProjectiles(world: SimulationWorld): Projectile[] {
  return getProjectilesAPI(world);
}
export function inflictDamage(
  world: SimulationWorld,
  robotId: string,
  amount: number,
): void {
  inflictDamageAPI(world, robotId, amount);
}

export function eliminateRobot(world: SimulationWorld, robotId: string): void {
  eliminateRobotAPI(world, robotId);
}

export function calculateDistance(a: Vector3, b: Vector3): number {
  return calculateDistanceAPI(a, b);
}

export { getDamageMultiplier } from "./systems/weaponSystem";

export function getSimulationState(world: SimulationWorld): SimulationState {
  return getSimulationStateAPI(world);
}

export function pauseAutoRestart(world: SimulationWorld): void {
  pauseAutoRestartInternal(world);
}

export function resumeAutoRestart(world: SimulationWorld): void {
  resumeAutoRestartInternal(world);
}

export function resetAutoRestartCountdown(world: SimulationWorld): void {
  resetAutoRestartCountdownInternal(world);
}

export function openStatsOverlay(world: SimulationWorld): void {
  openStatsOverlayInternal(world);
}

export function closeStatsOverlay(world: SimulationWorld): void {
  closeStatsOverlayInternal(world);
}

export function openSettingsOverlay(world: SimulationWorld): void {
  openSettingsOverlayInternal(world);
}

export function closeSettingsOverlay(world: SimulationWorld): void {
  closeSettingsOverlayInternal(world);
}

export function applyTeamComposition(
  world: SimulationWorld,
  config: Record<Team, unknown>,
): void {
  applyTeamCompositionAPI(world, config);
}

export function getArenaConfig(world: SimulationWorld): ArenaEntity {
  return getArenaConfigAPI(world);
}

export function recordFrameMetrics(world: SimulationWorld, fps: number): void {
  recordFrameMetricsAPI(world, fps);
}

export function setAutoScalingEnabled(
  world: SimulationWorld,
  enabled: boolean,
): void {
  setAutoScalingEnabledAPI(world, enabled);
}

export function getPerformanceOverlayState(world: SimulationWorld) {
  return getPerformanceOverlayStateInternal(world);
}

export function setPhysicsBodyPosition(
  world: SimulationWorld,
  robotId: string,
  position: Vector3,
): void {
  setPhysicsBodyPositionInternal(world, robotId, position);
}

export function applyPhysicsImpulse(
  world: SimulationWorld,
  robotId: string,
  impulse: Vector3,
): void {
  applyPhysicsImpulseInternal(world, robotId, impulse);
}

export function spawnPhysicsProjectile(
  world: SimulationWorld,
  config: {
    id?: string;
    ownerId: string;
    weaponType: WeaponType;
    position: Vector3;
    velocity: Vector3;
    damage?: number;
  },
): string {
  return createPhysicsProjectile(world, config);
}

export function getPhysicsSnapshot(world: SimulationWorld) {
  return getPhysicsSnapshotExternal(world);
}

export function getRobotById(world: SimulationWorld, robotId: string) {
  return getRobotByIdAPI(world, robotId);
}

export function setRobotHealth(
  world: SimulationWorld,
  robotId: string,
  health: number,
): void {
  setRobotHealthInternal(world, robotId, health);
}

export function setRobotKills(
  world: SimulationWorld,
  robotId: string,
  kills: number,
): void {
  setRobotKillsInternal(world, robotId, kills);
}

export function setRobotPosition(
  world: SimulationWorld,
  robotId: string,
  position: Vector3,
): void {
  setRobotPositionInternal(world, robotId, position);
}

export function triggerCaptainReelection(
  world: SimulationWorld,
  team: Team,
): void {
  reassignCaptain(world, team);
  refreshTeamStats(world, [team]);
}
