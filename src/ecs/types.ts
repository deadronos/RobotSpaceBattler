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
  if (!node) return undefined;
  try {
    const obj = node as Record<string, unknown>;
    // direct property
    if (obj && typeof obj === "object" && "rigidBody" in obj) {
      const rb = (obj as { rigidBody?: unknown }).rigidBody;
      return (rb as RapierApi) || undefined;
    }
    // ref object from useRef({ current: ... }) or forwarded ref
    if (obj && typeof obj === "object" && "current" in obj) {
      const cur = (obj as { current?: unknown }).current;
      if (
        cur &&
        typeof cur === "object" &&
        "rigidBody" in (cur as Record<string, unknown>)
      ) {
        const rb = (cur as { rigidBody?: unknown }).rigidBody;
        return (rb as RapierApi) || undefined;
      }
      // sometimes the ref current is the api itself
      return (cur as RapierApi) || undefined;
    }
    // node itself might already be the API
    return (obj as unknown as RapierApi) || undefined;
  } catch {
    // ignore extraction errors
    return undefined;
  }
}

export type Entity = {
  id: string;
  team: "red" | "blue";
  position: number[];
  rb?: RapierApi;
  // optional collider reference if present at runtime
  collider?: unknown;
  // internal flag used during defensive cleanup
  __destroying?: boolean;
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
