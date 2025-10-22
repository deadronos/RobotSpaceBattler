import { useEffect, useState } from "react";

import { RobotEntity, TeamId, WeaponType } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { useSimulationStore } from "../../state/simulationStore";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const teamCardStyle = (team: TeamId): React.CSSProperties => ({
  padding: "18px 20px",
  borderRadius: "16px",
  background:
    "linear-gradient(180deg, rgba(18, 25, 50, 0.85) 0%, rgba(6, 9, 20, 0.9) 100%)",
  border: `1px solid ${team === "red" ? "rgba(255, 122, 166, 0.35)" : "rgba(92, 156, 255, 0.35)"}`,
  boxShadow: "0 16px 32px rgba(4, 6, 18, 0.45)",
  color: "#e4ebff",
});

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  marginBottom: "12px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#9aaaf6",
};

const valueStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
};

const weaponRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  marginTop: "12px",
  fontSize: "13px",
};

interface TeamSnapshot {
  averageHealth: number;
  weaponCounts: Record<WeaponType, number>;
}

const createInitialSnapshot = (): Record<TeamId, TeamSnapshot> => ({
  red: { averageHealth: 0, weaponCounts: { laser: 0, gun: 0, rocket: 0 } },
  blue: { averageHealth: 0, weaponCounts: { laser: 0, gun: 0, rocket: 0 } },
});

function TeamOverview() {
  const teamStats = useSimulationStore((state) => state.teamStats);
  const battleWorld = useSimulationStore((state) => state.battleWorld);
  const [snapshot, setSnapshot] = useState(createInitialSnapshot);

  useEffect(() => {
    if (!battleWorld) {
      setSnapshot(createInitialSnapshot());
      return;
    }

    if (typeof window === "undefined") {
      return () => undefined;
    }

    const updateSnapshot = () => {
      const liveStats = useSimulationStore.getState().teamStats;
      const result: Record<TeamId, TeamSnapshot> = createInitialSnapshot();

      const robots = battleWorld.robots.entities;
      const healthSums: Record<TeamId, number> = { red: 0, blue: 0 };

      robots.forEach((robot: RobotEntity) => {
        if (robot.health <= 0) {
          return;
        }
        result[robot.team].weaponCounts[robot.weapon] += 1;
        healthSums[robot.team] += robot.health;
      });

      (Object.keys(result) as TeamId[]).forEach((team) => {
        const active = liveStats[team].active || 0;
        result[team].averageHealth =
          active > 0 ? Math.round(healthSums[team] / active) : 0;
      });

      setSnapshot(result);
    };

    updateSnapshot();
    const interval = window.setInterval(updateSnapshot, 250);
    return () => window.clearInterval(interval);
  }, [battleWorld]);

  return (
    <div style={containerStyle}>
      {(Object.keys(teamStats) as TeamId[]).map((team) => {
        const config = TEAM_CONFIGS[team];
        const stats = teamStats[team];
        const teamSnapshot = snapshot[team];
        const captainLabel = stats.captainId
          ? `Captain: ${stats.captainId}`
          : "No captain";

        return (
          <div key={team} style={teamCardStyle(team)}>
            <div style={headerStyle}>
              <div>
                <div style={labelStyle}>{config.name}</div>
                <div style={valueStyle}>{stats.active} Active</div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: "13px",
                  color: "#c3d2ff",
                }}
              >
                <div>{captainLabel}</div>
                <div>Kills: {stats.totalKills}</div>
              </div>
            </div>
            <div style={{ fontSize: "13px", color: "#9fb3ff" }}>
              Eliminated: {stats.eliminations} · Avg health:{" "}
              {teamSnapshot?.averageHealth ?? 0}
            </div>
            <div style={weaponRowStyle}>
              {(["laser", "gun", "rocket"] as WeaponType[]).map((weapon) => (
                <span key={weapon}>
                  {weapon.charAt(0).toUpperCase() + weapon.slice(1)}:{" "}
                  {teamSnapshot?.weaponCounts[weapon] ?? 0}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TeamOverview;
