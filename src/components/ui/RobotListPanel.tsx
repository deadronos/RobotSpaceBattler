import { useEffect, useMemo, useRef, useState } from "react";
import Draggable from "react-draggable";

import type { BattleWorld } from "../../ecs/worldTypes";
import { isActiveRobot } from "../../lib/robotHelpers";
import { readStoredBoolean, writeStoredBoolean } from "../../lib/storedBoolean";
import { TEAM_IDENTITIES, TeamId } from "../../lib/teamConfig";
import { useTelemetryStore } from "../../state/telemetryStore";
import { useHudTick } from "./useHudTick";

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
  return {
    red: readStoredBoolean(ROBOT_LIST_COLLAPSE_RED_STORAGE_KEY, true),
    blue: readStoredBoolean(ROBOT_LIST_COLLAPSE_BLUE_STORAGE_KEY, true),
  };
}

export function RobotListPanel({ battleWorld }: RobotListPanelProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<TeamId, boolean>>(
    getStoredCollapseState,
  );

  useEffect(() => {
    writeStoredBoolean(ROBOT_LIST_COLLAPSE_RED_STORAGE_KEY, collapsed.red);
    writeStoredBoolean(ROBOT_LIST_COLLAPSE_BLUE_STORAGE_KEY, collapsed.blue);
  }, [collapsed]);

  const hudTick = useHudTick();

  const robotsByTeam = useMemo(() => {
    // Re-derive only on the throttled HUD tick. Health and AI mode are mutated
    // in place by the simulation, and telemetry stats change on every shot, so
    // subscribing to the telemetry store would re-render this panel at the
    // simulation rate. Read the stats imperatively instead.
    void hudTick;
    const robotStats = useTelemetryStore.getState().robots;

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
  }, [battleWorld, hudTick]);

  const toggleCollapsed = (teamId: TeamId) => {
    setCollapsed((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const renderTeamList = (teamId: TeamId) => {
    const robots = robotsByTeam[teamId];
    const isCollapsed = collapsed[teamId];
    const teamConfig = TEAM_IDENTITIES[teamId];

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
