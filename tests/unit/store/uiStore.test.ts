import { describe, expect, it } from 'vitest';

describe('uiStore', () => {
  it('opens and closes stats modal via dedicated actions', async () => {
    const { createUiStore } = await import('../../../src/store/uiStore');
    const store = createUiStore();

    expect(store.getState().isStatsOpen).toBe(false);
    store.getState().openStats();
    expect(store.getState().isStatsOpen).toBe(true);
    store.getState().closeStats();
    expect(store.getState().isStatsOpen).toBe(false);
  });

  it('toggles HUD visibility and supports explicit setter', async () => {
    const { createUiStore } = await import('../../../src/store/uiStore');
    const store = createUiStore();

    expect(store.getState().isHudVisible).toBe(true);
    store.getState().toggleHud();
    expect(store.getState().isHudVisible).toBe(false);
    store.getState().setHudVisible(true);
    expect(store.getState().isHudVisible).toBe(true);
  });

  it('tracks performance banner dismissal and countdown overrides', async () => {
    const { createUiStore } = await import('../../../src/store/uiStore');
    const store = createUiStore();

    expect(store.getState().performanceBannerDismissed).toBe(false);
    store.getState().dismissPerformanceBanner();
    expect(store.getState().performanceBannerDismissed).toBe(true);
    store.getState().resetPerformanceBanner();
    expect(store.getState().performanceBannerDismissed).toBe(false);

    expect(store.getState().countdownOverrideSeconds).toBeNull();
    store.getState().setCountdownOverride(7);
    expect(store.getState().countdownOverrideSeconds).toBe(7);
    store.getState().clearCountdownOverride();
    expect(store.getState().countdownOverrideSeconds).toBeNull();
  });
});
