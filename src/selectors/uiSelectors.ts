import type { Team, WeaponType } from '../types';

export interface SnapshotTeamSummary {
  name: Team;
  label: string;
  activeRobots: number;
  eliminatedRobots: number;
  captainId: string | null;
  weaponDistribution: Record<WeaponType, number>;
}

export interface SnapshotRobotSummary {
  id: string;
  name: string;
  team: Team;
  weaponType: WeaponType;
  isCaptain: boolean;
  stats: {
    kills: number;
    damageDealt: number;
    damageTaken: number;
    timeAliveSeconds?: number;
    timeAlive?: number;
    shotsFired?: number;
  };
}

export interface VictorySnapshot {
  teams: SnapshotTeamSummary[];
  robots: SnapshotRobotSummary[];
  simulation: {
    status: string;
    winner: Team | 'draw' | null;
    simulationTime: number;
    autoRestartCountdown: number | null;
  };
  performance: {
    currentFPS: number;
    averageFPS: number;
    qualityScalingActive: boolean;
    autoScalingEnabled?: boolean;
  };
}

export interface TeamSummaryViewModel {
  teamId: Team;
  label: string;
  alive: number;
  eliminated: number;
  weaponDistribution: Record<WeaponType, number>;
  captain: { id: string; name: string; alive: boolean } | null;
}

export interface RobotStatRowViewModel {
  id: string;
  name: string;
  team: Team;
  weaponType: WeaponType;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  timeAliveSeconds: number;
  isCaptain: boolean;
}

export function buildTeamSummaries(
  snapshot: VictorySnapshot,
): TeamSummaryViewModel[] {
  const robotsById = new Map(snapshot.robots.map((robot) => [robot.id, robot]));

  return snapshot.teams.map((team) => {
    const captainRobot =
      team.captainId !== null ? robotsById.get(team.captainId) ?? null : null;

    const captain = captainRobot
      ? {
          id: captainRobot.id,
          name: captainRobot.name,
          alive: team.activeRobots > 0,
        }
      : null;

    return {
      teamId: team.name,
      label: team.label,
      alive: team.activeRobots,
      eliminated: team.eliminatedRobots,
      weaponDistribution: { ...team.weaponDistribution },
      captain,
    };
  });
}

function resolveTimeAlive(stats: SnapshotRobotSummary['stats']): number {
  if (typeof stats.timeAliveSeconds === 'number') {
    return stats.timeAliveSeconds;
  }

  if (typeof stats.timeAlive === 'number') {
    return stats.timeAlive;
  }

  return 0;
}

export function buildRobotStatRows(
  snapshot: VictorySnapshot,
): RobotStatRowViewModel[] {
  return snapshot.robots
    .map((robot) => ({
      id: robot.id,
      name: robot.name,
      team: robot.team,
      weaponType: robot.weaponType,
      kills: robot.stats.kills,
      damageDealt: robot.stats.damageDealt,
      damageTaken: robot.stats.damageTaken,
      timeAliveSeconds: resolveTimeAlive(robot.stats),
      isCaptain: robot.isCaptain,
    }))
    .sort((a, b) => {
      if (b.kills !== a.kills) {
        return b.kills - a.kills;
      }

      if (b.damageDealt !== a.damageDealt) {
        return b.damageDealt - a.damageDealt;
      }

      return a.name.localeCompare(b.name);
    });
}

export function formatCountdownLabel(countdown: number | null): string {
  if (countdown === null) {
    return 'Auto-restart paused';
  }

  const seconds = Math.max(0, Math.floor(countdown));
  const padded = seconds.toString().padStart(2, '0');
  return `Restarts in ${padded}s`;
}
