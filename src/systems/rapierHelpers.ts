export function extractEntityIdFromRapierHit(hit: unknown): string | undefined {
  if (!hit) return undefined;

  try {
    // If it's an array of hits, take the first
    const first = Array.isArray(hit) && hit.length > 0 ? hit[0] : hit;
    const h = first as Record<string, unknown>;

    // Common shapes: hit.collider or hit.colliderObject, hit.rigid, hit.body
    const collider =
      h["collider"] ??
      h["colliderObject"] ??
      h["colliderHandle"] ??
      h["colliderHandleObject"];
    const body = h["rigid"] ?? h["body"] ?? h["bodyHandle"] ?? h["rigidBody"];

    const tryFrom = (obj: unknown): string | undefined => {
      if (!obj || typeof obj !== "object") return undefined;
      const o = obj as Record<string, unknown>;
      // Look for direct numeric fields
      if (typeof o["entityId"] === "number") return String(o["entityId"] as number);
      if (typeof o["id"] === "number") return String(o["id"] as number);
      // userData may hold an id
      const ud = o["userData"];
      if (ud && typeof ud === "object") {
        const u = ud as Record<string, unknown>;
        if (typeof u["id"] === "number") return String(u["id"] as number);
        if (typeof u["entityId"] === "number") return String(u["entityId"] as number);
        if (typeof u["__entityId"] === "number")
          return String(u["__entityId"] as number);
      }
      // Some wrappers store arbitrary markers
      if (typeof o["__entityId"] === "number") return String(o["__entityId"] as number);
      return undefined;
    };

    let id = tryFrom(collider);
    if (id !== undefined) return id;
    id = tryFrom(body);
    if (id !== undefined) return id;

    // Some hits include a reference to the object under 'object' or 'hitObject'
    const other = h["object"] ?? h["hitObject"] ?? h["target"];
    id = tryFrom(other);
    if (id !== undefined) return id;
  } catch {
    // ignore and return undefined
  }

  return undefined;
}
