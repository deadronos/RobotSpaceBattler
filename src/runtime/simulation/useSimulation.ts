import type { World as RapierWorld } from "@dimforge/rapier3d-compat";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useRef, useState } from "react";

import { BattleWorld } from "../../ecs/world";
import { recordRendererFrame } from "../../visuals/rendererStats";
import { BattleRunner, createBattleRunner } from "./battleRunner";
import { TelemetryPort } from "./ports";
import { MatchStateMachine } from "../state/matchStateMachine";

const FRAME_SAMPLE_INTERVAL = 1 / 30;

interface UseSimulationOptions {
  battleWorld: BattleWorld;
  matchMachine: MatchStateMachine;
  telemetry: TelemetryPort;
  onRunnerReady?: (runner: BattleRunner) => void;
  obstacleFixture?: Parameters<typeof createBattleRunner>[1]["obstacleFixture"];
}

/**
 * Custom hook to manage the simulation lifecycle and game loop.
 *
 * @param options - Simulation configuration.
 * @returns Object containing the current version for re-renders and the runner reference.
 */
export function useSimulation({
  battleWorld,
  matchMachine,
  telemetry,
  onRunnerReady,
  obstacleFixture,
}: UseSimulationOptions) {
  const runnerRef = useRef<BattleRunner | null>(null);
  const [version, setVersion] = useState(0);
  const accumulator = useRef(0);
  const { world: rapierWorld } = useRapier();

  // Initialize BattleRunner
  useEffect(() => {
    const runner = createBattleRunner(battleWorld, {
      seed: battleWorld.state.seed,
      matchMachine,
      telemetry,
      obstacleFixture,
    });

    runnerRef.current = runner;
    onRunnerReady?.(runner);

    return () => {
      runnerRef.current = null;
    };
  }, [battleWorld, matchMachine, telemetry, onRunnerReady, obstacleFixture]);

  // Expose for debugging
  useEffect(() => {
    const win = (window as unknown) as { __battleWorld?: typeof battleWorld };
    win.__battleWorld = battleWorld;
    return () => {
      delete win.__battleWorld;
    };
  }, [battleWorld]);

  // Sync Rapier World
  useEffect(() => {
    const runner = runnerRef.current;
    if (rapierWorld && runner) {
      runner.setRapierWorld(rapierWorld as unknown as RapierWorld);
    }
    return () => {
      if (runner) {
        runner.setRapierWorld(null);
      }
    };
  }, [rapierWorld]);

  // Game Loop
  useFrame((state, delta) => {
    recordRendererFrame(state.gl, delta);
    runnerRef.current?.step(delta);

    accumulator.current += delta;
    if (accumulator.current >= FRAME_SAMPLE_INTERVAL) {
      accumulator.current = 0;
      setVersion((v) => v + 1);
    }
  });

  return { version, runner: runnerRef.current };
}
