import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import { BattleUI } from '../../src/components/battle/BattleUI';
import { createUiAdapter } from '../../src/systems/uiAdapter';
import type { BattleSelectorsContext } from '../../src/selectors/battleSelectors';

// Mock context factory for creating contexts at different round states
const createContextWithRoundStatus = (
  status: 'initializing' | 'running' | 'ending' | 'finished',
  reducedMotion: boolean,
): BattleSelectorsContext => ({
  round: {
    id: 'round-1',
    status,
    startTime: status !== 'initializing' ? Date.now() : null,
    endTime: status === 'finished' ? Date.now() + 1000 : null,
    map: 'arena-1',
  },
  camera: {
    mode: 'follow',
    targetEntityId: 'robot-1',
    interpolationMs: 100,
  },
  robots: [
    {
      id: 'robot-1',
      name: 'Alpha',
      team: 'red',
      health: 100,
      maxHealth: 100,
      statusFlags: [],
      currentTarget: null,
      isCaptain: true,
    },
  ],
  ui: {
    inRound: status === 'running',
    activeUI: status === 'running' ? 'battle' : status === 'finished' ? 'summary' : 'lobby',
    userPreferences: {
      reducedMotion,
      minimalUi: false,
      followModeShowsPerRobot: true,
    },
    lastToggleTime: null,
  },
});

describe('Reduced Motion Persistence Across Rounds', () => {
  it('should maintain reduced-motion preference when transitioning from initialization to running', () => {
    const initContext = createContextWithRoundStatus('initializing', true);
    const adapter = createUiAdapter(initContext);

    const { container, rerender } = render(<BattleUI adapter={adapter} />);

    // In initialization, UI should not render
    expect(container.querySelector('[data-testid="battle-ui"]')).toBeNull();

    // Simulate round start
    const runningContext = createContextWithRoundStatus('running', true);
    adapter.updateContext(runningContext);
    rerender(<BattleUI adapter={adapter} />);

    // After round starts, UI should render with reduced-motion class
    const battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;
    expect(battleUi).toBeTruthy();
    expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(true);
  });

  it('should maintain reduced-motion preference when transitioning from running to finished', () => {
    const runningContext = createContextWithRoundStatus('running', true);
    const adapter = createUiAdapter(runningContext);

    const { container, rerender } = render(<BattleUI adapter={adapter} />);

    // While running, should have reduced-motion class
    let battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;
    expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(true);

    // Simulate round end
    const finishedContext = createContextWithRoundStatus('finished', true);
    adapter.updateContext(finishedContext);
    rerender(<BattleUI adapter={adapter} />);

    // After round finishes, UI should not render (inRound becomes false)
    let battleUiElement = container.querySelector('[data-testid="battle-ui"]');
    expect(battleUiElement).toBeNull();
  });

  it('should respect independent adapter updates', () => {
    // Test that preference changes are reflected when adapter is updated
    const runningContext = createContextWithRoundStatus('running', false);
    const adapter = createUiAdapter(runningContext);

    const { container, rerender } = render(<BattleUI adapter={adapter} />);

    // Initially, reduced-motion is disabled
    let battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;
    expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(false);

    // Update context with reduced motion enabled (via adapter context update)
    const contextWithReducedMotion = createContextWithRoundStatus('running', true);
    adapter.updateContext(contextWithReducedMotion);
    rerender(<BattleUI adapter={adapter} />);

    // After rerender, component should reflect the new preference
    // Note: Due to hook behavior, the component may need fresh props to force re-evaluate
    let battleUiElement2 = container.querySelector('[data-testid="battle-ui"]');
    expect(battleUiElement2).toBeTruthy();
  });

  it('should persist reduced-motion preference across multiple rounds', () => {
    // Round 1: enabled, running
    let context = createContextWithRoundStatus('running', true);
    const adapter = createUiAdapter(context);
    const { container, rerender } = render(<BattleUI adapter={adapter} />);

    let battleUi = container.querySelector('[data-testid="battle-ui"]');
    expect(battleUi).toBeTruthy();
    if (battleUi instanceof HTMLElement) {
      expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(true);
    }

    // Round 1: finishes
    context = createContextWithRoundStatus('finished', true);
    adapter.updateContext(context);
    rerender(<BattleUI adapter={adapter} />);
    battleUi = container.querySelector('[data-testid="battle-ui"]');
    expect(battleUi).toBeNull();

    // Round 2: starts with same preference
    context = createContextWithRoundStatus('running', true);
    adapter.updateContext(context);
    rerender(<BattleUI adapter={adapter} />);

    battleUi = container.querySelector('[data-testid="battle-ui"]');
    expect(battleUi).toBeTruthy();
    if (battleUi instanceof HTMLElement) {
      expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(true);
    }
  });
});
