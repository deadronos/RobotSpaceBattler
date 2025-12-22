import {
  distanceSquaredPointToAABB,
  distanceSquaredPointToCircle,
} from "../../lib/math/geometry";
import {
  addInPlaceVec3,
  cloneVec3,
  distanceVec3,
  scaleVec3To,
  vec3,
} from "../../lib/math/vec3";
import { perfMarkEnd, perfMarkStart } from "../../lib/perf";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TelemetryPort } from "../../runtime/simulation/ports";
import { applyDamageToObstacle } from "../../simulation/obstacles/destructibleSystem";
import {
  BattleWorld,
  ObstacleEntity,
  RobotEntity,
} from "../world";
import {
  applyDirectHit,
  applyRocketExplosion,
  findTarget,
} from "./projectile/projectileHelpers";

const activeRobotsScratch: RobotEntity[] = [];
const robotsByIdScratch = new Map<string, RobotEntity>();

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

  projectileLoop: for (let i = 0; i < projectiles.length; i += 1) {
    const projectile = projectiles[i];
    scaleVec3To(displacement, projectile.velocity, deltaSeconds);
    addInPlaceVec3(projectile.position, displacement);
    projectile.distanceTraveled += projectile.speed * deltaSeconds;

    const ageMs = world.state.elapsedMs - projectile.spawnTime;
    // Check collision with obstacles first
    for (let oi = 0; oi < world.obstacles.entities.length; oi += 1) {
      const obs = world.obstacles.entities[oi] as ObstacleEntity;
      if (!obs || obs.active === false) continue;

      let collided = false;
      const projPos = projectile.position;

      if (obs.shape && obs.shape.kind === "box") {
        const center = {
          x: obs.shape.center?.x ?? obs.position?.x ?? 0,
          y: projPos.y,
          z: obs.shape.center?.z ?? obs.position?.z ?? 0,
        };
        const gapSq = distanceSquaredPointToAABB(
          projPos,
          center,
          obs.shape.halfWidth,
          obs.shape.halfDepth,
        );
        collided = gapSq <= 0.000001;
      } else if (obs.shape && obs.shape.kind === "circle") {
        const center = {
          x: obs.shape.center?.x ?? obs.position?.x ?? 0,
          y: projPos.y,
          z: obs.shape.center?.z ?? obs.position?.z ?? 0,
        };
        const gapSq = distanceSquaredPointToCircle(
          projPos,
          center,
          obs.shape.radius,
        );
        collided = gapSq <= 0.000001;
      }

      if (collided) {
        // Apply damage to destructible cover on hit
        if (obs.obstacleType === "destructible") {
          applyDamageToObstacle(world, obs.id, projectile.damage, telemetry);
        }

        world.removeProjectile(projectile);
        continue projectileLoop;
      }
    }

    if (
      projectile.distanceTraveled >= projectile.maxDistance ||
      ageMs >= projectile.maxLifetime
    ) {
      world.removeProjectile(projectile);
      continue;
    }

    const target = findTarget(
      projectile,
      activeRobotsScratch,
      robotsByIdScratch,
    );
    if (!target) {
      continue;
    }

    const hitRadius = 1.2;
    const distance = distanceVec3(projectile.position, target.position);

    if (distance <= hitRadius) {
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
  }

  perfMarkEnd("updateProjectileSystem");
}
