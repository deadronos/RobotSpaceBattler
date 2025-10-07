import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

export interface UiState {
  statsOpen: boolean;
  isStatsOpen: boolean;
  settingsOpen: boolean;
  isSettingsOpen: boolean;
  isHudVisible: boolean;
  performanceOverlayVisible: boolean;
  performanceBannerDismissed: boolean;
  countdownOverrideSeconds: number | null;
}

export interface UiActions {
  openStats: () => void;
  closeStats: () => void;
  setStatsOpen: (open: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleHud: () => void;
  setHudVisible: (visible: boolean) => void;
  showPerformanceOverlay: () => void;
  hidePerformanceOverlay: () => void;
  setPerformanceOverlayVisible: (visible: boolean) => void;
  dismissPerformanceBanner: () => void;
  resetPerformanceBanner: () => void;
  setCountdownOverride: (seconds: number | null | undefined) => void;
  clearCountdownOverride: () => void;
  reset: () => void;
}

export type UiStore = UiState & UiActions;

const DEFAULT_STATE: UiState = {
  statsOpen: false,
  isStatsOpen: false,
  settingsOpen: false,
  isSettingsOpen: false,
  isHudVisible: true,
  performanceOverlayVisible: true,
  performanceBannerDismissed: false,
  countdownOverrideSeconds: null,
};

type UiStateOverrides = Partial<
  UiState & {
    hudVisible?: boolean;
    statsOpen?: boolean;
    isStatsOpen?: boolean;
    settingsOpen?: boolean;
    isSettingsOpen?: boolean;
  }
>;

function normalizeCountdown(seconds: number | null | undefined): number | null {
  if (seconds === null || seconds === undefined) {
    return null;
  }

  if (!Number.isFinite(seconds)) {
    return null;
  }

  return Math.max(0, Math.floor(seconds));
}

function normalizeState(overrides: UiStateOverrides = {}): UiState {
  const statsOpen =
    overrides.statsOpen ?? overrides.isStatsOpen ?? DEFAULT_STATE.statsOpen;
  const settingsOpen =
    overrides.settingsOpen ?? overrides.isSettingsOpen ?? DEFAULT_STATE.settingsOpen;
  const hudVisible =
    overrides.isHudVisible ?? overrides.hudVisible ?? DEFAULT_STATE.isHudVisible;

  return {
    statsOpen,
    isStatsOpen: statsOpen,
    settingsOpen,
    isSettingsOpen: settingsOpen,
    isHudVisible: hudVisible,
    performanceOverlayVisible:
      overrides.performanceOverlayVisible ?? DEFAULT_STATE.performanceOverlayVisible,
    performanceBannerDismissed:
      overrides.performanceBannerDismissed ?? DEFAULT_STATE.performanceBannerDismissed,
    countdownOverrideSeconds:
      overrides.countdownOverrideSeconds ?? DEFAULT_STATE.countdownOverrideSeconds,
  };
}

function withStatsOpen(open: boolean) {
  const value = !!open;
  return { statsOpen: value, isStatsOpen: value };
}

function withSettingsOpen(open: boolean) {
  const value = !!open;
  return { settingsOpen: value, isSettingsOpen: value };
}

export const createUiStore = (
  preloadedState: UiStateOverrides = {},
): StoreApi<UiStore> => {
  const baseState = normalizeState(preloadedState);

  return createStore<UiStore>((set) => ({
    ...baseState,
    openStats: () => set(withStatsOpen(true)),
    closeStats: () => set(withStatsOpen(false)),
    setStatsOpen: (open) => set(withStatsOpen(open)),
    openSettings: () => set(withSettingsOpen(true)),
    closeSettings: () => set(withSettingsOpen(false)),
    setSettingsOpen: (open) => set(withSettingsOpen(open)),
    toggleHud: () =>
      set((state) => ({
        isHudVisible: !state.isHudVisible,
      })),
    setHudVisible: (visible) => set({ isHudVisible: !!visible }),
    showPerformanceOverlay: () => set({ performanceOverlayVisible: true }),
    hidePerformanceOverlay: () => set({ performanceOverlayVisible: false }),
    setPerformanceOverlayVisible: (visible) =>
      set({ performanceOverlayVisible: !!visible }),
    dismissPerformanceBanner: () =>
      set({
        performanceBannerDismissed: true,
        performanceOverlayVisible: false,
      }),
    resetPerformanceBanner: () =>
      set({
        performanceBannerDismissed: false,
      }),
    setCountdownOverride: (seconds) =>
      set({ countdownOverrideSeconds: normalizeCountdown(seconds) }),
    clearCountdownOverride: () => set({ countdownOverrideSeconds: null }),
    reset: () => set({ ...baseState }),
  }));
};

const uiStoreApi = createUiStore();

type BoundUseUiStore = {
  (): UiStore;
  <T>(selector: (state: UiStore) => T, equalityFn?: (a: T, b: T) => boolean): T;
  getState: StoreApi<UiStore>['getState'];
  setState: StoreApi<UiStore>['setState'];
  subscribe: StoreApi<UiStore>['subscribe'];
  destroy: StoreApi<UiStore>['destroy'];
  getInitialState: StoreApi<UiStore>['getInitialState'];
};

function createBoundUseUiStore(api: StoreApi<UiStore>): BoundUseUiStore {
  function useBoundStore(): UiStore;
  function useBoundStore<T>(
    selector: (state: UiStore) => T,
    equalityFn?: (a: T, b: T) => boolean,
  ): T;
  function useBoundStore<T>(
    selector?: (state: UiStore) => T,
    equalityFn?: (a: T, b: T) => boolean,
  ) {
    if (selector) {
      return useStore(api, selector, equalityFn);
    }

    return useStore(api);
  }

  const bound = useBoundStore as BoundUseUiStore;
  bound.getState = api.getState;
  bound.setState = api.setState;
  bound.subscribe = api.subscribe;
  bound.destroy = api.destroy;
  bound.getInitialState = api.getInitialState;
  return bound;
}

export const useUiStore = createBoundUseUiStore(uiStoreApi);
export const useUIStore = useUiStore;

export type { UiState as UIState };
