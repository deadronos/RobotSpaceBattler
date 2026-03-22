import { act, render, screen } from '@testing-library/react';
import { describe, beforeEach, expect, it, vi } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { useSimulation } from '../../src/runtime/simulation/useSimulation';

const simulationTestState = vi.hoisted(() => {
  let frameCallback:
    | ((state: { gl: unknown }, delta: number) => void)
    | undefined;

  return {
    mockCreateBattleRunner: vi.fn(),
    mockRecordRendererFrame: vi.fn(),
    mockRapierWorld: { id: 'rapier-world' },
    clearFrameCallback: () => {
      frameCallback = undefined;
    },
    setFrameCallback: (callback: (state: { gl: unknown }, delta: number) => void) => {
      frameCallback = callback;
    },
    getFrameCallback: () => frameCallback,
  };
});

vi.mock('@react-three/fiber', () => ({
  useFrame: (callback: (state: { gl: unknown }, delta: number) => void) => {
    simulationTestState.setFrameCallback(callback);
  },
}));

vi.mock('@react-three/rapier', () => ({
  useRapier: () => ({ world: simulationTestState.mockRapierWorld }),
}));

vi.mock('../../src/runtime/simulation/battleRunner', () => ({
  createBattleRunner: simulationTestState.mockCreateBattleRunner,
}));

vi.mock('../../src/visuals/rendererStats', () => ({
  recordRendererFrame: simulationTestState.mockRecordRendererFrame,
}));

function createMatchMachineStub() {
  return {
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    declareVictory: vi.fn(),
    tick: vi.fn(),
    getSnapshot: vi.fn(() => ({
      phase: 'running',
      elapsedMs: 0,
      restartTimerMs: null,
      winner: null,
    })),
  } as any;
}

function createTelemetryStub() {
  return {
    reset: vi.fn(),
    recordSpawn: vi.fn(),
    recordFire: vi.fn(),
    recordDamage: vi.fn(),
    recordDeath: vi.fn(),
  } as any;
}

function HookHarness(props: {
  battleWorld: ReturnType<typeof createBattleWorld>;
  matchMachine: ReturnType<typeof createMatchMachineStub>;
  telemetry: ReturnType<typeof createTelemetryStub>;
}) {
  const { version } = useSimulation(props);
  return <div data-testid="version">{version}</div>;
}

describe('useSimulation', () => {
  beforeEach(() => {
    simulationTestState.mockCreateBattleRunner.mockReset();
    simulationTestState.mockRecordRendererFrame.mockReset();
    simulationTestState.clearFrameCallback();
  });

  it('wires the Rapier world to each created runner and clears it on cleanup', () => {
    const firstRunner = {
      step: vi.fn(),
      reset: vi.fn(),
      setRapierWorld: vi.fn(),
      getRapierWorld: vi.fn(),
    };
    const secondRunner = {
      step: vi.fn(),
      reset: vi.fn(),
      setRapierWorld: vi.fn(),
      getRapierWorld: vi.fn(),
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

  it('preserves leftover frame time when sampling version updates', () => {
    const runner = {
      step: vi.fn(),
      reset: vi.fn(),
      setRapierWorld: vi.fn(),
      getRapierWorld: vi.fn(),
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

    expect(runner.step).toHaveBeenCalledTimes(5);
    expect(simulationTestState.mockRecordRendererFrame).toHaveBeenCalledTimes(5);
    expect(screen.getByTestId('version')).toHaveTextContent('3');
  });
});