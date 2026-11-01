import { act, render, screen } from "@testing-library/react";
import { describe, beforeEach, expect, it, vi } from "vitest";

import { createBattleWorld } from "../../src/ecs/world";
import { useSimulation } from "../../src/runtime/simulation/useSimulation";
import type {
  BattleRunner,
  createBattleRunner,
} from "../../src/runtime/simulation/battleRunner";
import type { TelemetryPort } from "../../src/runtime/simulation/ports";
import type {
  MatchStateMachine,
  MatchStateSnapshot,
} from "../../src/runtime/state/matchStateMachine";
import type { recordRendererFrame } from "../../src/visuals/rendererStats";

const simulationTestState = vi.hoisted(() => {
  let frameCallback:
    | ((state: { gl: unknown }, delta: number) => void)
    | undefined;

  return {
    mockCreateBattleRunner: vi.fn<typeof createBattleRunner>(),
    mockRecordRendererFrame: vi.fn<typeof recordRendererFrame>(),
    mockRapierWorld: { id: "rapier-world" },
    clearFrameCallback: () => {
      frameCallback = undefined;
    },
    setFrameCallback: (
      callback: (state: { gl: unknown }, delta: number) => void,
    ) => {
      frameCallback = callback;
    },
    getFrameCallback: () => frameCallback,
  };
});

vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: (state: { gl: unknown }, delta: number) => void) => {
    simulationTestState.setFrameCallback(callback);
  },
}));

vi.mock("@react-three/rapier", () => ({
  useRapier: () => ({ world: simulationTestState.mockRapierWorld }),
}));

vi.mock("../../src/runtime/simulation/battleRunner", () => ({
  createBattleRunner: simulationTestState.mockCreateBattleRunner,
}));

vi.mock("../../src/visuals/rendererStats", () => ({
  recordRendererFrame: simulationTestState.mockRecordRendererFrame,
}));

function createMatchMachineStub() {
  return {
    start: vi.fn<MatchStateMachine["start"]>(),
    pause: vi.fn<MatchStateMachine["pause"]>(),
    resume: vi.fn<MatchStateMachine["resume"]>(),
    reset: vi.fn<MatchStateMachine["reset"]>(),
    declareVictory: vi.fn<MatchStateMachine["declareVictory"]>(),
    tick: vi.fn<MatchStateMachine["tick"]>(),
    getSnapshot: vi.fn<MatchStateMachine["getSnapshot"]>(
      () =>
        ({
          phase: "running",
          elapsedMs: 0,
          restartTimerMs: null,
          winner: null,
        }) as MatchStateSnapshot,
    ),
  } as any;
}

function createTelemetryStub() {
  return {
    reset: vi.fn<TelemetryPort["reset"]>(),
    recordSpawn: vi.fn<TelemetryPort["recordSpawn"]>(),
    recordFire: vi.fn<TelemetryPort["recordFire"]>(),
    recordDamage: vi.fn<TelemetryPort["recordDamage"]>(),
    recordDeath: vi.fn<TelemetryPort["recordDeath"]>(),
  } as any;
}

function HookHarness(props: {
  battleWorld: ReturnType<typeof createBattleWorld>;
  matchMachine: ReturnType<typeof createMatchMachineStub>;
  telemetry: ReturnType<typeof createTelemetryStub>;
}) {
  useSimulation(props);
  return <div data-testid="ready">ready</div>;
}

