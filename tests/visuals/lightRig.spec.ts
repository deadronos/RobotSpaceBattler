import { describe, expect, it } from "vitest";

import {
  SCENE_LIGHTS,
  SCENE_LIGHT_LIMIT,
  castsShadow,
  shadowCastingLights,
} from "../../src/visuals/lightRig";

describe("scene light rig", () => {
  it("stays within the light budget", () => {
    expect(SCENE_LIGHTS.length).toBeLessThanOrEqual(SCENE_LIGHT_LIMIT);
    expect(SCENE_LIGHT_LIMIT).toBe(6);
  });

  it("has exactly one shadow caster", () => {
    const casters = shadowCastingLights();
    expect(casters).toHaveLength(1);
    expect(casters[0].kind).toBe("directional");
    expect(castsShadow(casters[0])).toBe(true);
  });

  it("keeps no per-lamp or per-beacon point lights", () => {
    const kinds: string[] = SCENE_LIGHTS.map((light) => light.kind);
    expect(kinds).not.toContain("point");
  });

  it("keeps ambient, hemisphere and a coloured fill", () => {
    const kinds = SCENE_LIGHTS.map((light) => light.kind);
    expect(kinds.filter((kind) => kind === "ambient")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "hemisphere")).toHaveLength(1);
    expect(kinds.filter((kind) => kind === "spot").length).toBeGreaterThan(0);
  });

  it("keeps every positioned light out of the floor", () => {
    const positioned = SCENE_LIGHTS.filter(
      (light) => light.kind === "directional" || light.kind === "spot",
    );
    expect(positioned.length).toBeGreaterThan(0);
    for (const light of positioned) {
      expect(light.position[1]).toBeGreaterThan(5);
    }
  });
});
