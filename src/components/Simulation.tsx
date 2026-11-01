import { memo, useCallback } from "react";

import { BattleWorld } from "../ecs/world";
import { TEAM_IDENTITIES } from "../lib/teamConfig";
import {
  BattleRunner,
  createBattleRunner,
} from "../runtime/simulation/battleRunner";
import { TelemetryPort } from "../runtime/simulation/ports";
import { useSimulation } from "../runtime/simulation/useSimulation";
import { MatchStateMachine } from "../runtime/state/matchStateMachine";
import { useQualitySettings } from "../state/quality/QualityManager";
import { ObstacleVisual } from "../visuals/ObstacleVisual";
import { RobotPlaceholder } from "./RobotPlaceholder";
import { Scene } from "./Scene";
import { useEntityList } from "./useEntityList";
import { SpaceStation } from "./SpaceStation";
import { FallbackVfx } from "./vfx/FallbackVfx";
import { InstancedEffects } from "./vfx/InstancedEffects";
import { InstancedProjectiles } from "./vfx/InstancedProjectiles";
import { LaserBatchRenderer } from "./vfx/LaserBatchRenderer";

/**
 * Props for the Simulation component.
 */
interface SimulationProps {
  /** The BattleWorld instance containing simulation state. */
  battleWorld: BattleWorld;
  /** The state machine managing match lifecycle. */
  matchMachine: MatchStateMachine;
  /** Port for recording telemetry data. */
  telemetry: TelemetryPort;
  /** Optional callback when the battle runner is initialized. */
  onRunnerReady?: (runner: BattleRunner) => void;
  /** Optional obstacle fixture to seed matches in dev mode. */
  obstacleFixture?: Parameters<typeof createBattleRunner>[1]["obstacleFixture"];
  /** Whether to show the Perf overlay (off by default). */
  showPerfOverlay?: boolean;
}

/**
 * The core simulation component.
 * Integrates the ECS world, physics, and rendering.
 * Manages the BattleRunner lifecycle and updates.
 *
 * @param props - Component props.
 * @returns The Simulation component tree.
 */
export const Simulation = memo(function Simulation(props: SimulationProps) {
  return (
    <Scene showPerfOverlay={props.showPerfOverlay}>
      <SimulationContent {...props} />
    </Scene>
  );
});

/**
 * Internal content of the simulation scene.
 * Handles the game loop (useFrame), rendering of entities, and physics integration.
 */
function SimulationContent(props: SimulationProps) {
  const { battleWorld } = props;

  // Custom hook manages the ECS world lifecycle and system updates.
  useSimulation(props);

  const qualitySettings = useQualitySettings();
  const instancingEnabled = qualitySettings.visuals.instancing.enabled;
  const shadowsEnabled = qualitySettings.visuals.render.shadowsEnabled;
  const shadowMapSize = qualitySettings.visuals.render.shadowMapSize;
  const instanceManager = battleWorld.visuals.instanceManager;

  // Entities are never read into render-time snapshots here. Moving things are
  // updated imperatively from the ECS in useFrame; React only re-renders the
  // robot layer when a robot is added or removed (see useEntityList).
  const robots = useEntityList(battleWorld.robots);
  const obstacles = useEntityList(battleWorld.obstacles);
  const getTimeMs = useCallback(
    () => battleWorld.state.elapsedMs,
    [battleWorld],
  );

  return (
    <>
      <SpaceStation
        shadowsEnabled={shadowsEnabled}
        shadowMapSize={shadowMapSize}
      />
      {qualitySettings.visuals.obstacles.visualsEnabled
        ? obstacles.map((obstacle) => (
            <ObstacleVisual key={obstacle.id} obstacle={obstacle} />
          ))
        : null}
      {robots.map((robot) => (
        <RobotPlaceholder
          key={robot.id}
          robot={robot}
          color={TEAM_IDENTITIES[robot.team].color}
        />
      ))}
      {instancingEnabled ? (
        <>
          <InstancedProjectiles
            projectiles={battleWorld.projectiles}
            instanceManager={instanceManager}
          />
          <LaserBatchRenderer
            projectiles={battleWorld.projectiles}
            robots={battleWorld.robots}
            instanceManager={instanceManager}
          />
          <InstancedEffects
            effects={battleWorld.effects}
            instanceManager={instanceManager}
            getTimeMs={getTimeMs}
          />
        </>
      ) : null}
      <FallbackVfx
        battleWorld={battleWorld}
        instancingEnabled={instancingEnabled}
      />
    </>
  );
}
