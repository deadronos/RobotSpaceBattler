import { useEffect, useMemo, useRef, useState } from "react";

import type { Robot } from "../ecs/entities/Robot";
import type { PostBattleStats } from "../ecs/entities/SimulationState";
import { useSimulationWorld } from "../ecs/world";
import type { Team } from "../types";

export interface PostBattleTeamSummary {
  teamId: Team | string;
  label: string;
  totalKills: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  averageHealthRemaining: number;
}

export interface PostBattleRobotStat {
  id: string;
  name: string;
  team: Team | string;
  weaponType: string;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  timeAliveSeconds: number;
  timeAliveLabel: string;
  shotsFired: number;
  isCaptain: boolean;
}

export interface PostBattleStatsResult {
  hasStats: boolean;
  winner: Team | "draw" | null;
  computedAt: number | null;
  teamSummaries: PostBattleTeamSummary[];
  robotStats: PostBattleRobotStat[];
  totals: {
    kills: number;
    damageDealt: number;
    damageTaken: number;
  };
}

type RobotMetadata = Pick<Robot, "id" | "team" | "weaponType" | "isCaptain">;

interface PostBattleSnapshot {
  stats: PostBattleStats | null;
  robots: RobotMetadata[];
  winner: Team | "draw" | null;
}

function subscribeToWorld(world: ReturnType<typeof useSimulationWorld>) {
  return (listener: () => void) => {
    const unsubscribers: Array<() => void> = [
      world.ecs.robots.onEntityAdded.subscribe(listener),
      world.ecs.robots.onEntityRemoved.subscribe(listener),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  };
}

function createSnapshot(
  world: ReturnType<typeof useSimulationWorld>,
): PostBattleSnapshot {
  return {
    stats: world.simulation.postBattleStats ?? null,
    robots: world.ecs.robots.entities.map((robot) => ({
      id: robot.id,
      team: robot.team,
      weaponType: robot.weaponType,
      isCaptain: robot.isCaptain,
    })),
    winner: world.simulation.winner ?? null,
  };
}

function formatTeamLabel(team: Team | string): string {
  switch (team) {
    case "red":
      return "Red Team";
    case "blue":
      return "Blue Team";
    default:
      return String(team);
  }
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (minutes <= 0) {
    return `${secs}s`;
  }
  return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

function buildRobotStats(
  snapshot: PostBattleStats | null,
  robots: RobotMetadata[],
): PostBattleRobotStat[] {
  if (!snapshot) {
    return [];
  }

  const robotLookup = new Map<string, RobotMetadata>();
  robots.forEach((robot) => {
    robotLookup.set(robot.id, robot);
  });

  return Object.entries(snapshot.perRobot)
    .map(([id, stats]) => {
      const robot = robotLookup.get(id) ?? null;
      return {
        id,
        name: robot?.id ?? id,
        team: robot?.team ?? "unknown",
        weaponType: robot?.weaponType ?? "unknown",
        kills: stats.kills,
        damageDealt: stats.damageDealt,
        damageTaken: stats.damageTaken,
        timeAliveSeconds: stats.timeAlive,
        timeAliveLabel: formatDuration(stats.timeAlive),
        shotsFired: stats.shotsFired,
        isCaptain: robot?.isCaptain ?? false,
      };
    })
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

function buildTeamSummariesFromStats(
  snapshot: PostBattleStats | null,
): PostBattleTeamSummary[] {
  if (!snapshot) {
    return [];
  }

  return (
    Object.entries(snapshot.perTeam) as Array<
      [Team | string, PostBattleStats["perTeam"][Team]]
    >
  ).map(([teamId, stats]) => ({
    teamId,
    label: formatTeamLabel(teamId),
    totalKills: stats.totalKills,
    totalDamageDealt: stats.totalDamageDealt,
    totalDamageTaken: stats.totalDamageTaken,
    averageHealthRemaining: stats.averageHealthRemaining,
  }));
}

export function usePostBattleStats(): PostBattleStatsResult {
  const world = useSimulationWorld();
  const [snapshot, setSnapshot] = useState<PostBattleSnapshot>(() =>
    createSnapshot(world),
  );
  const signatureRef = useRef<string>(JSON.stringify(snapshot));

  useEffect(() => {
    const handleUpdate = () => {
      const next = createSnapshot(world);
      const signature = JSON.stringify(next);
      if (signatureRef.current !== signature) {
        signatureRef.current = signature;
        setSnapshot(next);
      }
    };

    const unsubscribe = subscribeToWorld(world)(handleUpdate);
    let intervalId: number | undefined;
    if (typeof window !== "undefined") {
      intervalId = window.setInterval(handleUpdate, 300);
    }

    return () => {
      unsubscribe();
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [world]);

  return useMemo(() => {
    const teamSummaries = buildTeamSummariesFromStats(snapshot.stats);
    const robotStats = buildRobotStats(snapshot.stats, snapshot.robots);

    const totals = teamSummaries.reduce(
      (acc, team) => ({
        kills: acc.kills + team.totalKills,
        damageDealt: acc.damageDealt + team.totalDamageDealt,
        damageTaken: acc.damageTaken + team.totalDamageTaken,
      }),
      { kills: 0, damageDealt: 0, damageTaken: 0 },
    );

    return {
      hasStats: !!snapshot.stats,
      winner: snapshot.winner,
      computedAt: snapshot.stats?.computedAt ?? null,
      teamSummaries,
      robotStats,
      totals,
    };
  }, [snapshot]);
}

export default usePostBattleStats;
