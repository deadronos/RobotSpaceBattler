import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createUiAdapter } from '../../src/systems/uiAdapter';
import type { BattleSelectorsContext } from '../../src/selectors/battleSelectors';

describe('battle-ui-integration', () => {
  let context: BattleSelectorsContext;

  beforeEach(() => {
    context = {
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
  });

  it('transitions activeUI from lobby to battle when round starts', () => {
    const adapter = createUiAdapter(context);
    const roundStartHandler = vi.fn();

    adapter.onRoundStart(roundStartHandler);

    // Simulate round starting
    adapter.updateContext({
      ...context,
      round: {
        ...context.round,
        status: 'running',
        startTime: 1000,
      },
      ui: {
        ...context.ui,
        inRound: true,
        activeUI: 'battle',
      },
    });

    expect(roundStartHandler).toHaveBeenCalledTimes(1);

    // Verify UI state reflects battle mode
    const uiState = adapter.getBattleUiState();
    expect(uiState.inRound).toBe(true);
    expect(uiState.activeUI).toBe('battle');
  });

  it('transitions activeUI from battle to summary when round ends', () => {
    // Start with a running round
    const runningContext: BattleSelectorsContext = {
      ...context,
      round: {
        ...context.round,
        status: 'running',
        startTime: 1000,
      },
      ui: {
        ...context.ui,
        inRound: true,
        activeUI: 'battle',
      },
    };

    const adapter = createUiAdapter(runningContext);
    const roundEndHandler = vi.fn();

    adapter.onRoundEnd(roundEndHandler);

    // Simulate round ending
    adapter.updateContext({
      ...runningContext,
      round: {
        ...runningContext.round,
        status: 'finished',
        endTime: 2000,
      },
      ui: {
        ...runningContext.ui,
        inRound: false,
        activeUI: 'summary',
      },
    });

    expect(roundEndHandler).toHaveBeenCalledTimes(1);

    // Verify UI state reflects summary mode
    const uiState = adapter.getBattleUiState();
    expect(uiState.inRound).toBe(false);
    expect(uiState.activeUI).toBe('summary');
  });

  it('preserves userPreferences across round transitions', () => {
    const adapter = createUiAdapter(context);

    // Start with custom preferences
    adapter.updateContext({
      ...context,
      ui: {
        ...context.ui,
        userPreferences: {
          reducedMotion: true,
          minimalUi: true,
          followModeShowsPerRobot: false,
        },
      },
    });

    let uiState = adapter.getBattleUiState();
    expect(uiState.userPreferences.reducedMotion).toBe(true);
    expect(uiState.userPreferences.minimalUi).toBe(true);

    // Transition to battle
    adapter.updateContext({
      ...context,
      round: { ...context.round, status: 'running', startTime: 1000 },
      ui: {
        ...context.ui,
        inRound: true,
        activeUI: 'battle',
        userPreferences: {
          reducedMotion: true,
          minimalUi: true,
          followModeShowsPerRobot: false,
        },
      },
    });

    uiState = adapter.getBattleUiState();
    expect(uiState.userPreferences.reducedMotion).toBe(true);
    expect(uiState.userPreferences.minimalUi).toBe(true);
  });

  it('updates camera state without triggering round transitions', () => {
    const runningContext: BattleSelectorsContext = {
      ...context,
      round: { ...context.round, status: 'running', startTime: 1000 },
      ui: { ...context.ui, inRound: true, activeUI: 'battle' },
    };

    const adapter = createUiAdapter(runningContext);
    const roundStartHandler = vi.fn();
    const roundEndHandler = vi.fn();
    const cameraHandler = vi.fn();

    adapter.onRoundStart(roundStartHandler);
    adapter.onRoundEnd(roundEndHandler);
    adapter.onCameraChange(cameraHandler);

    // Change camera mode
    adapter.updateContext({
      ...runningContext,
      camera: {
        mode: 'cinematic',
        targetEntityId: null,
      },
    });

    // Only camera handler should be called
    expect(cameraHandler).toHaveBeenCalledTimes(1);
    expect(roundStartHandler).not.toHaveBeenCalled();
    expect(roundEndHandler).not.toHaveBeenCalled();
  });
});
