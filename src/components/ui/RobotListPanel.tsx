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

const ROBOT_LIST_COLLAPSE_RED_STORAGE_KEY = "hud.robotListCollapse.red";
const ROBOT_LIST_COLLAPSE_BLUE_STORAGE_KEY = "hud.robotListCollapse.blue";

function getStoredCollapseState(): Record<TeamId, boolean> {
  if (typeof window === "undefined") {
    return { red: true, blue: true };
  }

  const red = window.localStorage.getItem(ROBOT_LIST_COLLAPSE_RED_STORAGE_KEY);
  const blue = window.localStorage.getItem(
    ROBOT_LIST_COLLAPSE_BLUE_STORAGE_KEY,
  );

  return {
    red: red == null ? true : red === "1",
    blue: blue == null ? true : blue === "1",
  };
}

export function RobotListPanel({ battleWorld }: RobotListPanelProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<TeamId, boolean>>(
    getStoredCollapseState,
  );

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
    setCollapsed((prev) => {
      const next = {
        ...prev,
        [teamId]: !prev[teamId],
      };
      window.localStorage.setItem(
        ROBOT_LIST_COLLAPSE_RED_STORAGE_KEY,
        next.red ? "1" : "0",
      );
      window.localStorage.setItem(
        ROBOT_LIST_COLLAPSE_BLUE_STORAGE_KEY,
        next.blue ? "1" : "0",
      );
      return next;
    });
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
                <span className="robot-list-robot-id">
                  #{robot.spawnIndex + 1}
                </span>
                <span className="robot-list-robot-health">
                  {robot.isAlive
                    ? `${Math.ceil(robot.health)}/${robot.maxHealth}`
                    : "DEAD"}
                </span>
                {robot.isAlive && (
                  <>
                    <span className="robot-list-robot-mode">
                      {robot.mode.toUpperCase()}
                    </span>
                    <span className="robot-list-robot-target">
                      {robot.targetId
                        ? `→#${getRobotSpawnIndex(robot.targetId, battleWorld)}`
                        : "-"}
                    </span>
                    <span className="robot-list-robot-stat">
                      K:{robot.kills}
                    </span>
                    <span className="robot-list-robot-stat">
                      D:{Math.floor(robot.damageDealt)}
                    </span>
                    <span className="robot-list-robot-stat">
                      T:{Math.floor(robot.damageTaken)}
                    </span>
                    <span className="robot-list-robot-stat">
                      S:{robot.shotsFired}
                    </span>
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
    <Draggable
      handle=".robot-list-drag-handle"
      bounds="parent"
      nodeRef={nodeRef}
    >
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

function getRobotSpawnIndex(robotId: string, battleWorld: BattleWorld): number {
  const robot = battleWorld.robots.entities.find((r) => r.id === robotId);
  return robot ? robot.spawnIndex + 1 : 0;
}
