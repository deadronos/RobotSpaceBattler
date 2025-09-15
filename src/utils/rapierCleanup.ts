// Small helper utilities to make Rapier-related cleanup idempotent and
// defensive. We avoid calling into the wasm layer here — instead we mark
// entities as destroying and clear any JS-held references to Rapier API
// objects so subsequent unmounts or removals don't attempt to use them.

export function markEntityDestroying(ent: unknown) {
  if (!ent || typeof ent !== "object") return;
  const obj = ent as Record<string, unknown>;
  if ((obj as { __destroying?: unknown }).__destroying) return;
  try {
    // mark first so other logic can see the intent
    try {
      (obj as { __destroying?: boolean }).__destroying = true;
    } catch {
      /* ignore mark failures */
    }
    // clear any stored Rapier JS objects so later unmounts won't attempt
    // to call into the wasm runtime with stale references.
    try {
      delete (obj as { rb?: unknown }).rb;
    } catch {
      /* ignore */
    }
    try {
      delete (obj as { collider?: unknown }).collider;
    } catch {
      /* ignore */
    }
  } catch {
    // swallow any unexpected errors during defensive cleanup
  }
}

export function isEntityDestroying(ent: unknown) {
  try {
    return !!(
      ent &&
      typeof ent === "object" &&
      "__destroying" in (ent as Record<string, unknown>) &&
      (ent as Record<string, unknown>).__destroying
    );
  } catch {
    return false;
  }
}
