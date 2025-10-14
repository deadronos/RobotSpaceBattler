import { useStore } from "zustand";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { createStore, type StoreApi } from "zustand/vanilla";

import type { BattleUiPreferences } from "../types/ui";

export interface UiState {
  statsOpen: boolean;
  isStatsOpen: boolean;
  settingsOpen: boolean;
  isSettingsOpen: boolean;
  isHudVisible: boolean;
  victoryOverlayVisible: boolean;
  performanceOverlayVisible: boolean;
  performanceBannerDismissed: boolean;
  countdownOverrideSeconds: number | null;
  // UI customizations
  hudTranslucency: number; // 0..1 alpha for translucent panels
  hudPanelPosition: "left-right" | "stacked";
  userPreferences: BattleUiPreferences;
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
  setVictoryOverlayVisible: (visible: boolean) => void;
  showPerformanceOverlay: () => void;
  hidePerformanceOverlay: () => void;
  setPerformanceOverlayVisible: (visible: boolean) => void;
  dismissPerformanceBanner: () => void;
  resetPerformanceBanner: () => void;
  setCountdownOverride: (seconds: number | null | undefined) => void;
  clearCountdownOverride: () => void;
  reset: () => void;
  setHudTranslucency?: (alpha: number) => void;
  setHudPanelPosition?: (pos: "left-right" | "stacked") => void;
  setReducedMotion: (enabled: boolean) => void;
  setMinimalUi: (enabled: boolean) => void;
  setFollowModeShowsPerRobot: (enabled: boolean) => void;
}

export type UiStore = UiState & UiActions;

const DEFAULT_PREFERENCES: BattleUiPreferences = {
  reducedMotion: false,
  minimalUi: false,
  followModeShowsPerRobot: true,
};

const DEFAULT_STATE: UiState = {
  statsOpen: false,
  isStatsOpen: false,
  settingsOpen: false,
  isSettingsOpen: false,
  isHudVisible: true,
  victoryOverlayVisible: false,
  performanceOverlayVisible: true,
  performanceBannerDismissed: false,
  countdownOverrideSeconds: null,
  hudTranslucency: 0.5,
  hudPanelPosition: "left-right",
  userPreferences: { ...DEFAULT_PREFERENCES },
};

type UiStateOverrides = Partial<
  UiState & {
    hudVisible?: boolean;
    statsOpen?: boolean;
    isStatsOpen?: boolean;
    settingsOpen?: boolean;
    isSettingsOpen?: boolean;
  }
> & {
  userPreferences?: Partial<BattleUiPreferences>;
};

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
    overrides.settingsOpen ??
    overrides.isSettingsOpen ??
    DEFAULT_STATE.settingsOpen;
  const hudVisible =
    overrides.isHudVisible ??
    overrides.hudVisible ??
    DEFAULT_STATE.isHudVisible;
  const preferenceOverrides: Partial<BattleUiPreferences> =
    overrides.userPreferences ?? {};
  const userPreferences: BattleUiPreferences = {
    reducedMotion:
      preferenceOverrides.reducedMotion ?? DEFAULT_PREFERENCES.reducedMotion,
    minimalUi: preferenceOverrides.minimalUi ?? DEFAULT_PREFERENCES.minimalUi,
    followModeShowsPerRobot:
      preferenceOverrides.followModeShowsPerRobot ??
      DEFAULT_PREFERENCES.followModeShowsPerRobot,
  };

  return {
    statsOpen,
    isStatsOpen: statsOpen,
    settingsOpen,
    isSettingsOpen: settingsOpen,
    isHudVisible: hudVisible,
    victoryOverlayVisible:
      overrides.victoryOverlayVisible ?? DEFAULT_STATE.victoryOverlayVisible,
    performanceOverlayVisible:
      overrides.performanceOverlayVisible ??
      DEFAULT_STATE.performanceOverlayVisible,
    performanceBannerDismissed:
      overrides.performanceBannerDismissed ??
      DEFAULT_STATE.performanceBannerDismissed,
    countdownOverrideSeconds:
      overrides.countdownOverrideSeconds ??
      DEFAULT_STATE.countdownOverrideSeconds,
    hudTranslucency: overrides.hudTranslucency ?? DEFAULT_STATE.hudTranslucency,
    hudPanelPosition:
      overrides.hudPanelPosition ?? DEFAULT_STATE.hudPanelPosition,
    userPreferences,
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
    setHudTranslucency: (alpha: number) =>
      set({ hudTranslucency: Math.max(0, Math.min(1, alpha)) }),
    setHudPanelPosition: (pos: "left-right" | "stacked") =>
      set({ hudPanelPosition: pos }),
    setVictoryOverlayVisible: (visible) =>
      set({ victoryOverlayVisible: !!visible }),
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
    setReducedMotion: (enabled) =>
      set((state) => ({
        userPreferences: { ...state.userPreferences, reducedMotion: !!enabled },
      })),
    setMinimalUi: (enabled) =>
      set((state) => ({
        userPreferences: { ...state.userPreferences, minimalUi: !!enabled },
      })),
    setFollowModeShowsPerRobot: (enabled) =>
      set((state) => ({
        userPreferences: {
          ...state.userPreferences,
          followModeShowsPerRobot: !!enabled,
        },
      })),
    reset: () =>
      set({
        ...baseState,
        userPreferences: { ...baseState.userPreferences },
      }),
  }));
};

const uiStoreApi = createUiStore();

type Selector<T> = (state: UiStore) => T;
type EqualityFn<T> = (a: T, b: T) => boolean;

type BoundUseUiStore = {
  (): UiStore;
  <T>(selector: Selector<T>, equalityFn?: EqualityFn<T>): T;
} & Pick<StoreApi<UiStore>, "getState" | "setState" | "subscribe">;

function createBoundUseUiStore(api: StoreApi<UiStore>): BoundUseUiStore {
  const bound = (<T>(selector?: Selector<T>, equalityFn?: EqualityFn<T>) => {
    if (selector) {
      if (equalityFn) {
        return useStoreWithEqualityFn(api, selector, equalityFn);
      }

      return useStore(api, selector);
    }

    return useStore(api);
  }) as BoundUseUiStore;

  bound.getState = api.getState;
  bound.setState = api.setState;
  bound.subscribe = api.subscribe;
  return bound;
}

export const useUiStore = createBoundUseUiStore(uiStoreApi);
export const useUIStore = useUiStore;

export type { UiState as UIState };
