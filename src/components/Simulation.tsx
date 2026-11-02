import { memo, useCallback } from "react";

import { BattleWorld } from "../ecs/world";
import {
  BattleRunner,
  createBattleRunner,
} from "../runtime/simulation/battleRunner";
import { TelemetryPort } from "../runtime/simulation/ports";
import { useSimulation } from "../runtime/simulation/useSimulation";
import { MatchStateMachine } from "../runtime/state/matchStateMachine";
import { useQualitySettings } from "../state/quality/QualityManager";
import { ObstacleVisual } from "../visuals/ObstacleVisual";
import { resolveMotionEffects } from "../visuals/reducedMotion";
import { RobotInstances } from "./robots/RobotInstances";
import { TeamMarkers } from "./robots/TeamMarkers";
import { Scene } from "./Scene";
import { useEntityList } from "./useEntityList";
import { SpaceStation } from "./SpaceStation";
import { FallbackVfx } from "./vfx/FallbackVfx";
import { InstancedEffects } from "./vfx/InstancedEffects";
import { InstancedFlashes } from "./vfx/InstancedFlashes";
import { InstancedProjectiles } from "./vfx/InstancedProjectiles";
import { RobotHealthBars } from "./vfx/RobotHealthBars";
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
  /** Simulation speed multiplier (#170). */
  speed?: number;
  /** Reduced motion hides optional flash VFX (#166). */
  reducedMotion?: boolean;
  /** Use the colour-blind-safe team palette (#166). */
  colorBlindPalette?: boolean;
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
    <Scene
      showPerfOverlay={props.showPerfOverlay}
      reducedMotion={props.reducedMotion}
    >
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
  const motion = resolveMotionEffects({
    postprocessingEnabled: qualitySettings.visuals.postprocessing.enabled,
    reducedMotion: props.reducedMotion ?? false,
  });
  const instancingEnabled = qualitySettings.visuals.instancing.enabled;
  const instanceManager = battleWorld.visuals.instanceManager;

  // Entities are never read into render-time snapshots here. Robots, health
  // bars and combat flashes are projected from the ECS in useFrame, so adding
  // or removing a robot does not re-render React at all. Obstacles still use
  // useEntityList because each one is a separate mounted component.
  const obstacles = useEntityList(battleWorld.obstacles);
  const getTimeMs = useCallback(
    () => battleWorld.state.elapsedMs,
    [battleWorld],
  );

  return (
    <>
      <SpaceStation />
      {qualitySettings.visuals.obstacles.visualsEnabled
        ? obstacles.map((obstacle) => (
            <ObstacleVisual key={obstacle.id} obstacle={obstacle} />
          ))
        : null}
      <RobotInstances
        battleWorld={battleWorld}
        colorBlindPalette={props.colorBlindPalette}
      />
      <RobotHealthBars robots={battleWorld.robots} />
      <TeamMarkers
        robots={battleWorld.robots}
        colorBlindPalette={props.colorBlindPalette}
      />
      {motion.hitAndMuzzleFlashes ? (
        <InstancedFlashes
          robots={battleWorld.robots}
          instanceManager={instanceManager}
          getTimeMs={getTimeMs}
        />
      ) : null}
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
