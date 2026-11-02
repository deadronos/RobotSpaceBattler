import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { BattleWorld } from "../../ecs/world";
import { canExposeDebugGlobals } from "../../lib/debugFlags";
import { recordRendererFrame } from "../../visuals/rendererStats";
import { MatchStateMachine } from "../state/matchStateMachine";
import { BattleRunner, createBattleRunner } from "./battleRunner";
import { TelemetryPort } from "./ports";

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
      runner.dispose();
      if (runnerRef.current === runner) {
        runnerRef.current = null;
      }
    };
  }, [battleWorld, matchMachine, obstacleFixture, onRunnerReady, telemetry]);

  // Expose for debugging
  useEffect(() => {
    if (!canExposeDebugGlobals()) {
      return;
    }

    const win = window as unknown as { __battleWorld?: typeof battleWorld };
    win.__battleWorld = battleWorld;
    return () => {
      delete win.__battleWorld;
    };
  }, [battleWorld]);

  // Game Loop
  useFrame((state, delta) => {
    recordRendererFrame(state.gl, delta);
    // Fixed 60 Hz sim with an accumulator + substep cap lives in the runner.
    runnerRef.current?.advance(delta);
  });

  return { runner: runnerRef.current };
}
