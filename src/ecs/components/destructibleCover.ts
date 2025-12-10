export interface DestructibleCover {
  maxDurability: number;
  durability: number;
  removalPolicy: 'permanent' | { respawnSeconds: number };
}

export function createDefaultDestructibleCover(overrides: Partial<DestructibleCover> = {}) {
  return {
    maxDurability: 10,
    durability: 10,
    removalPolicy: 'permanent',
    ...overrides,
  } as DestructibleCover;
}
