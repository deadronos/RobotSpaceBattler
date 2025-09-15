// Small helper utilities to make Rapier-related cleanup idempotent and
// defensive. We avoid calling into the wasm layer here — instead we mark
// entities as destroying and clear any JS-held references to Rapier API
// objects so subsequent unmounts or removals don't attempt to use them.

export function markEntityDestroying(ent: any) {
  if (!ent || typeof ent !== 'object') return;
  if ((ent as any).__destroying) return;
  try {
    // mark first so other logic can see the intent
    try { (ent as any).__destroying = true; } catch {}
    // clear any stored Rapier JS objects so later unmounts won't attempt
    // to call into the wasm runtime with stale references.
    try { delete (ent as any).rb; } catch {}
    try { delete (ent as any).collider; } catch {}
  } catch {
    // swallow any unexpected errors during defensive cleanup
  }
}

export function isEntityDestroying(ent: any) {
  try {
    return !!(ent && (ent as any).__destroying);
  } catch {
    return false;
  }
}
