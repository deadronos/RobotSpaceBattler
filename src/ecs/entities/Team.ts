import type { SpawnZone, Team as TeamName, Vector3 } from "../../types";

export interface TeamStats {
  totalKills: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  averageHealthRemaining: number;
  weaponDistribution: Record<"laser" | "gun" | "rocket", number>;
}

export interface TeamEntity {
  name: TeamName;
  activeRobots: number;
  eliminatedRobots: number;
  captainId: string | null;
  spawnZone: SpawnZone;
  aggregateStats: TeamStats;
}

export function createInitialTeam(
  name: TeamName,
  spawnZone: SpawnZone,
): TeamEntity {
  return {
    name,
    activeRobots: 10,
    eliminatedRobots: 0,
    captainId: null,
    spawnZone,
    aggregateStats: {
      totalKills: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      averageHealthRemaining: 100,
      weaponDistribution: {
        laser: 0,
        gun: 0,
        rocket: 0,
      },
    },
  };
}

export function updateTeamCounts(team: TeamEntity, active: number): TeamEntity {
  const eliminatedRobots = 10 - active;
  return {
    ...team,
    activeRobots: active,
    eliminatedRobots,
  };
}

export function updateTeamCaptain(
  team: TeamEntity,
  captainId: string | null,
): TeamEntity {
  return {
    ...team,
    captainId,
  };
}

export function updateTeamStats(
  team: TeamEntity,
  healthValues: number[],
  weaponTypes: Record<string, "laser" | "gun" | "rocket">,
): TeamEntity {
  const aliveHealth = healthValues.filter((value) => value > 0);
  const averageHealthRemaining = aliveHealth.length
    ? aliveHealth.reduce((sum, value) => sum + value, 0) / aliveHealth.length
    : 0;

  const weaponDistribution: Record<"laser" | "gun" | "rocket", number> = {
    laser: 0,
    gun: 0,
    rocket: 0,
  };

  Object.values(weaponTypes).forEach((weapon) => {
    weaponDistribution[weapon] += 1;
  });

  return {
    ...team,
    aggregateStats: {
      ...team.aggregateStats,
      averageHealthRemaining,
      weaponDistribution,
    },
  };
}

export function recordKill(team: TeamEntity): TeamEntity {
  return {
    ...team,
    aggregateStats: {
      ...team.aggregateStats,
      totalKills: team.aggregateStats.totalKills + 1,
    },
  };
}

export function recordDamageDealt(
  team: TeamEntity,
  amount: number,
): TeamEntity {
  return {
    ...team,
    aggregateStats: {
      ...team.aggregateStats,
      totalDamageDealt: team.aggregateStats.totalDamageDealt + amount,
    },
  };
}

export function recordDamageTaken(
  team: TeamEntity,
  amount: number,
): TeamEntity {
  return {
    ...team,
    aggregateStats: {
      ...team.aggregateStats,
      totalDamageTaken: team.aggregateStats.totalDamageTaken + amount,
    },
  };
}

export function getTeamCenter(team: TeamEntity): Vector3 {
  return team.spawnZone.center;
}

export function isTeamEliminated(team: TeamEntity): boolean {
  return team.activeRobots === 0;
}

export function resetTeamForRestart(team: TeamEntity): TeamEntity {
  return {
    ...team,
    activeRobots: 10,
    eliminatedRobots: 0,
    captainId: null,
  };
}
