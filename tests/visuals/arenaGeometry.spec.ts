import { Color } from "three";
import { describe, expect, it } from "vitest";

import {
  ARENA_FLOOR,
  ARENA_LAMP_SIZE,
  ARENA_LAMPS,
  ARENA_PILLAR,
  ARENA_PILLAR_RING,
  ARENA_PILLARS,
  ARENA_WALLS,
} from "../../src/visuals/arena/arenaConfig";
import {
  buildArenaFloorGeometry,
  buildArenaNeonGroups,
  buildArenaSolidGeometry,
} from "../../src/visuals/arena/arenaGeometry";
import { neonPulse } from "../../src/visuals/arena/arenaNeonPulse";

const BOX_TRIANGLES = 12;

// Cylinder side = segments × 2, both caps = segments × 2.
const cylinderTriangles = (segments: number) => segments * 4;

describe("arena solid geometry", () => {
  it("merges every wall, pillar and lamp housing into one geometry", () => {
    const merged = buildArenaSolidGeometry();
    const triangles = merged.index!.count / 3;
    expect(triangles).toBe(
      ARENA_WALLS.length * BOX_TRIANGLES +
        ARENA_PILLARS.length * cylinderTriangles(ARENA_PILLAR.sideSegments) +
        ARENA_LAMPS.length * BOX_TRIANGLES,
    );
    // Vertex colours carry the per-part base colours.
    expect(merged.getAttribute("color").count).toBe(
      merged.getAttribute("position").count,
    );
  });

  it("bounds match the wall, pillar and lamp config", () => {
    const merged = buildArenaSolidGeometry();
    merged.computeBoundingBox();
    const box = merged.boundingBox!;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    let maxY = -Infinity;
    for (const wall of ARENA_WALLS) {
      minX = Math.min(minX, wall.pos[0] - wall.dim[0] / 2);
      maxX = Math.max(maxX, wall.pos[0] + wall.dim[0] / 2);
      minZ = Math.min(minZ, wall.pos[2] - wall.dim[2] / 2);
      maxZ = Math.max(maxZ, wall.pos[2] + wall.dim[2] / 2);
      maxY = Math.max(maxY, wall.pos[1] + wall.dim[1] / 2);
    }
    expect(box.min.x).toBeCloseTo(minX, 5);
    expect(box.max.x).toBeCloseTo(maxX, 5);
    expect(box.min.z).toBeCloseTo(minZ, 5);
    expect(box.max.z).toBeCloseTo(maxZ, 5);
    expect(box.max.y).toBeCloseTo(maxY, 5);
    // Walls start at the floor line, pillars are fully inside the arena.
    expect(box.min.y).toBeCloseTo(0, 5);
    for (const pillar of ARENA_PILLARS) {
      expect(Math.abs(pillar[0]) + ARENA_PILLAR.radius).toBeLessThan(
        Math.abs(minX),
      );
    }
  });

  it("builds the floor as one quad-footprint box", () => {
    const floor = buildArenaFloorGeometry();
    expect(floor.index!.count / 3).toBe(BOX_TRIANGLES);
    floor.computeBoundingBox();
    const box = floor.boundingBox!;
    expect(box.max.x - box.min.x).toBeCloseTo(ARENA_FLOOR.size, 5);
    expect(box.max.z - box.min.z).toBeCloseTo(ARENA_FLOOR.size, 5);
    expect(box.max.y - box.min.y).toBeCloseTo(ARENA_FLOOR.thickness, 5);
    expect((box.max.y + box.min.y) / 2).toBeCloseTo(ARENA_FLOOR.y, 5);
  });
});

describe("arena neon groups", () => {
  it("splits the neon into one mesh per pulse group", () => {
    const groups = buildArenaNeonGroups();
    expect(groups.map((group) => group.id)).toEqual([
      "wall-top",
      "wall-bottom",
      "pillar-rings",
      "lamp-faces",
    ]);
    const byId = new Map(groups.map((group) => [group.id, group]));
    expect(byId.get("wall-top")!.geometry.index!.count / 3).toBe(
      ARENA_WALLS.length * BOX_TRIANGLES,
    );
    expect(byId.get("wall-bottom")!.geometry.index!.count / 3).toBe(
      ARENA_WALLS.length * BOX_TRIANGLES,
    );
    expect(byId.get("pillar-rings")!.geometry.index!.count / 3).toBe(
      ARENA_PILLARS.length * 2 * cylinderTriangles(ARENA_PILLAR_RING.segments),
    );
    expect(byId.get("lamp-faces")!.geometry.index!.count / 3).toBe(
      ARENA_LAMPS.length * BOX_TRIANGLES,
    );
  });

  it("pulses the strips and rings but leaves the lamp faces static", () => {
    const groups = buildArenaNeonGroups();
    const speeds = Object.fromEntries(
      groups.map((group) => [group.id, group.flickerSpeed]),
    );
    expect(speeds["wall-top"]).toBe(3);
    expect(speeds["wall-bottom"]).toBe(2);
    expect(speeds["pillar-rings"]).toBe(4);
    expect(speeds["lamp-faces"]).toBe(0);
  });

  it("bakes colour × intensity into the vertex colours", () => {
    const groups = buildArenaNeonGroups();
    const wallTop = groups.find((group) => group.id === "wall-top")!;
    const expected = new Color("#00f3ff").multiplyScalar(wallTop.intensity);
    const colors = wallTop.geometry.getAttribute("color");
    for (let i = 0; i < colors.count; i += 1) {
      expect(colors.getX(i)).toBeCloseTo(expected.r, 4);
      expect(colors.getY(i)).toBeCloseTo(expected.g, 4);
      expect(colors.getZ(i)).toBeCloseTo(expected.b, 4);
    }
  });

  it("keeps every lamp panel colour in the merged lamp faces", () => {
    const lampFaces = buildArenaNeonGroups().find(
      (group) => group.id === "lamp-faces",
    )!;
    const colors = lampFaces.geometry.getAttribute("color");
    const seen = new Set<string>();
    for (let i = 0; i < colors.count; i += 1) {
      seen.add(
        new Color(
          colors.getX(i) / lampFaces.intensity,
          colors.getY(i) / lampFaces.intensity,
          colors.getZ(i) / lampFaces.intensity,
        )
          .getHexString()
          .toUpperCase(),
      );
    }
    const expected = new Set(
      ARENA_LAMPS.map((lamp) =>
        new Color(lamp.color).getHexString().toUpperCase(),
      ),
    );
    expect(seen).toEqual(expected);
    expect(ARENA_LAMP_SIZE.face[0]).toBeLessThan(ARENA_LAMP_SIZE.housing[0]);
  });
});

describe("neon pulse", () => {
  it("stays within 0.8×–1.2× and is neutral without flicker", () => {
    for (let t = 0; t < 10; t += 0.05) {
      expect(neonPulse(t, 3)).toBeGreaterThanOrEqual(0.8);
      expect(neonPulse(t, 3)).toBeLessThanOrEqual(1.2);
    }
    expect(neonPulse(1.25, 0)).toBe(1);
    expect(neonPulse(0, 4)).toBe(1);
  });
});
