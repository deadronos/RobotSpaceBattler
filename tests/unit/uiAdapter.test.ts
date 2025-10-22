import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BattleSelectorsContext } from '../../src/selectors/battleSelectors';
import type { BattleUiState, CameraState, RobotView, RoundView } from '../../src/types/ui';

// Placeholder imports—will implement after tests fail
let createUiAdapter: (context: BattleSelectorsContext) => {
  getRoundView: () => RoundView | null;
  getRobotView: (id: string) => RobotView | null;
  getBattleUiState: () => BattleUiState;
  getActiveCamera: () => CameraState;
  onRoundStart: (handler: (round: RoundView) => void) => () => void;
  onRoundEnd: (handler: (round: RoundView) => void) => () => void;
  onCameraChange: (handler: (camera: CameraState) => void) => () => void;
  updateContext: (newContext: BattleSelectorsContext) => void;
};

describe('uiAdapter', () => {
  const baseContext: BattleSelectorsContext = {
    round: {
      id: 'round-1',
      status: 'initializing',
      startTime: null,
      endTime: null,
      map: 'arena-1',
    },
    robots: [],
    camera: {
      mode: 'follow',
      targetEntityId: null,
    },
    ui: {
      inRound: false,
      activeUI: 'lobby',
      userPreferences: {
        reducedMotion: false,
        minimalUi: false,
        followModeShowsPerRobot: true,
      },
      lastToggleTime: null,
    },
  };

  beforeEach(async () => {
    // Dynamic import to allow test to run even if implementation doesn't exist yet
    try {
      const module = await import('../../src/systems/uiAdapter');
      createUiAdapter = module.createUiAdapter;
    } catch {
      createUiAdapter = () => {
        throw new Error('uiAdapter not implemented');
      };
    }
  });

  it('exposes getRoundView, getRobotView, getBattleUiState, getActiveCamera', () => {
    const adapter = createUiAdapter(baseContext);

    expect(adapter.getRoundView).toBeDefined();
    expect(adapter.getRobotView).toBeDefined();
    expect(adapter.getBattleUiState).toBeDefined();
    expect(adapter.getActiveCamera).toBeDefined();
  });

  it('invokes onRoundStart handler when round status transitions to running', () => {
    const adapter = createUiAdapter(baseContext);
    const handler = vi.fn();

    adapter.onRoundStart(handler);

    // Simulate round starting
    adapter.updateContext({
      ...baseContext,
      round: {
        ...baseContext.round,
        status: 'running',
        startTime: 1000,
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'round-1',
        status: 'running',
      }),
    );
  });

  it('invokes onRoundEnd handler when round status transitions to finished', () => {
    const runningContext: BattleSelectorsContext = {
      ...baseContext,
      round: {
        ...baseContext.round,
        status: 'running',
        startTime: 1000,
      },
    };

    const adapter = createUiAdapter(runningContext);
    const handler = vi.fn();

    adapter.onRoundEnd(handler);

    // Simulate round ending
    adapter.updateContext({
      ...runningContext,
      round: {
        ...runningContext.round,
        status: 'finished',
        endTime: 2000,
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'round-1',
        status: 'finished',
      }),
    );
  });

  it('invokes onCameraChange handler when camera mode changes', () => {
    const adapter = createUiAdapter(baseContext);
    const handler = vi.fn();

    adapter.onCameraChange(handler);

    // Simulate camera mode change
    adapter.updateContext({
      ...baseContext,
      camera: {
        mode: 'cinematic',
        targetEntityId: null,
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'cinematic',
      }),
    );
  });

  it('does not invoke handlers when status remains unchanged', () => {
    const adapter = createUiAdapter(baseContext);
    const roundStartHandler = vi.fn();
    const cameraHandler = vi.fn();

    adapter.onRoundStart(roundStartHandler);
    adapter.onCameraChange(cameraHandler);

    // Update context with same status/mode
    adapter.updateContext({
      ...baseContext,
      robots: [{ id: 'robot-1', team: 'red', health: 100 }],
    });

    expect(roundStartHandler).not.toHaveBeenCalled();
    expect(cameraHandler).not.toHaveBeenCalled();
  });

  it('returns unsubscribe function that prevents further handler invocations', () => {
    const adapter = createUiAdapter(baseContext);
    const handler = vi.fn();

    const unsubscribe = adapter.onRoundStart(handler);

    // First update should trigger
    adapter.updateContext({
      ...baseContext,
      round: { ...baseContext.round, status: 'running', startTime: 1000 },
    });

    expect(handler).toHaveBeenCalledTimes(1);

    // Unsubscribe
    unsubscribe();

    // Reset to initializing then back to running—should not trigger
    adapter.updateContext(baseContext);
    adapter.updateContext({
      ...baseContext,
      round: { ...baseContext.round, status: 'running', startTime: 2000 },
    });

    expect(handler).toHaveBeenCalledTimes(1); // Still only once
  });

  it('supports multiple concurrent handlers for the same event', () => {
    const adapter = createUiAdapter(baseContext);
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    adapter.onRoundStart(handler1);
    adapter.onRoundStart(handler2);

    adapter.updateContext({
      ...baseContext,
      round: { ...baseContext.round, status: 'running', startTime: 1000 },
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
