/**
 * Simple singleton loader for Rapier WASM and compat package. Exposes
 * a single promise so callers that attempt to initialize Rapier multiple
 * times (for example under React StrictMode double-mounts) won't duplicate
 * work or re-run initialization logic.
 */

let _rapierLoadPromise: Promise<void> | null = null;

export function loadRapierOnce(): Promise<void> {
  if (_rapierLoadPromise) return _rapierLoadPromise;

  _rapierLoadPromise = (async () => {
    try {
      const mod = (await import("@react-three/rapier")) as unknown as {
        importRapier?: (loader: () => Promise<unknown>) => void | Promise<void>;
      };

      if (typeof mod.importRapier === "function") {
        const result = mod.importRapier(() => import("@dimforge/rapier3d-compat"));
        if (result instanceof Promise) await result;
      } else {
        await import("@dimforge/rapier3d-compat");
      }
    } catch (err) {
      // Log and rethrow so caller can handle fallbacks if needed.
      // Keep the error visible so devs can see initialization problems.
      console.warn("[rapierLoader] Rapier WASM loader failed:", err);
      throw err;
    }
  })();

  return _rapierLoadPromise;
}
