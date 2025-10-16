import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CameraUiIntegrator } from '../../../src/systems/CameraUiIntegrator';
import type { UiAdapter } from '../../../src/systems/uiAdapter';

describe('CameraUiIntegrator', () => {
  let adapter: UiAdapter & { lastSnapshot?: any };
  let controls: any;

  beforeEach(() => {
    adapter = {
      getRoundView: () => null,
      getRobotView: () => null,
      getBattleUiState: () => ({ inRound: true, activeUI: 'battle', userPreferences: { reducedMotion: false, minimalUi: false, followModeShowsPerRobot: true }, lastToggleTime: null }),
      getActiveCamera: () => ({ mode: 'free' }),
      getFrameSnapshot: () => ({ camera: { position: [0,0,0], target: [0,0,0], up: [0,1,0] }, time: performance.now(), interpolationFactor: 1 }),
      onRoundStart: () => () => {},
      onRoundEnd: () => () => {},
      onCameraChange: () => () => {},
      updateContext: () => {},
      setFrameSnapshot: (snapshot: any) => {
        // capture last snapshot for assertions
        (adapter as any).lastSnapshot = snapshot;
      },
    } as unknown as UiAdapter & { lastSnapshot?: any };

    controls = {
      position: { x: 1, y: 2, z: 3 },
      target: { x: 4, y: 5, z: 6 },
      update: vi.fn(),
      pointer: {
        onPointerDown: () => {},
        onPointerMove: () => {},
        onPointerUp: () => {},
        onPointerLeave: () => {},
        onWheel: () => {},
      },
      keyboard: { onKeyDown: () => {}, onKeyUp: () => {} },
      orbit: () => {},
      pan: () => {},
      zoom: () => {},
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('forwards camera position and target to adapter.setFrameSnapshot each frame', async () => {
    const { unmount } = render(
      <CameraUiIntegrator adapter={adapter as any} controls={controls} />,
    );

    // Wait a couple of animation frames
    await act(async () => {
      await new Promise((r) => setTimeout(r, 16));
    });

    expect(adapter.lastSnapshot).toBeDefined();
    expect(adapter.lastSnapshot.camera).toBeDefined();
    expect(adapter.lastSnapshot.camera.position).toEqual([1, 2, 3]);
    expect(adapter.lastSnapshot.camera.target).toEqual([4, 5, 6]);

    unmount();
  });
});
