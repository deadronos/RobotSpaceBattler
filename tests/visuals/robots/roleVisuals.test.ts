import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";

import {
  createRobotMaterial,
  createRobotRoleVisuals,
} from "../../../src/visuals/robots/roleVisuals";
import {
  ROBOT_ROLES,
  ROBOT_MUZZLE_OFFSETS,
} from "../../../src/visuals/robots/robotLayout";

describe("robot role silhouettes (#168)", () => {
  const visuals = createRobotRoleVisuals();

  it("builds one merged geometry per role", () => {
    for (const role of ROBOT_ROLES) {
      expect(visuals[role].geometry.getAttribute("position")).toBeDefined();
    }
  });

  it("gives every role a different silhouette, not just a colour", () => {
    const signatures = ROBOT_ROLES.map((role) => {
      const geometry = visuals[role].geometry;
      geometry.computeBoundingBox();
      const box = geometry.boundingBox ?? new Box3();
      const size = box.getSize(new Vector3());
      return [
        geometry.getAttribute("position").count,
        size.x.toFixed(2),
        size.y.toFixed(2),
      ].join(":");
    });
    expect(new Set(signatures).size).toBe(ROBOT_ROLES.length);
  });

  it("differs in height, so roles read at a distance", () => {
    const heights = ROBOT_ROLES.map((role) => {
      const geometry = visuals[role].geometry;
      geometry.computeBoundingBox();
      return (geometry.boundingBox ?? new Box3()).max.y;
    });
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.5);
  });

  it("bakes a brighter colour attribute for the head than the body", () => {
    for (const role of ROBOT_ROLES) {
      const color = visuals[role].geometry.getAttribute("color");
      const values = color.array as ArrayLike<number>;
      expect(values.length).toBeGreaterThan(0);
      let max = 0;
      for (let i = 0; i < values.length; i += 1) {
        max = Math.max(max, values[i]);
      }
      expect(max).toBeGreaterThan(1);
    }
  });

  it("shares one material for every role, so instancing shares a program", () => {
    const material = createRobotMaterial();
    expect(material.vertexColors).toBe(true);
    expect(material.color.getHexString()).toBe("ffffff");
  });

  it("has a muzzle offset for every role", () => {
    for (const role of ROBOT_ROLES) {
      expect(ROBOT_MUZZLE_OFFSETS[role].forward).toBeGreaterThan(0);
      expect(visuals[role].muzzleY).toBe(ROBOT_MUZZLE_OFFSETS[role].y);
    }
  });
});
