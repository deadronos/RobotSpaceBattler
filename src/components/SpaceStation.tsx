import { ArenaMeshes } from "./SpaceStation/ArenaMeshes";

/**
 * SpaceStation - A battle arena with corridors, walls, and obstacles.
 *
 * The static geometry is merged into a few meshes (#229): the floor, one solid
 * mesh (walls, pillars, lamp housings) and one unlit mesh per neon pulse group.
 * The floor receives shadows (robots and walls fall on it) but never casts:
 * there is nothing below it (#231).
 *
 * The arena has no lights of its own (#230): the lamp panels, neon strips and
 * hover beacons are emissive and bloom, and the scene rig in `visuals/Lighting`
 * lights the surfaces.
 */
export function SpaceStation() {
  return <ArenaMeshes />;
}
