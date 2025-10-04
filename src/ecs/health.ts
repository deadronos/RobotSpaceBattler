/**
 * Health utilities implementing canonical `{ current, max, alive }` shape.
 */

export interface HealthState {
  current: number;
  max: number;
  alive: boolean;
}

type HealthInit = {
  current: number;
  max: number;
  alive?: boolean;
};

export function createHealth(init: HealthInit): HealthState {
  const max = Math.max(0, init.max);
  const current = clamp(init.current, 0, max);
  const alive = init.alive ?? current > 0;
  return { current, max, alive };
}

export function applyDamage(health: HealthState, damage: number): HealthState {
  const nextCurrent = clamp(health.current - Math.max(0, damage), 0, health.max);
  return {
    current: nextCurrent,
    max: health.max,
    alive: nextCurrent > 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
