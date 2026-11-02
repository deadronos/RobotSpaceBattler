import { BoxGeometry, BufferGeometry, Color, CylinderGeometry } from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { ensureGeometryHasVertexColors } from "../instanceColorUtils";
import {
  ARENA_FLOOR,
  ARENA_LAMP_SIZE,
  ARENA_LAMPS,
  ARENA_NEON_GROUPS,
  ARENA_PILLAR,
  ARENA_PILLAR_RING,
  ARENA_PILLAR_RING_COLORS,
  ARENA_PILLARS,
  ARENA_SOLID,
  ARENA_WALLS,
  NEON_STRIP_HEIGHT,
  NEON_STRIP_INSET,
  type NeonGroupConfig,
} from "./arenaConfig";

/** Paints `color × multiplier` into a fresh geometry's vertex colours. */
function tinted<T extends BufferGeometry>(
  geometry: T,
  color: string | Color,
  multiplier = 1,
): T {
  const paint =
    typeof color === "string" ? new Color(color) : new Color().copy(color);
  if (multiplier !== 1) paint.multiplyScalar(multiplier);
  ensureGeometryHasVertexColors(geometry, paint);
  return geometry;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) {
    throw new Error("arena geometry merge failed");
  }
  merged.computeBoundingSphere();
  return merged;
}

/** Walls, pillars and lamp housings: one draw call, one material look. */
export function buildArenaSolidGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];

  for (const wall of ARENA_WALLS) {
    const box = new BoxGeometry(wall.dim[0], wall.dim[1], wall.dim[2]);
    box.translate(wall.pos[0], wall.pos[1], wall.pos[2]);
    parts.push(tinted(box, ARENA_SOLID.wallColor));
  }

  for (const position of ARENA_PILLARS) {
    const pillar = new CylinderGeometry(
      ARENA_PILLAR.radius,
      ARENA_PILLAR.radius,
      ARENA_PILLAR.height,
      ARENA_PILLAR.sideSegments,
    );
    pillar.translate(position[0], position[1], position[2]);
    parts.push(tinted(pillar, ARENA_SOLID.pillarColor));
  }

  for (const lamp of ARENA_LAMPS) {
    const housing = new BoxGeometry(
      ARENA_LAMP_SIZE.housing[0],
      ARENA_LAMP_SIZE.housing[1],
      ARENA_LAMP_SIZE.housing[2],
    );
    housing.rotateY(lamp.rotationY);
    housing.translate(lamp.position[0], lamp.position[1], lamp.position[2]);
    parts.push(tinted(housing, ARENA_SOLID.lampHousingColor));
  }

  return merge(parts);
}

/** The floor slab. Separate mesh because it is the only large receiving plane. */
export function buildArenaFloorGeometry(): BufferGeometry {
  const floor = new BoxGeometry(
    ARENA_FLOOR.size,
    ARENA_FLOOR.thickness,
    ARENA_FLOOR.size,
  );
  floor.translate(0, ARENA_FLOOR.y, 0);
  floor.computeBoundingBox();
  return floor;
}

export interface ArenaNeonGroup extends NeonGroupConfig {
  readonly geometry: BufferGeometry;
}

/**
 * The neon strips, pillar rings and lamp faces as 4 unlit geometries (#229).
 *
 * Every part carries `colour × intensity` in its vertex colours and the
 * material is a `MeshBasicMaterial` with `toneMapped: false`, so the values
 * above 1.0 reach the bloom pass exactly like the old emissive materials did.
 */
export function buildArenaNeonGroups(): ArenaNeonGroup[] {
  return ARENA_NEON_GROUPS.map((group) => ({
    ...group,
    geometry: merge(buildNeonParts(group)),
  }));
}

function buildNeonParts(group: NeonGroupConfig): BufferGeometry[] {
  switch (group.id) {
    case "wall-top":
    case "wall-bottom": {
      const parts: BufferGeometry[] = [];
      const sign = group.id === "wall-top" ? 1 : -1;
      for (const wall of ARENA_WALLS) {
        const strip = new BoxGeometry(
          wall.dim[0] + NEON_STRIP_INSET,
          NEON_STRIP_HEIGHT,
          wall.dim[2] + NEON_STRIP_INSET,
        );
        strip.translate(
          wall.pos[0],
          wall.pos[1] + sign * (wall.dim[1] / 2 - NEON_STRIP_INSET),
          wall.pos[2],
        );
        parts.push(tinted(strip, group.color ?? "#ffffff", group.intensity));
      }
      return parts;
    }
    case "pillar-rings": {
      const parts: BufferGeometry[] = [];
      for (const position of ARENA_PILLARS) {
        ARENA_PILLAR_RING.offsetsY.forEach((offsetY, ringIndex) => {
          const ring = new CylinderGeometry(
            ARENA_PILLAR_RING.radius,
            ARENA_PILLAR_RING.radius,
            ARENA_PILLAR_RING.height,
            ARENA_PILLAR_RING.segments,
          );
          ring.translate(position[0], position[1] + offsetY, position[2]);
          const color =
            ARENA_PILLAR_RING_COLORS[
              ringIndex % ARENA_PILLAR_RING_COLORS.length
            ];
          parts.push(tinted(ring, color, group.intensity));
        });
      }
      return parts;
    }
    case "lamp-faces": {
      return ARENA_LAMPS.map((lamp) => {
        const face = new BoxGeometry(
          ARENA_LAMP_SIZE.face[0],
          ARENA_LAMP_SIZE.face[1],
          ARENA_LAMP_SIZE.face[2],
        );
        face.translate(0, 0, ARENA_LAMP_SIZE.faceOffset);
        face.rotateY(lamp.rotationY);
        face.translate(lamp.position[0], lamp.position[1], lamp.position[2]);
        return tinted(face, lamp.color, group.intensity);
      });
    }
  }
}
