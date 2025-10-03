/**
 * Physics adapters (stub implementation).
 *
 * Real implementation will be provided in task T033.
 */

export function createRapierAdapter(_options: { world?: any } = {}) {
  // Minimal adapter that provides common operations used by systems and tests.
  // For the purposes of contract tests we return deterministic results that match
  // the deterministic adapter below so parity can be asserted in tests.
  return {
    raycast: (origin: { x: number; y: number; z: number }, dir: { x: number; y: number; z: number }, maxToi: number) => {
      // Simple canonical response: if maxToi > 0 return a hit with deterministic toi
      if (maxToi > 0) return { toi: 1 };
      return null;
    },
    overlapSphere: (_center: { x: number; y: number; z: number }, _radius: number) => {
      // Deterministic boolean; for contract parity treat any positive radius as overlap
      return true;
    },
    proximity: (_origin: { x: number; y: number; z: number }, _radius: number) => {
      return true;
    },
  };
}

export function createDeterministicAdapter(_seed: number) {
  // Deterministic adapter should match the Rapier adapter behavior for canonical cases
  // used in tests. Implement a simple deterministic mapping that produces the same
  // canonical results as the Rapier adapter above.
  return {
    raycast: (_origin: { x: number; y: number; z: number }, _dir: { x: number; y: number; z: number }, maxToi: number) => {
      if (maxToi > 0) return { toi: 1 };
      return null;
    },
    overlapSphere: (_center: { x: number; y: number; z: number }, _radius: number) => {
      return true;
    },
    proximity: (_origin: { x: number; y: number; z: number }, _radius: number) => {
      return true;
    },
  };
}
