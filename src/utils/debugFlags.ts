// Centralized helpers for runtime debug flags. These are intentionally
// lightweight and only read/write properties on the global `window`.

type Flags = {
  __APP_DEBUG__?: boolean;
  __PERF_DEBUG__?: boolean;
  __SEMVER_DEBUG__?: boolean;
  __PLAYWRIGHT_TRIGGER_VICTORY__?: boolean;
  __APP_MOUNTED__?: boolean;
  __appSimStatus?: string | null;
  __appUiVictory?: boolean;
  triggerVictory?: () => void;
  __setVictoryVisible?: (v: boolean) => void;
  __getUiState?: () => unknown;
  __perf?: unknown;
  __setCameraMode?: (mode: "follow" | "cinematic") => void;
  __setCameraTarget?: (id: string | null) => void;
};

function flags(): Flags {
  return (globalThis as unknown as Flags) || ({} as Flags);
}

export function isAppDebug(): boolean {
  return !!flags().__APP_DEBUG__;
}

export function isPerfDebug(): boolean {
  return !!flags().__PERF_DEBUG__;
}

export function isSemverDebug(): boolean {
  return !!flags().__SEMVER_DEBUG__;
}

export function setAppMounted(yes: boolean): void {
  (globalThis as unknown as Flags).__APP_MOUNTED__ = yes;
}

export function setAppSimStatus(status: string | null): void {
  (globalThis as unknown as Flags).__appSimStatus = status;
}

export function setAppUiVictory(v: boolean): void {
  (globalThis as unknown as Flags).__appUiVictory = v;
}

export function getPlaywrightTriggerFlag(): boolean {
  return !!(globalThis as unknown as Flags).__PLAYWRIGHT_TRIGGER_VICTORY__;
}

export function setPlaywrightTriggerFlag(value: boolean): void {
  (globalThis as unknown as Flags).__PLAYWRIGHT_TRIGGER_VICTORY__ = value;
}

export function setTriggerVictory(fn: () => void): void {
  (globalThis as unknown as Flags).triggerVictory = fn;
}

export function getTriggerVictory(): (() => void) | undefined {
  return (globalThis as unknown as Flags).triggerVictory;
}

export function setSetVictoryVisible(fn: (visible: boolean) => void): void {
  (globalThis as unknown as Flags).__setVictoryVisible = fn;
}

export function setGetUiState(fn: () => unknown): void {
  (globalThis as unknown as Flags).__getUiState = fn;
}

export function setSetCameraMode(
  fn: (mode: "follow" | "cinematic") => void,
): void {
  (globalThis as unknown as Flags).__setCameraMode = fn;
}

export function setSetCameraTarget(fn: (id: string | null) => void): void {
  (globalThis as unknown as Flags).__setCameraTarget = fn;
}
