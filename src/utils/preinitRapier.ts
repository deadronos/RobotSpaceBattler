// Proactively initialize the Rapier WASM with an explicit URL so bundlers
// don’t have to resolve import.meta.url inside node_modules. This avoids the
// "raweventqueue_new" undefined error seen when the WASM wasn’t loaded.
//
// Safe to call multiple times; Rapier’s init guards and returns early.
export async function preinitRapier(): Promise<void> {
  try {
    const rapier = (await import("@dimforge/rapier3d-compat")) as unknown as {
      init: (opts?: unknown) => Promise<unknown>;
    };
    // Let Vite resolve the wasm asset to a served URL.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – Vite adds default export for ?url imports
    const wasmUrlMod = await import(
      "@dimforge/rapier3d-compat/rapier_wasm3d_bg.wasm?url"
    );
    const module_or_path: unknown =
      (wasmUrlMod && (wasmUrlMod.default || wasmUrlMod)) || undefined;
    // Prefer new API signature: init({ module_or_path })
    await rapier.init({ module_or_path } as unknown);
  } catch {
    // As a fallback, try no-arg init (older signatures) and let the wrapper log a warning.
    try {
      const rapier = (await import("@dimforge/rapier3d-compat")) as unknown as {
        init: () => Promise<unknown>;
      };
      await rapier.init();
    } catch {
      // Swallow – Scene’s error boundary will handle any remaining failures.
    }
  }
}

export default preinitRapier;
