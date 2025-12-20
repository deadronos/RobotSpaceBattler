import { describe, expect, it } from 'vitest';
import { vec3 } from '../../../src/lib/math/vec3';
import { findBestEntity, findClosestEntity, sortEntities } from '../../../src/simulation/ai/targetingUtils';

describe('targetingUtils', () => {
  describe('findClosestEntity', () => {
    const origin = vec3(0, 0, 0);
    const entities = [
      { id: 1, position: vec3(10, 0, 0) },
      { id: 2, position: vec3(5, 0, 0) },
      { id: 3, position: vec3(20, 0, 0) },
    ];

    it('returns the closest entity', () => {
      const result = findClosestEntity(origin, entities);
      expect(result).toBe(entities[1]);
    });

    it('returns undefined for empty list', () => {
      const result = findClosestEntity(origin, []);
      expect(result).toBeUndefined();
    });

    it('respects filter', () => {
      const result = findClosestEntity(origin, entities, (e) => e.id !== 2);
      expect(result).toBe(entities[0]); // closest after excluding id=2 (distance 10 vs 20)
    });
  });

  describe('sortEntities', () => {
    const entities = [
      { id: 'a', val: 10 },
      { id: 'b', val: 5 },
      { id: 'c', val: 20 },
    ];

    it('sorts entities based on score and comparator', () => {
      // Sort by val ascending
      const result = sortEntities(
        entities,
        (e) => e.val,
        (a, b) => a - b
      );
      expect(result.map(e => e.id)).toEqual(['b', 'a', 'c']);
    });

    it('sorts based on complex score object', () => {
      const complexEntities = [
        { id: 'a', p1: 1, p2: 10 },
        { id: 'b', p1: 1, p2: 5 },
        { id: 'c', p1: 0, p2: 100 },
      ];

      // Sort by p1 ascending, then p2 ascending
      const result = sortEntities(
        complexEntities,
        (e) => ({ p1: e.p1, p2: e.p2 }),
        (a, b) => {
            if (a.p1 !== b.p1) return a.p1 - b.p1;
            return a.p2 - b.p2;
        }
      );
      expect(result.map(e => e.id)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('findBestEntity', () => {
    const entities = [
      { id: 'a', val: 10 },
      { id: 'b', val: 5 },
      { id: 'c', val: 20 },
    ];

    it('returns undefined for empty list', () => {
      const result = findBestEntity([], (e) => e, (a, b) => 0);
      expect(result).toBeUndefined();
    });

    it('returns the best entity based on score and comparator', () => {
      // Best is smallest val (comparator returns < 0 for better)
      const result = findBestEntity(
        entities,
        (e) => e.val,
        (a, b) => a - b
      );
      expect(result).toBe(entities[1]); // 'b' has val 5
    });

    it('handles complex score object correctly', () => {
      const complexEntities = [
        { id: 'a', p1: 1, p2: 10 },
        { id: 'b', p1: 1, p2: 5 },
        { id: 'c', p1: 0, p2: 100 },
      ];

      // Best has smallest p1, then smallest p2
      const result = findBestEntity(
        complexEntities,
        (e) => ({ p1: e.p1, p2: e.p2 }),
        (a, b) => {
            if (a.p1 !== b.p1) return a.p1 - b.p1;
            return a.p2 - b.p2;
        }
      );
      // 'c' has p1=0 (best).
      expect(result).toBe(complexEntities[2]);
    });
  });
});
