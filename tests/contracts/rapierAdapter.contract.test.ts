import { describe, it, expect } from 'vitest';
import { extractEntityIdFromRapierHit } from '../../src/systems/rapierHelpers';

describe('rapier adapter: extractEntityIdFromRapierHit', () => {
  it('reads numeric id from collider.userData.id', () => {
    const hit = { collider: { userData: { id: 42 } } };
    expect(extractEntityIdFromRapierHit(hit)).toBe('42');
  });

  it('reads numeric entityId from collider', () => {
    const hit = { collider: { entityId: 7 } };
    expect(extractEntityIdFromRapierHit(hit)).toBe('7');
  });

  it('reads __entityId from body wrapper', () => {
    const hit = { body: { __entityId: 99 } };
    expect(extractEntityIdFromRapierHit(hit)).toBe('99');
  });

  it('handles array of hits by inspecting first element', () => {
    const hits = [{ collider: { userData: { id: 5 } } }, { collider: { userData: { id: 6 } } }];
    expect(extractEntityIdFromRapierHit(hits)).toBe('5');
  });

  it('returns undefined for non-numeric ids', () => {
    const hit = { collider: { userData: { id: 'not-a-number' } } };
    expect(extractEntityIdFromRapierHit(hit)).toBeUndefined();
  });
});
