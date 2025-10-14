import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiAdapter } from '../../src/systems/uiAdapter';
import type {
  BattleUiState,
  CameraState,
  RobotView,
  RoundView,
} from '../../src/types/ui';

interface MutableAdapter extends UiAdapter {
  setCamera: (state: Partial<CameraState>) => void;
  setUiState: (state: Partial<BattleUiState>) => void;
}

describe('RobotOverlay follow-camera visibility', () => {
  let adapter: MutableAdapter;
  const robot: RobotView = {
    id: 'robot-1',
    name: 'Alpha',
    team: 'red',
    currentHealth: 80,
    maxHealth: 100,
    statusFlags: ['shielded'],
    currentTarget: null,
    isCaptain: false,
  };
  const round: RoundView = {
    id: 'round-1',
    status: 'running',
    startTime: 0,
    endTime: null,
  };

  beforeEach(async () => {
    let cameraState: CameraState = {
      mode: 'cinematic',
      targetEntityId: null,
    };
    let uiState: BattleUiState = {
      inRound: true,
      activeUI: 'battle',
      userPreferences: {
        reducedMotion: false,
        minimalUi: false,
        followModeShowsPerRobot: true,
      },
      lastToggleTime: null,
    };

    const cameraHandlers = new Set<(state: CameraState) => void>();

    const baseAdapter: UiAdapter = {
      getRoundView: () => round,
      getRobotView: (id: string) => (id === robot.id ? robot : null),
      getBattleUiState: () => uiState,
      getActiveCamera: () => cameraState,
      getFrameSnapshot: vi.fn(() => ({
        camera: {
          position: [0, 0, 0] as [number, number, number],
          target: [0, 0, 0] as [number, number, number],
          up: [0, 1, 0] as [number, number, number],
        },
        time: performance.now(),
        interpolationFactor: 1,
      })),
      onRoundStart: () => () => {},
      onRoundEnd: () => () => {},
      onCameraChange: (handler) => {
        cameraHandlers.add(handler);
        return () => cameraHandlers.delete(handler);
      },
      updateContext: () => {},
    };

    adapter = {
      ...baseAdapter,
      setCamera: (state) => {
        cameraState = { ...cameraState, ...state };
        cameraHandlers.forEach((handler) => handler(cameraState));
      },
      setUiState: (state) => {
        uiState = {
          ...uiState,
          ...state,
          userPreferences: {
            ...uiState.userPreferences,
            ...(state.userPreferences ?? {}),
          },
        };
      },
    } as MutableAdapter;
  });

  it('hides overlay while in cinematic mode even with follow overlay preference enabled', async () => {
    const module = await import('../../src/components/battle/RobotOverlay');
    const { RobotOverlay } = module;

    const { queryByTestId } = render(
      <RobotOverlay adapter={adapter} robotId={robot.id} />,
    );

    expect(queryByTestId('robot-overlay')).toBeNull();

    await act(async () => {
      adapter.setCamera({ mode: 'follow', targetEntityId: robot.id });
    });

    expect(queryByTestId('robot-overlay')).not.toBeNull();
  });
});
