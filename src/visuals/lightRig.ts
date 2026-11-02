/**
 * The whole scene light rig (#230).
 *
 * Every lit fragment of every standard/physical material loops over these, so
 * the count is a budget: at most `SCENE_LIGHT_LIMIT` (6). Ambient + hemisphere
 * set the base level, one directional casts the only shadow, and two coloured
 * key lights keep the arena from going flat. The lamp panels, neon strips,
 * hover beacons and obstacle trims sell themselves through emissive + bloom, so
 * they no longer get a light each.
 *
 * Rendering only: nothing here is simulation state.
 */

export const SCENE_LIGHT_LIMIT = 6;

export interface AmbientLightConfig {
  readonly kind: "ambient";
  readonly color: string;
  readonly intensity: number;
}

export interface HemisphereLightConfig {
  readonly kind: "hemisphere";
  readonly color: string;
  readonly groundColor: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
}

export interface DirectionalLightConfig {
  readonly kind: "directional";
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
  readonly castShadow: boolean;
}

export interface SpotLightConfig {
  readonly kind: "spot";
  readonly color: string;
  readonly intensity: number;
  readonly position: readonly [number, number, number];
  readonly angle: number;
  readonly penumbra: number;
  readonly distance: number;
  readonly castShadow: boolean;
}

export type SceneLightConfig =
  | AmbientLightConfig
  | HemisphereLightConfig
  | DirectionalLightConfig
  | SpotLightConfig;

export const SCENE_LIGHTS: readonly SceneLightConfig[] = [
  { kind: "ambient", color: "#1a1d35", intensity: 0.35 },
  {
    kind: "hemisphere",
    color: "#3d4c99",
    groundColor: "#03040a",
    intensity: 0.5,
    position: [0, 34, 0],
  },
  {
    kind: "directional",
    color: "#f3f0ff",
    intensity: 1.6,
    position: [25, 32, 18],
    castShadow: true,
  },
  {
    kind: "directional",
    color: "#c8d7ff",
    intensity: 1.1,
    position: [-28, 26, -24],
    castShadow: false,
  },
  {
    kind: "spot",
    color: "#fff1d7",
    intensity: 1.4,
    position: [0, 42, 0],
    angle: 0.8,
    penumbra: 0.5,
    distance: 140,
    castShadow: false,
  },
  {
    kind: "spot",
    color: "#9d8bff",
    intensity: 1.2,
    position: [-30, 22, -20],
    angle: 0.7,
    penumbra: 0.45,
    distance: 120,
    castShadow: false,
  },
];

export function castsShadow(light: SceneLightConfig): boolean {
  return "castShadow" in light && light.castShadow;
}

export function shadowCastingLights(
  lights: readonly SceneLightConfig[] = SCENE_LIGHTS,
): SceneLightConfig[] {
  return lights.filter(castsShadow);
}
