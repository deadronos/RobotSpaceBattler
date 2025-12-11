import { BattleWorld } from "../../ecs/world";
import { cloneVec3, subtractVec3, Vec3, vec3 } from "../../lib/math/vec3";
import { TelemetryPort } from "../../runtime/simulation/ports";
import { updateRapierObstacleTransforms } from "./rapierIntegration";

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

function pointAtDistance(
  points: Vec3[],
  lens: number[],
  distance: number,
): Vec3 {
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

export function updateObstacleMovement(
  world: BattleWorld,
  deltaMs: number,
  telemetry?: TelemetryPort,
): void {
  const deltaSeconds = deltaMs / 1000;

  for (const obstacle of world.obstacles.entities) {
    const p = obstacle.movementPattern;
    if (!p) continue;

    // Rotation pattern: rotate around a pivot
    if (p.patternType === "rotation") {
      if (!p.pivot) continue;

      if (p.progress == null || Number.isNaN(p.progress))
        p.progress = p.phase ?? 0;
      if (p.direction == null) p.direction = 1;

      const twoPi = Math.PI * 2;
      const deltaSeconds = deltaMs / 1000;

      // Initialize origin offset relative to pivot once
      p.originOffset =
        p.originOffset ?? subtractVec3(obstacle.position, p.pivot);

      const currentAngle = p.progress * twoPi;
      const deltaAngle = (p.direction ?? 1) * (p.speed ?? 0) * deltaSeconds;
      let nextAngle = currentAngle + deltaAngle;

      if (p.pingPong) {
        // reflect between 0..2pi
        if (nextAngle > twoPi) {
          nextAngle = twoPi - (nextAngle - twoPi);
          p.direction = -1;
        } else if (nextAngle < 0) {
          nextAngle = -nextAngle;
          p.direction = 1;
        }
      } else if (p.loop) {
        nextAngle = ((nextAngle % twoPi) + twoPi) % twoPi;
      } else {
        nextAngle = Math.max(0, Math.min(twoPi, nextAngle));
      }

      p.progress = nextAngle / twoPi;

      const off = p.originOffset;
      const pivot = p.pivot;
      const cosA = Math.cos(nextAngle);
      const sinA = Math.sin(nextAngle);
      const x = pivot.x + (off.x * cosA - off.z * sinA);
      const z = pivot.z + (off.x * sinA + off.z * cosA);
      const prevPos = obstacle.position
        ? cloneVec3(obstacle.position)
        : undefined;
      const prevY = obstacle.position?.y ?? 0;
      obstacle.position = vec3(x, prevY, z);
      // Update orientation if present
      obstacle.orientation = ((obstacle.orientation ?? 0) + deltaAngle) % twoPi;
      // emit telemetry for obstacle movement
      if (telemetry && obstacle.id) {
        const moved =
          !prevPos ||
          prevPos.x !== obstacle.position.x ||
          prevPos.z !== obstacle.position.z ||
          prevPos.y !== obstacle.position.y;
        if (moved) {
          telemetry.recordObstacleMove?.({
            frameIndex: world.state.frameIndex ?? 0,
            timestampMs: world.state.elapsedMs,
            obstacleId: obstacle.id,
            position: cloneVec3(obstacle.position),
            orientation: obstacle.orientation,
          });
        }
      }
      continue;
    }

    // Linear / oscillate path-following vehicles
    if (p.patternType !== "linear" && p.patternType !== "oscillate") continue;
    if (!p.points || p.points.length < 2) continue;

    // ensure pattern internals exist
    if (p.progress == null || Number.isNaN(p.progress))
      p.progress = p.phase ?? 0;
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
    const prevPos = obstacle.position
      ? cloneVec3(obstacle.position)
      : undefined;
    const prevY = obstacle.position?.y ?? 0;
    obstacle.position = vec3(pos.x, prevY, pos.z);
    if (telemetry && obstacle.id) {
      const moved =
        !prevPos ||
        prevPos.x !== obstacle.position.x ||
        prevPos.z !== obstacle.position.z ||
        prevPos.y !== obstacle.position.y;
      if (moved) {
        telemetry.recordObstacleMove?.({
          frameIndex: world.state.frameIndex ?? 0,
          timestampMs: world.state.elapsedMs,
          obstacleId: obstacle.id,
          position: cloneVec3(obstacle.position),
          orientation: obstacle.orientation,
        });
      }
    }
  }

  // If a Rapier world is attached, sync obstacle transforms so physics queries see runtime geometry.
  try {
    updateRapierObstacleTransforms(world);
  } catch {
    // Defensive: avoid throwing from movement update if Rapier binding throws for any reason
  }
}
