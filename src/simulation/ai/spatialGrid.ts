import type { RobotEntity } from "../../ecs/world";

const MAX_CELLS = 16384;

/**
 * Uniform XZ-plane grid over the active robots, rebuilt once per AI tick.
 *
 * - Rebuild is O(n) and, after warm-up, allocation free (typed arrays and
 *   member lists are reused).
 * - `query` returns every active robot whose XZ distance to the query point is
 *   <= radius (a superset of any 3D range test with the same radius), in the
 *   same order as the source robot list. Matching brute-force iteration order
 *   keeps target selection tie-breaking identical.
 */
export class SpatialGrid {
  private readonly baseCellSize: number;
  private cellSize: number;
  private minX = 0;
  private minZ = 0;
  private cols = 1;
  private rows = 1;
  private cellHead = new Int32Array(1);
  private next = new Int32Array(0);
  private slotCell = new Int32Array(0);
  private members: RobotEntity[] = [];
  private readonly byTeam = new Map<string, RobotEntity[]>();
  private picked = new Int32Array(0);
  private readonly emptyTeam: RobotEntity[] = [];

  constructor(cellSize = 16) {
    this.baseCellSize = cellSize;
    this.cellSize = cellSize;
  }

  /** Active robots on `team`, in source order. Valid until the next rebuild. */
  teamMembers(team: string): RobotEntity[] {
    return this.byTeam.get(team) ?? this.emptyTeam;
  }

  /** Rebuilds the index from `robots`, skipping robots with health <= 0. */
  rebuild(robots: readonly RobotEntity[]): void {
    for (const list of this.byTeam.values()) list.length = 0;
    this.members.length = 0;

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < robots.length; i += 1) {
      const robot = robots[i];
      if (robot.health <= 0) continue;
      this.members.push(robot);
      let list = this.byTeam.get(robot.team);
      if (!list) {
        list = [];
        this.byTeam.set(robot.team, list);
      }
      list.push(robot);
      const { x, z } = robot.position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    const count = this.members.length;
    if (count === 0) {
      this.cols = 1;
      this.rows = 1;
      this.cellHead.fill(-1, 0, 1);
      return;
    }

    let cellSize = this.baseCellSize;
    while (
      (Math.floor((maxX - minX) / cellSize) + 1) *
        (Math.floor((maxZ - minZ) / cellSize) + 1) >
      MAX_CELLS
    ) {
      cellSize *= 2;
    }
    this.cellSize = cellSize;
    this.minX = minX;
    this.minZ = minZ;
    this.cols = Math.floor((maxX - minX) / cellSize) + 1;
    this.rows = Math.floor((maxZ - minZ) / cellSize) + 1;

    const cells = this.cols * this.rows;
    if (this.cellHead.length < cells) this.cellHead = new Int32Array(cells);
    this.cellHead.fill(-1, 0, cells);
    if (this.next.length < count) {
      this.next = new Int32Array(count * 2);
      this.slotCell = new Int32Array(count * 2);
      this.picked = new Int32Array(count * 2);
    }

    // Insert in reverse so each cell's list ascends in source order.
    for (let slot = count - 1; slot >= 0; slot -= 1) {
      const { x, z } = this.members[slot].position;
      const cell = this.cellY(z) * this.cols + this.cellX(x);
      this.next[slot] = this.cellHead[cell];
      this.cellHead[cell] = slot;
    }
  }

  /**
   * Collects active robots within `radius` (XZ) of (x, z) into `out`, in
   * source order. `sameTeam` selects robots on `team` (true) or on any other
   * team (false). `exclude` is skipped by id.
   */
  query(
    x: number,
    z: number,
    radius: number,
    team: string,
    sameTeam: boolean,
    exclude: RobotEntity | undefined,
    out: RobotEntity[],
  ): RobotEntity[] {
    out.length = 0;
    if (this.members.length === 0) return out;

    const x0 = this.cellX(x - radius);
    const x1 = this.cellX(x + radius);
    const z0 = this.cellY(z - radius);
    const z1 = this.cellY(z + radius);
    const radiusSq = radius * radius;
    let found = 0;

    for (let cz = z0; cz <= z1; cz += 1) {
      for (let cx = x0; cx <= x1; cx += 1) {
        for (
          let slot = this.cellHead[cz * this.cols + cx];
          slot !== -1;
          slot = this.next[slot]
        ) {
          const robot = this.members[slot];
          if ((robot.team === team) !== sameTeam) continue;
          if (exclude !== undefined && robot.id === exclude.id) continue;
          const dx = robot.position.x - x;
          const dz = robot.position.z - z;
          if (dx * dx + dz * dz > radiusSq) continue;
          this.picked[found] = slot;
          found += 1;
        }
      }
    }

    // Restore source (world) order: cheap insertion sort for the common small
    // result, native typed-array sort otherwise.
    if (found <= 24) {
      for (let i = 1; i < found; i += 1) {
        const value = this.picked[i];
        let j = i - 1;
        while (j >= 0 && this.picked[j] > value) {
          this.picked[j + 1] = this.picked[j];
          j -= 1;
        }
        this.picked[j + 1] = value;
      }
    } else {
      this.picked.subarray(0, found).sort();
    }

    for (let i = 0; i < found; i += 1) {
      out.push(this.members[this.picked[i]]);
    }
    return out;
  }

  private cellX(x: number): number {
    const c = Math.floor((x - this.minX) / this.cellSize);
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private cellY(z: number): number {
    const c = Math.floor((z - this.minZ) / this.cellSize);
    return c < 0 ? 0 : c >= this.rows ? this.rows - 1 : c;
  }
}
