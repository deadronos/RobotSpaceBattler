import { describe, expect, it } from 'vitest';

import { createUiStore } from '../../src/store/uiStore';

const DEFAULT_PREFERENCES = {
  reducedMotion: false,
  minimalUi: false,
  followModeShowsPerRobot: true,
};

describe('uiStore user preferences', () => {
  it('exposes safe defaults for userPreferences', () => {
    const store = createUiStore();

    expect(store.getState().userPreferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('hydrates preferences from preloaded state', () => {
    const store = createUiStore({
      userPreferences: {
        reducedMotion: true,
        minimalUi: true,
        followModeShowsPerRobot: false,
      },
    });

    expect(store.getState().userPreferences).toEqual({
      reducedMotion: true,
      minimalUi: true,
      followModeShowsPerRobot: false,
    });
  });

  it('provides actions to update individual preferences', () => {
    const store = createUiStore();
    const state = store.getState();

    expect(state.setReducedMotion).toBeTypeOf('function');
    expect(state.setMinimalUi).toBeTypeOf('function');
    expect(state.setFollowModeShowsPerRobot).toBeTypeOf('function');

    state.setReducedMotion(true);
    state.setMinimalUi(true);
    state.setFollowModeShowsPerRobot(false);

    expect(store.getState().userPreferences).toEqual({
      reducedMotion: true,
      minimalUi: true,
      followModeShowsPerRobot: false,
    });
  });

  it('resets preferences when reset action is invoked', () => {
    const store = createUiStore();
    const { setReducedMotion, setMinimalUi, setFollowModeShowsPerRobot, reset } =
      store.getState();

    setReducedMotion(true);
    setMinimalUi(true);
    setFollowModeShowsPerRobot(false);

    reset();

    expect(store.getState().userPreferences).toEqual(DEFAULT_PREFERENCES);
  });
});
