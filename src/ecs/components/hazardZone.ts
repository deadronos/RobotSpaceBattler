export interface HazardSchedule {
  periodMs: number;
  activeMs: number;
  offsetMs?: number;
}

export type HazardEffectKind = "damage" | "slow" | "status";

export interface HazardEffect {
  kind: HazardEffectKind;
  amount: number;
  perSecond?: boolean;
  durationMs?: number;
}

export function createDefaultHazardZone(
  overrides: Partial<HazardSchedule & { effects?: HazardEffect[] }> = {},
) {
  return {
    periodMs: 4000,
    activeMs: 1000,
    offsetMs: 0,
    effects: [
      { kind: "damage" as HazardEffectKind, amount: 6, perSecond: true },
    ],
    ...overrides,
  } as {
    periodMs: number;
    activeMs: number;
    offsetMs?: number;
    effects?: HazardEffect[];
  };
}
