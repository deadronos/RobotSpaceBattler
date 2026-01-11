import { useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";

import type { BattleWorld } from "../../ecs/worldTypes";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TEAM_CONFIGS, TeamId } from "../../lib/teamConfig";
import { useTelemetryStore } from "../../state/telemetryStore";

interface RobotListPanelProps {
  battleWorld: BattleWorld;
}

interface RobotDisplayData {
  id: string;
  spawnIndex: number;
  health: number;
  maxHealth: number;
  mode: string;
  targetId?: string;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  shotsFired: number;
  isAlive: boolean;
}

export function RobotListPanel({ battleWorld }: RobotListPanelProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<TeamId, boolean>>({
    red: false,
    blue: false,
  });

  const telemetryEvents = useTelemetryStore((state) => state.events);
  const robotStats = useTelemetryStore((state) => state.robots);

  const robotsByTeam = useMemo(() => {
    // Trigger re-render on telemetry events
    void telemetryEvents;

    const teams: Record<TeamId, RobotDisplayData[]> = {
      red: [],
      blue: [],
    };

    battleWorld.robots.entities.forEach((robot) => {
      const stats = robotStats[robot.id] || {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        shotsFired: 0,
      };

      const displayData: RobotDisplayData = {
        id: robot.id,
        spawnIndex: robot.spawnIndex,
        health: robot.health,
        maxHealth: robot.maxHealth,
        mode: robot.ai.mode,
        targetId: robot.ai.targetId,
        kills: stats.kills,
        damageDealt: stats.damageDealt,
        damageTaken: stats.damageTaken,
        shotsFired: stats.shotsFired,
        isAlive: isActiveRobot(robot),
      };

      teams[robot.team].push(displayData);
    });

    // Sort by spawn index
    teams.red.sort((a, b) => a.spawnIndex - b.spawnIndex);
    teams.blue.sort((a, b) => a.spawnIndex - b.spawnIndex);

    return teams;
  }, [battleWorld, telemetryEvents, robotStats]);

  const toggleCollapsed = (teamId: TeamId) => {
    setCollapsed((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const renderTeamList = (teamId: TeamId) => {
    const robots = robotsByTeam[teamId];
    const isCollapsed = collapsed[teamId];
    const teamConfig = TEAM_CONFIGS[teamId];

    return (
      <div key={teamId} className="robot-list-team">
        <button
          className="robot-list-team-header"
          onClick={() => toggleCollapsed(teamId)}
          style={{
            borderLeftColor: teamConfig.color,
          }}
        >
          <span className="robot-list-team-title">
            {teamConfig.label} ({robots.filter((r) => r.isAlive).length}/
            {robots.length})
          </span>
          <span className="robot-list-collapse-icon">
            {isCollapsed ? "▶" : "▼"}
          </span>
        </button>

        {!isCollapsed && (
          <div className="robot-list-robots">
            {robots.map((robot) => (
              <div
                key={robot.id}
                className={`robot-list-robot ${!robot.isAlive ? "robot-list-robot-dead" : ""}`}
              >
                <div className="robot-list-robot-header">
                  <span className="robot-list-robot-id">
                    #{robot.spawnIndex + 1}
                  </span>
                  <span className="robot-list-robot-health">
                    {robot.isAlive
                      ? `${Math.ceil(robot.health)}/${robot.maxHealth} HP`
                      : "DEAD"}
                  </span>
                </div>

                {robot.isAlive && (
                  <>
                    <div className="robot-list-robot-status">
                      <span className="robot-list-robot-mode">
                        {robot.mode.toUpperCase()}
                      </span>
                      {robot.targetId && (
                        <span className="robot-list-robot-target">
                          Target: #{getRobotSpawnIndex(robot.targetId, battleWorld)}
                        </span>
                      )}
                    </div>

                    <div className="robot-list-robot-stats">
                      <div className="robot-list-stat">
                        <span className="robot-list-stat-label">K</span>
                        <span className="robot-list-stat-value">
                          {robot.kills}
                        </span>
                      </div>
                      <div className="robot-list-stat">
                        <span className="robot-list-stat-label">D</span>
                        <span className="robot-list-stat-value">
                          {Math.floor(robot.damageDealt)}
                        </span>
                      </div>
                      <div className="robot-list-stat">
                        <span className="robot-list-stat-label">T</span>
                        <span className="robot-list-stat-value">
                          {Math.floor(robot.damageTaken)}
                        </span>
                      </div>
                      <div className="robot-list-stat">
                        <span className="robot-list-stat-label">S</span>
                        <span className="robot-list-stat-value">
                          {robot.shotsFired}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Draggable handle=".robot-list-drag-handle" bounds="parent" nodeRef={nodeRef}>
      <div className="robot-list-panel" ref={nodeRef}>
        <div className="robot-list-drag-handle">
          <span className="robot-list-title">Robot Status</span>
          <span className="robot-list-drag-icon">⋮⋮</span>
        </div>
        <div className="robot-list-content">
          {renderTeamList("red")}
          {renderTeamList("blue")}
        </div>
      </div>
    </Draggable>
  );
}

function getRobotSpawnIndex(
  robotId: string,
  battleWorld: BattleWorld,
): number {
  const robot = battleWorld.robots.entities.find((r) => r.id === robotId);
  return robot ? robot.spawnIndex + 1 : 0;
}
