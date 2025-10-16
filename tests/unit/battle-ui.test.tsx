import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiAdapter } from '../../src/systems/uiAdapter';

// Placeholder imports—will implement after tests fail
let BattleUI: React.ComponentType<{ adapter: UiAdapter }>;

describe('BattleUI', () => {
  let mockAdapter: UiAdapter;

  beforeEach(async () => {
    // Create a minimal mock adapter
    mockAdapter = {
      getRoundView: vi.fn(() => ({
        id: 'round-1',
        status: 'running' as const,
        startTime: 1000,
        endTime: null,
      })),
      getRobotView: vi.fn(() => null),
      getBattleUiState: vi.fn(() => ({
        inRound: false,
        activeUI: 'lobby' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      })),
      getActiveCamera: vi.fn(() => ({
        mode: 'follow' as const,
        targetEntityId: null,
      })),
      getFrameSnapshot: vi.fn(() => ({
        camera: {
          position: [0, 0, 0] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
          up: [0, 1, 0] as [number, number, number],
        },
        time: performance.now(),
        interpolationFactor: 1,
      })),
      onRoundStart: vi.fn(() => () => {}),
      onRoundEnd: vi.fn(() => () => {}),
      onCameraChange: vi.fn(() => () => {}),
      updateContext: vi.fn(),
    };

    // Dynamic import to allow test to run even if implementation doesn't exist yet
    try {
      const module = await import('../../src/components/battle/BattleUI');
      // @ts-ignore
      BattleUI = module.BattleUI;
    } catch {
      // @ts-ignore - placeholder for missing component
      BattleUI = () => {
        throw new Error('BattleUI not implemented');
      };
    }
  });

  it('does not render battle-ui when inRound is false', () => {
    const { queryByTestId, unmount } = render(<BattleUI adapter={mockAdapter} />);

    const battleUi = queryByTestId('battle-ui');
    expect(battleUi).toBeNull();

    unmount();
  });

  it('renders battle-ui when inRound is true', () => {
    // Update mock to return inRound: true
    mockAdapter.getBattleUiState = vi.fn(() => ({
      inRound: true,
      activeUI: 'battle' as const,
      userPreferences: {
        reducedMotion: false,
        minimalUi: false,
        followModeShowsPerRobot: true,
      },
      lastToggleTime: null,
    }));

    const { getByTestId, unmount } = render(<BattleUI adapter={mockAdapter} />);

    const battleUi = getByTestId('battle-ui');
    expect(battleUi).toBeInTheDocument();

    unmount();
  });

  it('toggles visibility when inRound state changes', () => {
    const { queryByTestId, rerender, unmount } = render(<BattleUI adapter={mockAdapter} />);

    // Initially not in round
    expect(queryByTestId('battle-ui')).toBeNull();

    // Simulate round starting by creating a new adapter with updated state
    const updatedAdapter = {
      ...mockAdapter,
      getBattleUiState: vi.fn(() => ({
        inRound: true,
        activeUI: 'battle' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      })),
    };

    // Re-render with updated adapter
    rerender(<BattleUI adapter={updatedAdapter} />);

    // Component should re-render and show battle UI
    const battleUi = queryByTestId('battle-ui');
    expect(battleUi).toBeInTheDocument();

    unmount();
  });

  it('respects minimalUi preference and hides non-essential elements', () => {
    mockAdapter.getBattleUiState = vi.fn(() => ({
      inRound: true,
      activeUI: 'battle' as const,
      userPreferences: {
        reducedMotion: false,
        minimalUi: true,
        followModeShowsPerRobot: false,
      },
      lastToggleTime: null,
    }));

    const { getByTestId, queryByTestId, unmount } = render(<BattleUI adapter={mockAdapter} />);

    const battleUi = getByTestId('battle-ui');
    expect(battleUi).toBeInTheDocument();

    // When minimalUi is true, detailed elements should not be visible
    const detailedElements = queryByTestId('battle-ui-detailed');
    expect(detailedElements).toBeNull();

    unmount();
  });
});
