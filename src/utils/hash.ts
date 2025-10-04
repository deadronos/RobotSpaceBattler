// Stable, non-cryptographic hash utilities used for deterministic tie-breaking
// across physics adapter implementations.
//
// Algorithm choice: FNV-1a 32-bit. It's non-cryptographic, fast, has stable
// behavior across platforms, and is easy to reproduce in tests. We serialize
// objects with sorted keys to ensure field-order independence.

export function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
  }
  return String(value);
}

// FNV-1a 32-bit
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // multiply by prime 16777619 modulo 2^32
    h = (h >>> 0) * 0x01000193 >>> 0;
  }
  // Normalize to unsigned 32-bit
  return h >>> 0;
}

export function stableHash(value: unknown): string {
  const s = stableStringify(value);
  const h = fnv1a32(s);
  // Return hex string with leading zeros to make comparison easy in tests
  return '0x' + h.toString(16).padStart(8, '0');
}
