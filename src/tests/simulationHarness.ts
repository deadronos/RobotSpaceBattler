/**
 * Simulation harness utilities (stub).
 */

export function simulateCombatSequence(_opts: { seed?: number } = {}) {
  // Minimal deterministic sequence for contract tests
  return {
    eventOrder: [
      'weapon-fired',
      'hitscan-impact',
      'damage-applied',
      'death',
      'scoring',
    ],
  };
}
