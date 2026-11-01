/**
 * Reads a "1"/"0" flag from localStorage. Storage can be missing or throw
 * (blocked site data, sandboxed iframes, some private modes), in which case
 * the default is returned so the UI still renders.
 */
export function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored == null ? defaultValue : stored === "1";
  } catch {
    return defaultValue;
  }
}

/** Persists a flag; silently ignores unavailable storage. */
export function writeStoredBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Persistence is a convenience only.
  }
}
