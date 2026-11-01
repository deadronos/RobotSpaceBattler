import {
  segmentIntersectsAABB,
  segmentIntersectsCircle,
} from "../../lib/math/geometry";

/** Axis-aligned XZ rectangle (walls, barrier boxes). */
export interface OccluderRect {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

/** XZ circle (pillars). */
export interface OccluderCircle {
  x: number;
  z: number;
  radius: number;
}

/** XZ bounds covered by the index. */
export interface OcclusionBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

const CELL_SIZE = 6;
/**
 * Sentinel "never" value for the DDA. Must not be `Infinity`: a heap-number
 * Infinity in the loop makes V8 box every double update, which allocates on
 * the AI hot path.
 */
const NEVER = 1e6;

let originX = 0;
let originZ = 0;
let cols = 1;
let rows = 1;
let cellLists: Array<number[] | undefined> = [];

const wallRefs: OccluderRect[] = [];
const circleRefs: OccluderCircle[] = [];
const occluderMinX: number[] = [];
const occluderMaxX: number[] = [];
const occluderMinZ: number[] = [];
const occluderMaxZ: number[] = [];
let visited = new Int32Array(0);
let epoch = 0;

function cellColumn(x: number): number {
  const c = Math.floor((x - originX) / CELL_SIZE);
  return c < 0 ? 0 : c >= cols ? cols - 1 : c;
}

function cellRow(z: number): number {
  const r = Math.floor((z - originZ) / CELL_SIZE);
  return r < 0 ? 0 : r >= rows ? rows - 1 : r;
}

function registerOccluder(
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): number {
  const index = occluderMinX.length;
  occluderMinX.push(minX);
  occluderMaxX.push(maxX);
  occluderMinZ.push(minZ);
  occluderMaxZ.push(maxZ);

  const colMin = Math.max(0, cellColumn(minX));
  const colMax = cellColumn(maxX);
  const rowMin = Math.max(0, cellRow(minZ));
  const rowMax = cellRow(maxZ);
  for (let row = rowMin; row <= rowMax; row += 1) {
    for (let col = colMin; col <= colMax; col += 1) {
      const cell = row * cols + col;
      const list = cellLists[cell];
      if (list === undefined) cellLists[cell] = [index];
      else list.push(index);
    }
  }
  return index;
}

/**
 * Builds the static occlusion index. Called once by the arena geometry module
 * with the arena walls and pillars.
 */
export function buildStaticOcclusionIndex(
  walls: readonly OccluderRect[],
  circles: readonly OccluderCircle[],
  bounds: OcclusionBounds,
): void {
  originX = bounds.minX;
  originZ = bounds.minZ;
  cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / CELL_SIZE));
  rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / CELL_SIZE));
  cellLists = new Array(cols * rows);

  for (let i = 0; i < walls.length; i += 1) {
    const wall = walls[i];
    wallRefs.push(wall);
    registerOccluder(
      wall.x - wall.halfWidth,
      wall.x + wall.halfWidth,
      wall.z - wall.halfDepth,
      wall.z + wall.halfDepth,
    );
  }

  for (let i = 0; i < circles.length; i += 1) {
    const circle = circles[i];
    circleRefs.push(circle);
    registerOccluder(
      circle.x - circle.radius,
      circle.x + circle.radius,
      circle.z - circle.radius,
      circle.z + circle.radius,
    );
  }

  visited = new Int32Array(occluderMinX.length);
}

function occluderHits(
  index: number,
  start: { x: number; z: number },
  end: { x: number; z: number },
): boolean {
  if (index < wallRefs.length) {
    const wall = wallRefs[index];
    return segmentIntersectsAABB(
      start,
      end,
      wall,
      wall.halfWidth,
      wall.halfDepth,
    );
  }

  const circle = circleRefs[index - wallRefs.length];
  return segmentIntersectsCircle(start, end, circle, circle.radius);
}

/**
 * Tests a 2D segment against the static occluders registered in the cells it
 * crosses. Walks the cells with a DDA so only nearby shapes are tested.
 *
 * @returns True when a wall or pillar intersects the segment.
 */
export function blocksStaticSegment(
  start: { x: number; z: number },
  end: { x: number; z: number },
): boolean {
  if (start.x === end.x && start.z === end.z) {
    return false;
  }

  epoch += 1;
  if (epoch >= 0x3fffffff) {
    visited.fill(0);
    epoch = 1;
  }
  const stamp = epoch;

  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  let col = cellColumn(start.x);
  let row = cellRow(start.z);
  const endCol = cellColumn(end.x);
  const endRow = cellRow(end.z);

  // Boundaries are clamped to the grid, so the first step can be immediate.
  const nextX = originX + (col + (stepX > 0 ? 1 : 0)) * CELL_SIZE;
  const nextZ = originZ + (row + (stepZ > 0 ? 1 : 0)) * CELL_SIZE;
  let tMaxX = dx === 0 ? NEVER : (nextX - start.x) / dx;
  let tMaxZ = dz === 0 ? NEVER : (nextZ - start.z) / dz;
  const tDeltaX = dx === 0 ? NEVER : CELL_SIZE / Math.abs(dx);
  const tDeltaZ = dz === 0 ? NEVER : CELL_SIZE / Math.abs(dz);

  const maxSteps = cols + rows + 4;
  for (let step = 0; step <= maxSteps; step += 1) {
    const list = cellLists[row * cols + col];
    if (list !== undefined) {
      for (let i = 0; i < list.length; i += 1) {
        const index = list[i];
        if (visited[index] === stamp) continue;
        visited[index] = stamp;
        if (occluderHits(index, start, end)) return true;
      }
    }

    if (col === endCol && row === endRow) return false;
    if (tMaxX <= tMaxZ) {
      col += stepX;
      tMaxX += tDeltaX;
    } else {
      row += stepZ;
      tMaxZ += tDeltaZ;
    }
  }

  return false;
}
