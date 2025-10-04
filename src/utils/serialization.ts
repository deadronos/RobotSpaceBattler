// Deterministic JSON serializer that sorts object keys recursively.
// This ensures NDJSON exports are stable across runs given identical inputs.

export function canonicalJSONStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(v: unknown): unknown {
  if (v === null) return null;
  if (Array.isArray(v)) {
    return v.map(canonicalize);
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      out[k] = canonicalize(obj[k]);
    }
    return out;
  }
  // primitives
  return v;
}

export function toNDJSON(items: unknown[]): string {
  return items.map((i) => canonicalJSONStringify(i)).join('\n');
}
