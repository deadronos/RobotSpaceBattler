import type { RobotEntity } from "../../ecs/world";

const MAX_CELLS = 16384;
/** Ciura gap sequence (descending) for the in-place shell sort. */
const GAPS = [701, 301, 132, 57, 23, 10, 4, 1];

interface TeamBucket {
  list: RobotEntity[];
  count: number;
}

function resetBucket(bucket: TeamBucket): void {
  bucket.count = 0;
}

function trimBucket(bucket: TeamBucket): void {
  // Trim once after filling: `length = 0` + push reallocates every rebuild.
  if (bucket.list.length !== bucket.count) bucket.list.length = bucket.count;
}

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
  private readonly byTeam = new Map<string, TeamBucket>();
  private picked = new Int32Array(0);
  private readonly emptyTeam: RobotEntity[] = [];

  constructor(cellSize = 16) {
    this.baseCellSize = cellSize;
    this.cellSize = cellSize;
  }

  /** Active robots on `team`, in source order. Valid until the next rebuild. */
  teamMembers(team: string): RobotEntity[] {
    return this.byTeam.get(team)?.list ?? this.emptyTeam;
  }

  /** Rebuilds the index from `robots`, skipping robots with health <= 0. */
  rebuild(robots: readonly RobotEntity[]): void {
    this.byTeam.forEach(resetBucket);
    let count = 0;

    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < robots.length; i += 1) {
      const robot = robots[i];
      if (robot.health <= 0) continue;
      this.members[count] = robot;
      count += 1;
      let bucket = this.byTeam.get(robot.team);
      if (!bucket) {
        bucket = { list: [], count: 0 };
        this.byTeam.set(robot.team, bucket);
      }
      bucket.list[bucket.count] = robot;
      bucket.count += 1;
      const { x, z } = robot.position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    if (this.members.length !== count) this.members.length = count;
    this.byTeam.forEach(trimBucket);
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
    const found = this.queryInto(x, z, radius, team, sameTeam, exclude, out);
    // Resizing `out` every call thrashes the backing store when the result
    // count varies (which it does per robot), so hot callers use `queryInto`
    // and read `count` instead.
    if (out.length !== found) out.length = found;
    return out;
  }

  /**
   * Collects active robots within `radius` (XZ) of (x, z) into `out`, in
   * source order, without resizing `out`.
   *
   * @returns The number of robots written to `out`. Entries at or past that
   * index are stale leftovers from a previous query.
   */
  queryInto(
    x: number,
    z: number,
    radius: number,
    team: string,
    sameTeam: boolean,
    exclude: RobotEntity | undefined,
    out: RobotEntity[],
  ): number {
    if (this.members.length === 0) {
      return 0;
    }

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

    // Restore source (world) order with an in-place shell sort (insertion sort
    // for the common small result); no temporary arrays or typed-array views.
    const picked = this.picked;
    for (let g = 0; g < GAPS.length; g += 1) {
      const gap = GAPS[g];
      if (gap >= found) continue;
      for (let i = gap; i < found; i += 1) {
        const value = picked[i];
        let j = i;
        while (j >= gap && picked[j - gap] > value) {
          picked[j] = picked[j - gap];
          j -= gap;
        }
        picked[j] = value;
      }
    }

    for (let i = 0; i < found; i += 1) {
      out[i] = this.members[this.picked[i]];
    }
    return found;
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
