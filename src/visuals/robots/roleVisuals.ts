import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { UnitRole } from "../../ecs/worldTypes";
import { ensureGeometryHasVertexColors } from "../instanceColorUtils";
import { ROBOT_MUZZLE_OFFSETS } from "./robotLayout";

/**
 * One instanced mesh worth of geometry per role (#168).
 *
 * Every part of a role is merged into a single geometry, so a role costs one
 * draw call in the main pass and one in the shadow pass. Head parts are baked
 * brighter in the geometry's colour attribute, which gives a two-tone look with
 * a single shared material; the instance colour still supplies the team colour.
 */
export interface RobotRoleVisual {
  geometry: BufferGeometry;
  /** Local Y of the weapon muzzle, relative to the body centre. */
  muzzleY: number;
  /** Forward distance from the body centre to the muzzle. */
  muzzleForward: number;
}

interface RoleParts {
  /** Body-coloured parts. */
  body: BufferGeometry[];
  /** Highlight-coloured parts (heads, sights). */
  head: BufferGeometry[];
}

/** Silhouettes differ by proportion and by added parts, not only by colour. */
function createRoleParts(): Record<UnitRole, RoleParts> {
  return {
    // Standard trooper: rounded cylinder with a sphere head.
    assault: {
      body: [new CylinderGeometry(0.85, 0.98, 2.0, 16)],
      head: [new SphereGeometry(0.62, 16, 12).translate(0, 1.22, 0)],
    },
    // Wide and squat: shoulder plates and a blocky armoured head.
    tank: {
      body: [
        new CylinderGeometry(1.08, 1.22, 1.5, 12),
        new BoxGeometry(2.05, 0.5, 0.95).translate(0, 0.62, 0),
        new BoxGeometry(0.55, 0.42, 1.5).translate(0.62, 0.1, 0),
        new BoxGeometry(0.55, 0.42, 1.5).translate(-0.62, 0.1, 0),
      ],
      head: [new BoxGeometry(0.86, 0.5, 0.86).translate(0, 1.05, 0)],
    },
    // Tall and thin, with a long barrel and a narrow sighting head.
    sniper: {
      body: [
        new CylinderGeometry(0.44, 0.52, 2.6, 10),
        new BoxGeometry(0.16, 0.16, 1.7).translate(0, 0.45, 0.75),
      ],
      head: [new BoxGeometry(0.32, 0.8, 0.32).translate(0, 1.68, 0)],
    },
    // Octagonal frame with an oversized dome and a cross plate.
    medic: {
      body: [new CylinderGeometry(0.8, 0.95, 1.8, 8)],
      head: [
        new SphereGeometry(0.78, 12, 10).translate(0, 1.2, 0),
        new BoxGeometry(1.15, 0.3, 0.18).translate(0, 1.2, 0.7),
        new BoxGeometry(0.3, 1.15, 0.18).translate(0, 1.2, 0.7),
      ],
    },
  };
}

const HEAD_BRIGHTNESS = 1.18;

function buildRoleVisual(role: UnitRole, parts: RoleParts): RobotRoleVisual {
  const bodyVertexCount = parts.body.reduce(
    (total, part) => total + part.getAttribute("position").count,
    0,
  );
  const merged = mergeGeometries([...parts.body, ...parts.head], false);
  for (const part of [...parts.body, ...parts.head]) {
    part.dispose();
  }
  if (!merged) {
    throw new Error("robot role geometry merge failed");
  }

  ensureGeometryHasVertexColors(merged);
  const color = merged.getAttribute("color");
  if (color) {
    for (let i = bodyVertexCount; i < color.count; i += 1) {
      color.setXYZ(i, HEAD_BRIGHTNESS, HEAD_BRIGHTNESS, HEAD_BRIGHTNESS);
    }
    color.needsUpdate = true;
  }

  return {
    geometry: merged,
    muzzleY: ROBOT_MUZZLE_OFFSETS[role].y,
    muzzleForward: ROBOT_MUZZLE_OFFSETS[role].forward,
  };
}

/** One shared material for every role, so instancing shares one program. */
export function createRobotMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: "#ffffff",
    metalness: 0.25,
    roughness: 0.4,
    emissive: "#10131f",
    vertexColors: true,
  });
}

/** Builds the per-role geometry set once; the caller owns disposal. */
export function createRobotRoleVisuals(): Record<UnitRole, RobotRoleVisual> {
  const parts = createRoleParts();
  return {
    assault: buildRoleVisual("assault", parts.assault),
    tank: buildRoleVisual("tank", parts.tank),
    sniper: buildRoleVisual("sniper", parts.sniper),
    medic: buildRoleVisual("medic", parts.medic),
  };
}
