/**
 * Live instance window for instanced meshes (#233).
 *
 * An `InstancedMesh` draws `count` instances, so a mesh that only resets
 * `count` to its capacity vertex-processes every hidden slot. Slot allocation
 * here is sparse (a freed slot goes back on the free list and can be reused by
 * a later entity), so the window has to be the highest live slot plus one, not
 * the number of live slots: a hole below the top is drawn as a hidden instance.
 */
export function highWaterCount(activeIndices: Iterable<number>): number {
  let highest = -1;
  for (const index of activeIndices) {
    if (index > highest) highest = index;
  }
  return highest + 1;
}
