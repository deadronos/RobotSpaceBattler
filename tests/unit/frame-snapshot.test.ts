import { beforeEach, describe, expect, it } from 'vitest';

import type { FrameSnapshot } from '../../src/types/ui';

// Placeholder imports—will implement after tests fail
let createUiAdapter: (context: any) => {
  getFrameSnapshot: () => FrameSnapshot;
  updateContext: (newContext: any) => void;
};

describe('uiAdapter getFrameSnapshot', () => {
  beforeEach(async () => {
    try {
      const module = await import('../../src/systems/uiAdapter');
      createUiAdapter = module.createUiAdapter;
    } catch {
      createUiAdapter = () => {
        throw new Error('uiAdapter not implemented');
      };
    }
  });

  it('returns a FrameSnapshot with camera position, target, up, time, and interpolationFactor', () => {
    const context = {
      round: {
        id: 'round-1',
        status: 'running' as const,
        startTime: 1000,
        endTime: null,
      },
      robots: [],
      camera: {
        mode: 'follow' as const,
        targetEntityId: 'robot-1',
        interpolationMs: 300,
      },
      ui: {
        inRound: true,
        activeUI: 'battle' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      },
    };

    const adapter = createUiAdapter(context);
    const snapshot = adapter.getFrameSnapshot();

    expect(snapshot).toBeDefined();
    expect(snapshot.camera).toBeDefined();
    expect(snapshot.camera.position).toBeInstanceOf(Array);
    expect(snapshot.camera.position).toHaveLength(3);
    expect(snapshot.camera.target).toBeInstanceOf(Array);
    expect(snapshot.camera.target).toHaveLength(3);
    expect(snapshot.camera.up).toBeInstanceOf(Array);
    expect(snapshot.camera.up).toHaveLength(3);
    expect(typeof snapshot.time).toBe('number');
    expect(typeof snapshot.interpolationFactor).toBe('number');
  });

  it('returns the same object reference on repeated calls for allocation efficiency', () => {
    const context = {
      round: { id: 'round-1', status: 'running' as const, startTime: 1000, endTime: null },
      robots: [],
      camera: { mode: 'follow' as const },
      ui: {
        inRound: true,
        activeUI: 'battle' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      },
    };

    const adapter = createUiAdapter(context);
    const snapshot1 = adapter.getFrameSnapshot();
    const snapshot2 = adapter.getFrameSnapshot();

    // Should reuse the same object to avoid GC churn
    expect(snapshot1).toBe(snapshot2);
  });

  it('updates snapshot time on each call', () => {
    const context = {
      round: { id: 'round-1', status: 'running' as const, startTime: 1000, endTime: null },
      robots: [],
      camera: { mode: 'follow' as const },
      ui: {
        inRound: true,
        activeUI: 'battle' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      },
    };

    const adapter = createUiAdapter(context);
    const snapshot1 = adapter.getFrameSnapshot();
    const time1 = snapshot1.time;

    // Small delay
    const snapshot2 = adapter.getFrameSnapshot();
    const time2 = snapshot2.time;

    expect(time2).toBeGreaterThanOrEqual(time1);
  });

  it('clamps interpolationFactor between 0 and 1', () => {
    const context = {
      round: { id: 'round-1', status: 'running' as const, startTime: 1000, endTime: null },
      robots: [],
      camera: { mode: 'follow' as const, interpolationMs: 100 },
      ui: {
        inRound: true,
        activeUI: 'battle' as const,
        userPreferences: {
          reducedMotion: false,
          minimalUi: false,
          followModeShowsPerRobot: true,
        },
        lastToggleTime: null,
      },
    };

    const adapter = createUiAdapter(context);
    const snapshot = adapter.getFrameSnapshot();

    expect(snapshot.interpolationFactor).toBeGreaterThanOrEqual(0);
    expect(snapshot.interpolationFactor).toBeLessThanOrEqual(1);
  });
});
