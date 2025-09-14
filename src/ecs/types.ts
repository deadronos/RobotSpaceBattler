export type RapierApi = {
  translation?: () => { x: number; y: number; z: number };
  linvel?: () => { x: number; y: number; z: number };
  setLinvel?: (v: { x: number; y: number; z: number }, wake?: boolean) => void;
  setTranslation?: (
    t: { x: number; y: number; z: number },
    wake?: boolean,
  ) => void;
};

export function extractRapierApi(node: unknown): RapierApi | undefined {
  const maybe = node as { rigidBody?: RapierApi } | null;
  return maybe?.rigidBody;
}

export type Entity = {
  id: string;
  team: "red" | "blue";
  position: number[];
  rb?: RapierApi;
  health?: { hp: number; maxHp: number };
  weapon?: {
    cooldown: number;
    fireRate: number;
    range: number;
    damage: number;
    projectileSpeed: number;
    projectileTTL: number;
  };
  projectile?: {
    ttl: number;
    damage: number;
    radius: number;
    velocity: { x: number; y: number; z: number };
  };
  fx?: { muzzleTimer?: number };
};

export type Vec3 = { x: number; y: number; z: number };
