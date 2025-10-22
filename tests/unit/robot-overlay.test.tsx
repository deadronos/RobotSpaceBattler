import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import type { UiAdapter } from '../../src/systems/uiAdapter';
import type { RobotView } from '../../src/types/ui';

// Placeholder imports—will implement after tests fail
let RobotOverlay: React.ComponentType<{ adapter: UiAdapter; robotId: string }>;

describe('RobotOverlay', () => {
  let mockAdapter: UiAdapter;

  beforeEach(async () => {
    const mockRobot: RobotView = {
      id: 'robot-1',
      name: 'Alpha',
      team: 'red',
      currentHealth: 75,
      maxHealth: 100,
      statusFlags: ['stunned', 'overheated'],
      currentTarget: 'robot-2',
      isCaptain: true,
    };

    mockAdapter = {
      getRoundView: vi.fn(() => null),
      getRobotView: vi.fn((id: string) => (id === 'robot-1' ? mockRobot : null)),
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
      getActiveCamera: vi.fn(() => ({
        mode: 'follow' as const,
        targetEntityId: 'robot-1',
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
      setFrameSnapshot: vi.fn(),
      onRoundStart: vi.fn(() => () => {}),
      onRoundEnd: vi.fn(() => () => {}),
      onCameraChange: vi.fn(() => () => {}),
      updateContext: vi.fn(),
    };

    try {
      const module = await import('../../src/components/battle/RobotOverlay');
      RobotOverlay = module.RobotOverlay;
    } catch {
      // @ts-ignore
      RobotOverlay = () => {
        throw new Error('RobotOverlay not implemented');
      };
    }
  });

  it('renders robot overlay with health, team, and status when robot exists', () => {
    const { getByTestId, getByText } = render(
      <RobotOverlay adapter={mockAdapter} robotId="robot-1" />,
    );

    const overlay = getByTestId('robot-overlay');
    expect(overlay).toBeInTheDocument();

    // Should display robot name
    expect(getByText('Alpha')).toBeInTheDocument();

    // Should display team
    expect(getByText(/red/i)).toBeInTheDocument();

    // Should display health bar or percentage
    const healthElement = getByTestId('robot-health');
    expect(healthElement).toBeInTheDocument();
  });

  it('displays status flags when present', () => {
    const { getByText } = render(<RobotOverlay adapter={mockAdapter} robotId="robot-1" />);

    // Should show status flags
    expect(getByText(/stunned/i)).toBeInTheDocument();
    expect(getByText(/overheated/i)).toBeInTheDocument();
  });

  it('shows captain indicator when isCaptain is true', () => {
    const { getByTestId } = render(<RobotOverlay adapter={mockAdapter} robotId="robot-1" />);

    const captainIndicator = getByTestId('captain-indicator');
    expect(captainIndicator).toBeInTheDocument();
  });

  it('returns null when robot is not found', () => {
    const { container } = render(<RobotOverlay adapter={mockAdapter} robotId="unknown" />);

    expect(container.firstChild).toBeNull();
  });

  it('hides overlay when followModeShowsPerRobot is false and not following this robot', () => {
    mockAdapter.getBattleUiState = vi.fn(() => ({
      inRound: true,
      activeUI: 'battle' as const,
      userPreferences: {
        reducedMotion: false,
        minimalUi: false,
        followModeShowsPerRobot: false,
      },
      lastToggleTime: null,
    }));
    mockAdapter.getActiveCamera = vi.fn(() => ({
      mode: 'follow' as const,
      targetEntityId: 'robot-2', // Following a different robot
    }));

    const { container } = render(<RobotOverlay adapter={mockAdapter} robotId="robot-1" />);

    expect(container.firstChild).toBeNull();
  });

  it('shows overlay when camera is following this robot', () => {
    mockAdapter.getActiveCamera = vi.fn(() => ({
      mode: 'follow' as const,
      targetEntityId: 'robot-1',
    }));

    const { getByTestId } = render(<RobotOverlay adapter={mockAdapter} robotId="robot-1" />);

    const overlay = getByTestId('robot-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('respects minimalUi preference and hides detailed status', () => {
    mockAdapter.getBattleUiState = vi.fn(() => ({
      inRound: true,
      activeUI: 'battle' as const,
      userPreferences: {
        reducedMotion: false,
        minimalUi: true,
        followModeShowsPerRobot: true,
      },
      lastToggleTime: null,
    }));

    const { getByTestId, queryByTestId } = render(
      <RobotOverlay adapter={mockAdapter} robotId="robot-1" />,
    );

    expect(getByTestId('robot-overlay')).toBeInTheDocument();
    // Detailed status should be hidden
    expect(queryByTestId('robot-status-detailed')).toBeNull();
  });
});
