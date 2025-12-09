import { BattleWorld, ObstacleEntity } from '../../ecs/world';
import { Vec3, vec3, addVec3, subVec3, cloneVec3 } from '../../lib/math/vec3';

function segmentLengths(points: Vec3[]): number[] {
  const lens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    lens.push(Math.sqrt(dx * dx + dz * dz));
  }
  return lens;
}

function totalLength(lens: number[]): number {
  return lens.reduce((s, v) => s + v, 0);
}

function pointAtDistance(points: Vec3[], lens: number[], distance: number): Vec3 {
  if (points.length === 0) return vec3(0, 0, 0);
  if (points.length === 1) return cloneVec3(points[0]);

  let remaining = distance;
  for (let i = 0; i < lens.length; i++) {
    const seg = lens[i];
    if (remaining <= seg) {
      const a = points[i];
      const b = points[i + 1];
      const t = seg <= 0 ? 0 : remaining / seg;
      return vec3(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
    }
    remaining -= seg;
  }

  // Fall back to last point
  return cloneVec3(points[points.length - 1]);
}

export function updateObstacleMovement(world: BattleWorld, deltaMs: number): void {
  const deltaSeconds = deltaMs / 1000;

  for (const obstacle of world.obstacles.entities) {
    const p = obstacle.movementPattern;
    if (!p || p.patternType !== 'linear' || !p.points || p.points.length < 2) continue;

    // ensure pattern internals exist
    if (p.progress == null || Number.isNaN(p.progress)) p.progress = p.phase ?? 0;
    if (p.direction == null) p.direction = 1;

    const lens = segmentLengths(p.points);
    const tlen = totalLength(lens);
    if (tlen <= 0) continue;

    const speed = p.speed ?? 0;
    const absoluteDistance = Math.max(0, Math.min(tlen, p.progress * tlen));
    let nextDistance = absoluteDistance + p.direction * speed * deltaSeconds;

    if (p.pingPong) {
      if (nextDistance > tlen) {
        nextDistance = tlen - (nextDistance - tlen);
        p.direction = -1;
      } else if (nextDistance < 0) {
        nextDistance = -nextDistance;
        p.direction = 1;
      }
    } else if (p.loop) {
      // wrap around
      nextDistance = ((nextDistance % tlen) + tlen) % tlen;
    } else {
      // clamp
      nextDistance = Math.max(0, Math.min(tlen, nextDistance));
    }

    p.progress = nextDistance / tlen;

    const pos = pointAtDistance(p.points, lens, nextDistance);
    // update obstacle position (y stays same if set)
    const prevY = obstacle.position?.y ?? 0;
    obstacle.position = vec3(pos.x, prevY, pos.z);
  }
}
