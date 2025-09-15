import type { World } from 'miniplex';

import { getEntityById, type Entity } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

/**
 * Projectile system for rocket weapons.
 * Spawns projectiles with physics and handles collision/AoE damage.
 */
export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] }
) {
  // Spawn new projectiles from weapon fired events
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;

    const owner = getEntityById(fireEvent.ownerId) as Entity & {
      weapon?: WeaponComponent;
      team?: string;
      position?: [number, number, number];
    } | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    // Create projectile entity
    const projectileEntity: Entity & {
      projectile: ProjectileComponent;
      velocity: [number, number, number];
    } = {
      id: `projectile_${fireEvent.weaponId}_${Date.now()}`,
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5.0, // 5 seconds default
        spawnTime: Date.now(),
        speed: 20, // m/s default
        homing: weapon.flags?.homing ? { turnSpeed: 2.0, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [0, 0, 0], // Will be set below
    };

    // Add velocity based on direction
    const [dx, dy, dz] = fireEvent.direction;
    const speed = projectileEntity.projectile.speed || 20;
    projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

    world.add(projectileEntity);
  }

  // Update existing projectiles
  for (const entity of world.entities) {
    const e = entity as Entity & {
      projectile?: ProjectileComponent;
      position?: [number, number, number];
      velocity?: [number, number, number];
      rigid?: unknown;
    };

    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;
    const rigid = e.rigid as unknown as RigidBodyLike | null;

    // Update lifetime
    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    // Sync position with physics body when available
    if (rigid) {
      const translation = rigid.translation();
      position[0] = translation.x;
      position[1] = translation.y;
      position[2] = translation.z;
    } else {
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
    }

    // Check for collisions (simplified)
    const hit = checkProjectileCollision(position, world, projectile.team);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        // AoE damage
        applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      } else {
        // Direct hit damage
        events.damage.push({
          sourceId: projectile.ownerId,
          weaponId: projectile.sourceWeaponId,
          targetId: hit.targetId,
          position: [position[0], position[1], position[2]],
          damage: projectile.damage,
        });
      }

      world.remove(entity);
      continue;
    }

    // Handle homing behavior
    if (projectile.homing) {
      updateHomingBehavior(
        e as Entity & {
          projectile: ProjectileComponent;
          position: [number, number, number];
          velocity: [number, number, number];
        },
        world,
        dt,
        rng,
        rigid || undefined
      );
    } else if (rigid) {
      const current = rigid.linvel();
      if (
        Math.abs(current.x - velocity[0]) > 0.0001 ||
        Math.abs(current.y - velocity[1]) > 0.0001 ||
        Math.abs(current.z - velocity[2]) > 0.0001
      ) {
        rigid.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
      }
    }

    // Check bounds (remove if out of arena)
    if (Math.abs(position[0]) > 50 || Math.abs(position[2]) > 50 || position[1] < -10) {
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  position: [number, number, number],
  world: World<Entity>,
  projectileTeam: string
): { targetId: number } | null {
  // Simplified collision check - in real implementation would use Rapier ray sweep
  for (const entity of world.entities) {
    const e = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
    };

    // Skip other projectiles and weapon owners
    if (!e.position || !e.team || e.projectile || e.weapon) continue;
    if (e.team === projectileTeam) continue; // Skip friendly targets

    const [ex, ey, ez] = e.position;
    const [px, py, pz] = position;
    const distance = Math.sqrt((ex - px) ** 2 + (ey - py) ** 2 + (ez - pz) ** 2);

    if (distance < 1.0) {
      return { targetId: e.id as unknown as number };
    }
  }

  return null;
}

function applyAoEDamage(
  center: [number, number, number],
  radius: number,
  damage: number,
  sourceTeam: string,
  sourceId: number,
  world: World<Entity>,
  events: { damage: DamageEvent[] }
) {
  for (const entity of world.entities) {
    const e = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
    };

    // Skip projectiles and weapon owners
    if (!e.position || !e.team || e.projectile || e.weapon) continue;
    // TODO: Add friendly fire check based on game mode

    const [ex, ey, ez] = e.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

    if (distance <= radius) {
      // Distance-based damage falloff
      const falloffFactor = 1 - distance / radius;
      const finalDamage = damage * falloffFactor;

      events.damage.push({
        sourceId,
        targetId: e.id as unknown as number,
        position: [center[0], center[1], center[2]],
        damage: finalDamage,
      });
    }
  }
}

function updateHomingBehavior(
  projectileEntity: Entity & {
    projectile: ProjectileComponent;
    position: [number, number, number];
    velocity: [number, number, number];
  },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  // Find target if not set
  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((e) => {
      const entity = e as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  // Steer towards target
  if (homing.targetId) {
    const target = getEntityById(homing.targetId) as Entity & {
      position?: [number, number, number];
    } | undefined;

    if (target?.position) {
      const [tx, ty, tz] = target.position;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = homing.turnSpeed;

        // Lerp velocity towards target direction
        velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

        // Maintain speed
        const speed = projectile.speed || 20;
        const currentSpeed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
        if (currentSpeed > 0) {
          velocity[0] = (velocity[0] / currentSpeed) * speed;
          velocity[1] = (velocity[1] / currentSpeed) * speed;
          velocity[2] = (velocity[2] / currentSpeed) * speed;
        }

        if (rigid) {
          rigid.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        }
      }
    }
  }
}

