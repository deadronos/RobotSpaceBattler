/**
 * Static arena layout as data (#229).
 *
 * The renderer merges these arrays into a handful of meshes, and the tests read
 * the same arrays to check the merged result. Nothing here is simulation state:
 * the simulation owns its own collision/los geometry in
 * `src/simulation/environment/`.
 */

export interface ArenaWallConfig {
  readonly pos: readonly [number, number, number];
  readonly dim: readonly [number, number, number];
}

export interface ArenaLampConfig {
  readonly position: readonly [number, number, number];
  /** Y rotation, in radians, baked into the merged geometry. */
  readonly rotationY: number;
  readonly color: string;
}

/** Floor slab: a thin box centred at `y`, so the walls start at y = 0. */
export const ARENA_FLOOR = {
  size: 100,
  thickness: 0.5,
  y: -1,
  color: "#262b46",
  emissive: "#04060f",
  emissiveIntensity: 0.3,
  metalness: 0.35,
  roughness: 0.55,
} as const;

/** Base colours of the merged solid parts (baked as vertex colours). */
export const ARENA_SOLID = {
  wallColor: "#313c60",
  pillarColor: "#3a4560",
  lampHousingColor: "#141724",
  metalness: 0.55,
  roughness: 0.45,
} as const;

export const ARENA_WALLS: readonly ArenaWallConfig[] = [
  { pos: [0, 2.5, -50], dim: [100, 5, 2] },
  { pos: [0, 2.5, 50], dim: [100, 5, 2] },
  { pos: [50, 2.5, 0], dim: [2, 5, 100] },
  { pos: [-50, 2.5, 0], dim: [2, 5, 100] },
  { pos: [0, 2.5, -20], dim: [40, 5, 1.5] },
  { pos: [0, 2.5, 20], dim: [40, 5, 1.5] },
  { pos: [-20, 2.5, 0], dim: [1.5, 5, 30] },
  { pos: [20, 2.5, 0], dim: [1.5, 5, 30] },
  { pos: [0, 2.5, 0], dim: [6, 5, 6] },
  { pos: [-35, 2.5, -35], dim: [6, 5, 6] },
  { pos: [35, 2.5, -35], dim: [6, 5, 6] },
  { pos: [-35, 2.5, 35], dim: [6, 5, 6] },
  { pos: [35, 2.5, 35], dim: [6, 5, 6] },
];

export const ARENA_PILLARS: readonly (readonly [number, number, number])[] = [
  [-30, 1.5, -30],
  [30, 1.5, -30],
  [-30, 1.5, 30],
  [30, 1.5, 30],
];

export const ARENA_PILLAR = {
  radius: 1.2,
  height: 3,
  sideSegments: 6,
} as const;

export const ARENA_PILLAR_RING = {
  radius: 1.25,
  height: 0.1,
  segments: 16,
  offsetsY: [0.5, -0.5],
} as const;

export const ARENA_LAMP_SIZE = {
  housing: [4.2, 2.2, 0.3],
  face: [3.4, 1.6, 0.2],
  /** Face offset in front of the housing, along local +z. */
  faceOffset: 0.25,
} as const;

export const ARENA_LAMPS: readonly ArenaLampConfig[] = [
  { position: [0, 3.5, -48.9], rotationY: 0, color: "#7ecbff" },
  { position: [0, 3.5, 48.9], rotationY: Math.PI, color: "#7ecbff" },
  { position: [-48.9, 3.5, 0], rotationY: Math.PI / 2, color: "#ffb36c" },
  { position: [48.9, 3.5, 0], rotationY: -Math.PI / 2, color: "#ff6f9f" },
  { position: [-20, 3.25, -20], rotationY: Math.PI / 4, color: "#8ce2ff" },
  { position: [20, 3.25, 20], rotationY: -Math.PI / 4, color: "#9cffb5" },
];

/** Neon strip height above the wall top and below the wall bottom. */
export const NEON_STRIP_HEIGHT = 0.15;
export const NEON_STRIP_INSET = 0.1;

/**
 * One pulse group per entry. Colours live in the merged geometry's vertex
 * colours, so a group shares a single material and a single pulse update.
 *
 * `intensity` replaces the old `emissiveIntensity` plus the diffuse
 * contribution the lit strips picked up from the 23 scene lights, which is why
 * it sits above the old emissive numbers: the unlit strips carry the whole
 * bloom halo on their own (#229).
 */
export interface NeonGroupConfig {
  readonly id: "wall-top" | "wall-bottom" | "pillar-rings" | "lamp-faces";
  /** Base colour; `null` for per-part colours (lamp faces, pillar rings). */
  readonly color: string | null;
  /** HDR multiplier baked into the vertex colours so bloom picks it up. */
  readonly intensity: number;
  /** 0 means static: no per-frame material update at all. */
  readonly flickerSpeed: number;
}

export const ARENA_NEON_GROUPS: readonly NeonGroupConfig[] = [
  { id: "wall-top", color: "#00f3ff", intensity: 2.4, flickerSpeed: 3 },
  { id: "wall-bottom", color: "#ff00aa", intensity: 1.8, flickerSpeed: 2 },
  { id: "pillar-rings", color: null, intensity: 3.4, flickerSpeed: 4 },
  { id: "lamp-faces", color: null, intensity: 5, flickerSpeed: 0 },
];

export const ARENA_PILLAR_RING_COLORS = ["#00f3ff", "#ff00aa"] as const;
