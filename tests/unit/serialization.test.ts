import { describe, it, expect } from 'vitest';
import { canonicalJSONStringify } from '../../src/utils/serialization';

describe('canonical JSON serializer', () => {
  it('orders object keys predictably and recursively', () => {
    const obj = { b: 2, a: { d: 4, c: 3 }, e: [ { z: 1, y: 2 }, 5 ] };
    const s = canonicalJSONStringify(obj);
    // Expect keys in sorted order: a, b, e and nested c,d
    expect(s.indexOf('"a"')).toBeLessThan(s.indexOf('"b"'));
    expect(s.indexOf('"b"')).toBeLessThan(s.indexOf('"e"'));
    expect(s.indexOf('"c"')).toBeLessThan(s.indexOf('"d"'));
    // Ensure consistent format
    expect(JSON.parse(s)).toEqual({ a: { c: 3, d: 4 }, b: 2, e: [{ y: 2, z: 1 }, 5] });
  });
});