describe("useSimulation", () => {
  beforeEach(() => {
    simulationTestState.mockCreateBattleRunner.mockReset();
    simulationTestState.mockRecordRendererFrame.mockReset();
    simulationTestState.clearFrameCallback();
  });

  it("wires the Rapier world to each created runner and clears it on cleanup", () => {
    const firstRunner = {
      step: vi.fn<BattleRunner["step"]>(),
      advance: vi.fn<BattleRunner["advance"]>(),
      reset: vi.fn<BattleRunner["reset"]>(),
      setRapierWorld: vi.fn<BattleRunner["setRapierWorld"]>(),
      getRapierWorld: vi.fn<BattleRunner["getRapierWorld"]>(),
      dispose: vi.fn<BattleRunner["dispose"]>(),
    };
    const secondRunner = {
      step: vi.fn<BattleRunner["step"]>(),
      advance: vi.fn<BattleRunner["advance"]>(),
      reset: vi.fn<BattleRunner["reset"]>(),
      setRapierWorld: vi.fn<BattleRunner["setRapierWorld"]>(),
      getRapierWorld: vi.fn<BattleRunner["getRapierWorld"]>(),
      dispose: vi.fn<BattleRunner["dispose"]>(),
    };

    simulationTestState.mockCreateBattleRunner
      .mockReturnValueOnce(firstRunner)
      .mockReturnValueOnce(secondRunner);

    const battleWorld = createBattleWorld();
    const matchMachine = createMatchMachineStub();
    const { rerender, unmount } = render(
      <HookHarness
        battleWorld={battleWorld}
        matchMachine={matchMachine}
        telemetry={createTelemetryStub()}
      />,
    );

    expect(firstRunner.setRapierWorld).toHaveBeenCalledWith(
      simulationTestState.mockRapierWorld,
    );

    rerender(
      <HookHarness
        battleWorld={battleWorld}
        matchMachine={matchMachine}
        telemetry={createTelemetryStub()}
      />,
    );

    expect(firstRunner.setRapierWorld).toHaveBeenCalledWith(null);
    expect(secondRunner.setRapierWorld).toHaveBeenCalledWith(
      simulationTestState.mockRapierWorld,
    );

    unmount();

    expect(secondRunner.setRapierWorld).toHaveBeenLastCalledWith(null);
  });

  it("disposes the runner on unmount", () => {
    const runner = {
      step: vi.fn<BattleRunner["step"]>(),
      advance: vi.fn<BattleRunner["advance"]>(),
      reset: vi.fn<BattleRunner["reset"]>(),
      setRapierWorld: vi.fn<BattleRunner["setRapierWorld"]>(),
      getRapierWorld: vi.fn<BattleRunner["getRapierWorld"]>(),
      dispose: vi.fn<BattleRunner["dispose"]>(),
    };
    simulationTestState.mockCreateBattleRunner.mockReturnValueOnce(runner);

    const { unmount } = render(
      <HookHarness
        battleWorld={createBattleWorld()}
        matchMachine={createMatchMachineStub()}
        telemetry={createTelemetryStub()}
      />,
    );
    expect(runner.dispose).not.toHaveBeenCalled();

    unmount();

    expect(runner.dispose).toHaveBeenCalledTimes(1);
  });

  it("runs the simulation frame loop without forcing React version updates", () => {
    const runner = {
      step: vi.fn<BattleRunner["step"]>(),
      advance: vi.fn<BattleRunner["advance"]>(),
      reset: vi.fn<BattleRunner["reset"]>(),
      setRapierWorld: vi.fn<BattleRunner["setRapierWorld"]>(),
      getRapierWorld: vi.fn<BattleRunner["getRapierWorld"]>(),
      dispose: vi.fn<BattleRunner["dispose"]>(),
    };

    simulationTestState.mockCreateBattleRunner.mockReturnValue(runner);

    render(
      <HookHarness
        battleWorld={createBattleWorld()}
        matchMachine={createMatchMachineStub()}
        telemetry={createTelemetryStub()}
      />,
    );

    const frameCallback = simulationTestState.getFrameCallback();
    expect(frameCallback).toBeDefined();

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        frameCallback?.({ gl: {} }, 0.02);
      });
    }

    expect(runner.advance).toHaveBeenCalledWith(0.02);
    expect(runner.advance).toHaveBeenCalledTimes(5);
    expect(simulationTestState.mockRecordRendererFrame).toHaveBeenCalledTimes(
      5,
    );
    expect(screen.getByTestId("ready")).toHaveTextContent("ready");
  });
});
