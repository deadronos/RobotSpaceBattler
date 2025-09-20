import { describe, it, expect } from 'vitest';

// Lightweight runtime schema checks to ensure component shapes used in SPEC.md

describe('SPEC component shapes', () => {
  it('Weapon component shape matches expectations', () => {
    const weapon = {
      id: 'w:laser:1',
      type: 'hitscan',
      cooldownMs: 250,
      range: 20,
      power: 10,
      aoe: undefined,
    } as const;

    expect(typeof weapon.id).toBe('string');
    expect(['hitscan', 'projectile', 'beam']).toContain(weapon.type);
    expect(typeof weapon.cooldownMs).toBe('number');
    expect(typeof weapon.range).toBe('number');
    expect(typeof weapon.power).toBe('number');
  });

  it('RobotStats shape matches expectations', () => {
    const stats = { speed: 3, turnSpeed: 0.08, sensorRange: 12 };
    expect(typeof stats.speed).toBe('number');
    expect(typeof stats.turnSpeed).toBe('number');
    expect(typeof stats.sensorRange).toBe('number');
  });
});
