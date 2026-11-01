import {
  segmentAABBHitT,
  segmentCircleHitT,
  segmentSphereHitT,
} from "../../lib/math/segment";
import {
  addInPlaceVec3,
  cloneVec3,
  copyVec3,
  distanceVec3,
  scaleVec3To,
  vec3,
} from "../../lib/math/vec3";
import type { ReadonlyVec3 } from "../../lib/math/vec3";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TelemetryPort } from "../../runtime/simulation/ports";
import { applyDamageToObstacle } from "../../simulation/obstacles/destructibleSystem";
import {
  BattleWorld,
  ObstacleEntity,
  ProjectileEntity,
  RobotEntity,
} from "../world";
import {
  applyDirectHit,
  applyRocketExplosion,
  findTarget,
} from "./projectile/projectileHelpers";

const activeRobotsScratch: RobotEntity[] = [];
const robotsByIdScratch = new Map<string, RobotEntity>();
const previousPositionScratch = vec3();
const impactPointScratch = vec3();
const obstacleCenterScratch = { x: 0, z: 0 };

/** Robot hit sphere radius used for projectile-vs-robot collisions. */
const ROBOT_HIT_RADIUS = 1.2;

interface ObstacleHit {
  obstacle: ObstacleEntity;
  /** Earliest intersection parameter along the swept segment, in [0, 1]. */
  t: number;
}

/**
 * Finds the first obstacle the swept segment enters, so a fast projectile
 * cannot tunnel through a thin wall. Obstacles are planar (XZ) volumes.
 */
function findEarliestObstacleHit(
  obstacles: readonly ObstacleEntity[],
  from: ReadonlyVec3,
  to: ReadonlyVec3,
): ObstacleHit | null {
  let earliest: ObstacleHit | null = null;

  for (let i = 0; i < obstacles.length; i += 1) {
    const obstacle = obstacles[i];
    if (!obstacle || obstacle.active === false) continue;

    const shape = obstacle.shape;
    if (!shape || (shape.kind !== "box" && shape.kind !== "circle")) continue;

    obstacleCenterScratch.x = shape.center?.x ?? obstacle.position.x;
    obstacleCenterScratch.z = shape.center?.z ?? obstacle.position.z;

    const t =
      shape.kind === "box"
        ? segmentAABBHitT(
            from,
            to,
            obstacleCenterScratch,
            shape.halfWidth,
            shape.halfDepth,
          )
        : segmentCircleHitT(from, to, obstacleCenterScratch, shape.radius);

    if (t !== null && (earliest === null || t < earliest.t)) {
      earliest = { obstacle, t };
    }
  }

  return earliest;
}

/** Applies the obstacle hit: cover damage plus projectile removal. */
function resolveObstacleHit(
  world: BattleWorld,
  projectile: ProjectileEntity,
  hit: ObstacleHit,
  telemetry: TelemetryPort,
): void {
  // Apply damage to destructible cover on hit
  if (hit.obstacle.obstacleType === "destructible") {
    applyDamageToObstacle(world, hit.obstacle.id, projectile.damage, telemetry);
  }

  world.removeProjectile(projectile);
}

/** Interpolates the impact point along the swept segment into a scratch vec. */
function impactPoint(
  from: ReadonlyVec3,
  to: ReadonlyVec3,
  t: number,
): ReadonlyVec3 {
  impactPointScratch.x = from.x + (to.x - from.x) * t;
  impactPointScratch.y = from.y + (to.y - from.y) * t;
  impactPointScratch.z = from.z + (to.z - from.z) * t;
  return impactPointScratch;
}

/**
 * Updates the projectile simulation.
 * Handles projectile movement, collision detection, and damage application.
 *
 * @param world - The battle world.
 * @param deltaSeconds - Time elapsed since last update in seconds.
 * @param telemetry - Port for recording telemetry events.
 */
