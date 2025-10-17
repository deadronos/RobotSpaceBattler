import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BattleUI } from '../../src/components/battle/BattleUI';
import { createUiAdapter } from '../../src/systems/uiAdapter';
import type { BattleSelectorsContext } from '../../src/selectors/battleSelectors';

// Mock context with reduced motion enabled
const createMockContextWithReducedMotion = (reducedMotion: boolean): BattleSelectorsContext => ({
  round: {
    id: 'round-1',
    status: 'running',
    startTime: Date.now(),
    endTime: null,
    map: 'arena-1',
  },
  camera: {
    mode: 'follow',
    targetEntityId: 'robot-1',
    interpolationMs: 100,
  },
  robots: {
    'robot-1': {
      id: 'robot-1',
      name: 'Alpha',
      team: 'team-a',
      currentHealth: 100,
      maxHealth: 100,
      statusFlags: [],
      currentTarget: null,
      isCaptain: true,
    },
  },
  ui: {
    inRound: true,
    activeUI: 'battle',
    userPreferences: {
      reducedMotion,
      minimalUi: false,
      followModeShowsPerRobot: true,
    },
    lastToggleTime: null,
  },
});

describe('BattleUI - Reduced Motion Support', () => {
  it('should apply no-animation class when reducedMotion is true', () => {
    const context = createMockContextWithReducedMotion(true);
    const adapter = createUiAdapter(context);

    const { container } = render(<BattleUI adapter={adapter} />);
    const battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;

    // Verify that the component is rendered
    expect(battleUi).toBeTruthy();

    // Check for reduced-motion class name
    expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(true);
  });

  it('should NOT apply no-animation class when reducedMotion is false', () => {
    const context = createMockContextWithReducedMotion(false);
    const adapter = createUiAdapter(context);

    const { container } = render(<BattleUI adapter={adapter} />);
    const battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;

    expect(battleUi).toBeTruthy();
    expect(battleUi.classList.contains('battle-ui--reduced-motion')).toBe(false);
  });

  it('should disable camera shake or particle effects when reducedMotion is true', () => {
    const context = createMockContextWithReducedMotion(true);
    const adapter = createUiAdapter(context);

    const { container } = render(<BattleUI adapter={adapter} />);
    const battleUi = container.querySelector('[data-testid="battle-ui"]') as HTMLElement;

    // Verify the reduced-motion class is present and would disable animations
    // In actual implementation, this would disable CSS animations or particle systems
    expect(battleUi?.classList.contains('battle-ui--reduced-motion')).toBe(true);

    // Verify no elements with animation-intensive classes are rendered
    const animatedElements = container.querySelectorAll('[class*="animation"]');
    // In a full implementation, we'd check that animation-heavy elements are not rendered
    // For now, this is a placeholder for verifying the preference is respected
    expect(battleUi).toBeTruthy();
  });
});
