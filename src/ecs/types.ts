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
  // common shapes we see at runtime:
  // - the wrapper places the api directly on the node: node.rigidBody
  // - React refs may wrap it as { current: { rigidBody } }
  // - some runtimes provide the api as the ref.current itself
  try {
    const asAny = node as any;
    // direct property
    if (asAny.rigidBody) return asAny.rigidBody as RapierApi;
    // ref object from useRef({ current: ... }) or forwarded ref
    if (asAny.current) {
      const cur = asAny.current as any;
      if (cur.rigidBody) return cur.rigidBody as RapierApi;
      // sometimes the ref current is the api itself
      return (cur as RapierApi) || undefined;
    }
    // node itself might already be the API
    return (asAny as RapierApi) || undefined;
  } catch {
    return undefined;
  }
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