export function updateProjectileSystem(
  world: BattleWorld,
  deltaSeconds: number,
  telemetry: TelemetryPort,
): void {
  perfMarkStart("updateProjectileSystem");

  const robots = world.robots.entities;
  activeRobotsScratch.length = 0;
  robotsByIdScratch.clear();

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    robotsByIdScratch.set(robot.id, robot);
    if (isActiveRobot(robot)) {
      activeRobotsScratch.push(robot);
    }
  }

  const projectiles = world.projectiles.entities;
  const displacement = vec3();

  for (let i = 0; i < projectiles.length; i += 1) {
    const projectile = projectiles[i];
    copyVec3(previousPositionScratch, projectile.position);
    scaleVec3To(displacement, projectile.velocity, deltaSeconds);
    addInPlaceVec3(projectile.position, displacement);
    projectile.distanceTraveled += projectile.speed * deltaSeconds;

    const ageMs = world.state.elapsedMs - projectile.spawnTime;

    // Swept obstacle test: the segment travelled this step vs. the obstacle
    // volumes, so a large delta cannot carry the projectile through a thin
    // wall. The hit is held back until we know whether a robot was hit first.
    const obstacleHit = findEarliestObstacleHit(
      world.obstacles.entities,
      previousPositionScratch,
      projectile.position,
    );

    if (
      !obstacleHit &&
      (projectile.distanceTraveled >= projectile.maxDistance ||
        ageMs >= projectile.maxLifetime)
    ) {
      world.removeProjectile(projectile);
      continue;
    }

    const target = findTarget(
      projectile,
      activeRobotsScratch,
      robotsByIdScratch,
    );

    // Swept test: the segment travelled this step vs. the target sphere, so a
    // large delta cannot carry the projectile through the target.
    const robotHitT = target
      ? segmentSphereHitT(
          previousPositionScratch,
          projectile.position,
          target.position,
          ROBOT_HIT_RADIUS,
        )
      : null;

    // Resolve by the earliest hit along the segment: a nearer wall shields the
    // robot behind it, and a nearer robot is hit before the wall beyond it.
    // Ties go to the obstacle, matching the previous obstacle-first order.
    if (
      !target ||
      robotHitT === null ||
      (obstacleHit !== null && robotHitT >= obstacleHit.t)
    ) {
      if (obstacleHit) {
        resolveObstacleHit(world, projectile, obstacleHit, telemetry);
      }
      continue;
    }

    // Detonate/apply the hit at the exact impact point rather than where the
    // step happened to end.
    copyVec3(
      projectile.position,
      impactPoint(previousPositionScratch, projectile.position, robotHitT),
    );

    const shooter = robotsByIdScratch.get(projectile.shooterId);

    if (projectile.weapon === "rocket") {
      // read aoe radius and explosion center now — applyRocketExplosion will remove and release the projectile
      const savedAoeRadius = projectile.aoeRadius ?? 0;
      const explosionCenter = cloneVec3(projectile.position);
      const savedProjectileDamage = projectile.damage;
      // Explosion should also affect destructible obstacles in AoE
      applyRocketExplosion(
        world,
        projectile,
        shooter,
        telemetry,
        target,
        activeRobotsScratch,
      );

      // After applying explosion, damage obstacles in range using saved radius (projectile may have been released)
      const radius = savedAoeRadius;
      if (radius > 0) {
        for (let oi = 0; oi < world.obstacles.entities.length; oi += 1) {
          const obs = world.obstacles.entities[oi] as ObstacleEntity;
          if (!obs) continue;
          const dist = distanceVec3(obs.position, explosionCenter);

          if (dist <= radius) {
            if (obs.obstacleType === "destructible") {
              // scale damage by distance falloff (same as robots)
              const falloff = Math.max(0, 1 - dist / radius);
              const baseDamage = savedProjectileDamage * falloff;

              applyDamageToObstacle(world, obs.id, baseDamage, telemetry);
            }
          }
        }
      }
    } else {
      applyDirectHit(world, projectile, target, shooter, telemetry);
    }
  }

  perfMarkEnd("updateProjectileSystem");
}
