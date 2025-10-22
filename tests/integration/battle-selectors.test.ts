import { describe, expect, it } from 'vitest';

import type { BattleSelectorsContext, RobotSnapshot } from '../../src/selectors/battleSelectors';
import {
  getActiveCamera,
  getBattleUiState,
  getRobotView,
  getRoundView,
} from '../../src/selectors/battleSelectors';

const basePreferences = {
  reducedMotion: false,
  minimalUi: false,
  followModeShowsPerRobot: true,
};

function createContext(overrides: Partial<BattleSelectorsContext> = {}): BattleSelectorsContext {
  const robots: RobotSnapshot[] = [
    {
      id: 'robot-1',
      name: 'Alpha',
      team: 'red',
      health: 80,
      maxHealth: 100,
      statusFlags: ['stunned'],
      currentTarget: 'robot-2',
      isCaptain: true,
    },
    {
      id: 'robot-2',
      name: 'Bravo',
      team: 'blue',
      health: 45,
      maxHealth: 100,
      statusFlags: [],
      currentTarget: null,
      isCaptain: false,
    },
  ];

  const context: BattleSelectorsContext = {
    round: {
      id: 'round-123',
      status: 'running',
      startTime: 1000,
      endTime: null,
      map: 'asteroid-arena',
      rules: { scoreLimit: 10 },
      expectedRobotCountRange: { min: 10, max: 20 },
    },
    robots,
    camera: {
      mode: 'follow',
      targetEntityId: 'robot-1',
      interpolationMs: 300,
    },
    ui: {
      inRound: true,
      activeUI: 'battle',
      userPreferences: { ...basePreferences },
      lastToggleTime: 2000,
    },
  };

  return {
    ...context,
    ...overrides,
    round: { ...context.round, ...overrides.round },
    camera: { ...context.camera, ...overrides.camera },
    ui: {
      ...context.ui,
      ...overrides.ui,
      userPreferences: {
        ...context.ui.userPreferences,
        ...(overrides.ui?.userPreferences ?? {}),
      },
    },
    robots: overrides.robots ? overrides.robots.slice() : robots,
  };
}

describe('battleSelectors', () => {
  it('maps round metadata to RoundView', () => {
    const context = createContext();

    const round = getRoundView(context);

    expect(round).toEqual({
      id: 'round-123',
      status: 'running',
      startTime: 1000,
      endTime: null,
      map: 'asteroid-arena',
      rules: { scoreLimit: 10 },
      expectedRobotCountRange: { min: 10, max: 20 },
    });
    expect(round).not.toBe(context.round);
  });

  it('produces RobotView for a specific robot id', () => {
    const context = createContext();

    const robot = getRobotView(context, 'robot-1');

    expect(robot).toEqual({
      id: 'robot-1',
      name: 'Alpha',
      team: 'red',
      currentHealth: 80,
      maxHealth: 100,
      statusFlags: ['stunned'],
      currentTarget: 'robot-2',
      isCaptain: true,
    });
  });

  it('clamps robot health and defaults fields when missing', () => {
    const context = createContext({
      robots: [
        {
          id: 'robot-3',
          team: 'red',
          health: -5,
          maxHealth: 50,
          isCaptain: false,
        },
        {
          id: 'robot-4',
          team: 'blue',
          health: 120,
          maxHealth: 100,
          statusFlags: undefined,
        },
      ],
    });

    const lowHealthRobot = getRobotView(context, 'robot-3');
    const highHealthRobot = getRobotView(context, 'robot-4');

    expect(lowHealthRobot?.currentHealth).toBe(0);
    expect(highHealthRobot?.currentHealth).toBe(100);
    expect(highHealthRobot?.statusFlags).toEqual([]);
    expect(lowHealthRobot?.currentTarget).toBeNull();
  });

  it('returns null when robot is not found', () => {
    const context = createContext();

    expect(getRobotView(context, 'unknown')).toBeNull();
  });

  it('exposes active camera state as an immutable copy', () => {
    const context = createContext({
      camera: {
        mode: 'cinematic',
        targetEntityId: null,
        interpolationMs: 120,
      },
    });

    const camera = getActiveCamera(context);

    expect(camera).toEqual({
      mode: 'cinematic',
      targetEntityId: null,
      interpolationMs: 120,
    });
    expect(camera).not.toBe(context.camera);
  });

  it('maps UI store state into BattleUiState and clones preferences', () => {
    const context = createContext({
      ui: {
        inRound: false,
        activeUI: 'lobby',
        userPreferences: {
          reducedMotion: true,
          minimalUi: true,
          followModeShowsPerRobot: false,
        },
        lastToggleTime: 5000,
      },
    });

    const uiState = getBattleUiState(context);

    expect(uiState).toEqual({
      inRound: false,
      activeUI: 'lobby',
      userPreferences: {
        reducedMotion: true,
        minimalUi: true,
        followModeShowsPerRobot: false,
      },
      lastToggleTime: 5000,
    });
    expect(uiState).not.toBe(context.ui);
    expect(uiState.userPreferences).not.toBe(context.ui.userPreferences);
  });
});
