interface DebugGlobalsOptions {
  isDev: boolean;
  search: string;
}

/**
 * Enables debug globals in development and in production when `?debug` is set.
 */
export function shouldExposeDebugGlobals({
  isDev,
  search,
}: DebugGlobalsOptions): boolean {
  if (isDev) {
    return true;
  }

  const params = new URLSearchParams(search);
  return params.has("debug");
}

export function canExposeDebugGlobals(): boolean {
  return shouldExposeDebugGlobals({
    isDev: import.meta.env.DEV,
    search: window.location.search,
  });
}
