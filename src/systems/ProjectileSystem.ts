import type { World } from "miniplex";

import { resolveEntity, resolveOwner } from "../ecs/ecsResolve";
import { type Entity, notifyEntityChanged } from "../ecs/miniplexStore";
import type {
  DamageEvent,
  ProjectileComponent,
  WeaponComponent,
} from "../ecs/weapons";
import { useUI } from "../store/uiStore";
import type { Rng } from "../utils/seededRng";
import type { WeaponFiredEvent } from "./WeaponSystem";

// Module-scoped serial to ensure unique projectile ids even within the same millisecond
let projectileSerial = 0;

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
  events: { damage: DamageEvent[] },
  simNowMs?: number,
  _rapierWorld?: unknown,
) {
  // Friendly-fire toggle (default false when store not initialized)
  let friendlyFire = false;
  // mark optional rapier arg as intentionally unused for now
  void _rapierWorld;
  try {
    // In React runtime, useUI is callable; in tests, this may throw if Zustand isn't set up, so fall back.
    friendlyFire = useUI.getState
      ? Boolean(useUI.getState().friendlyFire)
      : false;
  } catch {
    friendlyFire = false;
  }
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== "rocket") continue;

    const owner = resolveOwner(world, {
      ownerId: fireEvent.ownerId,
      weaponId: fireEvent.weaponId,
    }) as
      | (Entity & {
          weapon?: WeaponComponent;
          team?: string;
          position?: [number, number, number];
        })
      | undefined;

    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const ownerEntityId =
      typeof owner.id === "number" ? owner.id : fireEvent.ownerId;

    const now = typeof simNowMs === "number" ? simNowMs : Date.now();
    const projectileEntity: Entity & {
      projectile: ProjectileComponent;
      velocity: [number, number, number];
    } = {
      id: `projectile_${fireEvent.weaponId}_${now}_${++projectileSerial}`,
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: ownerEntityId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: now,
        speed: 20,
        homing: weapon.flags?.homing
          ? { turnSpeed: 2, targetId: fireEvent.targetId }
          : undefined,
      },
      velocity: [0, 0, 0],
    };

    const [dx, dy, dz] = fireEvent.direction;
    const speed = projectileEntity.projectile.speed || 20;
    projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

    world.add(projectileEntity);
  }

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
    let mutated = false;

  const currentMs = typeof simNowMs === "number" ? simNowMs : Date.now();
  const age = (currentMs - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      notifyEntityChanged(e as Entity);
      world.remove(entity);
      continue;
    }

    if (rigid) {
      const translation = rigid.translation();
      position[0] = translation.x;
      position[1] = translation.y;
      position[2] = translation.z;
      mutated = true;
    } else {
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
      mutated = true;
    }

    const hit = checkProjectileCollision(
      position,
      world,
      projectile.team,
      projectile.ownerId,
      friendlyFire,
    );
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        applyAoEDamage(
          position,
          projectile.aoeRadius,
          projectile.damage,
          projectile.team,
          projectile.ownerId,
          world,
          events,
          friendlyFire,
        );
      } else {
        events.damage.push({
          sourceId: projectile.ownerId,
          weaponId: projectile.sourceWeaponId,
          targetId: hit.targetId,
          position: [position[0], position[1], position[2]],
          damage: projectile.damage,
        });
      }

      notifyEntityChanged(e as Entity);
      world.remove(entity);
      continue;
    }

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
        rigid || undefined,
      );
      mutated = true;
    } else if (rigid) {
      const current = rigid.linvel();
      if (
        Math.abs(current.x - velocity[0]) > 0.0001 ||
        Math.abs(current.y - velocity[1]) > 0.0001 ||
        Math.abs(current.z - velocity[2]) > 0.0001
      ) {
        rigid.setLinvel(
          { x: velocity[0], y: velocity[1], z: velocity[2] },
          true,
        );
        mutated = true;
      }
    }

    if (
      Math.abs(position[0]) > 50 ||
      Math.abs(position[2]) > 50 ||
      position[1] < -10
    ) {
      notifyEntityChanged(e as Entity);
      world.remove(entity);
      continue;
    }

    if (mutated) {
      notifyEntityChanged(e as Entity);
    }
  }
}

function checkProjectileCollision(
  position: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  ownerId: number,
  friendlyFire: boolean,
): { targetId?: number } | null {
  let impactedAny = false;
  for (const entity of world.entities) {
    const candidate = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
    };

    if (!candidate.position || !candidate.team || candidate.projectile) {
      continue;
    }
    // Ignore the owner itself (match by numeric id or weapon ownerId)
    const isOwnerById =
      typeof candidate.id === "number" && candidate.id === ownerId;
    const isOwnerByWeapon = !!(
      candidate.weapon &&
      typeof candidate.weapon.ownerId === "number" &&
      candidate.weapon.ownerId === ownerId
    );
    if (isOwnerById || isOwnerByWeapon) continue;

    const [ex, ey, ez] = candidate.position;
    const [px, py, pz] = position;
    const distance = Math.sqrt(
      (ex - px) ** 2 + (ey - py) ** 2 + (ez - pz) ** 2,
    );

    // Handle friendlies when friendly fire is disabled: register an impact (for AoE) but don't return a target
    if (!friendlyFire && candidate.team === projectileTeam) {
      if (distance < 1) impactedAny = true;
      continue;
    }

    if (distance < 1) {
      return { targetId: candidate.id as unknown as number };
    }
  }

  return impactedAny ? {} : null;
}

function applyAoEDamage(
  center: [number, number, number],
  radius: number,
  damage: number,
  sourceTeam: string,
  sourceId: number,
  world: World<Entity>,
  events: { damage: DamageEvent[] },
  friendlyFire: boolean,
) {
  for (const entity of world.entities) {
    const candidate = entity as Entity & {
      position?: [number, number, number];
      team?: string;
      projectile?: ProjectileComponent;
      weapon?: WeaponComponent;
    };

    if (!candidate.position || !candidate.team || candidate.projectile) {
      continue;
    }
    if (candidate.weapon) continue;
    if (!friendlyFire && candidate.team === sourceTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt(
      (ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2,
    );

    if (distance <= radius) {
      const falloffFactor = 1 - distance / radius;
      const finalDamage = damage * falloffFactor;

      events.damage.push({
        sourceId,
        targetId: candidate.id as unknown as number,
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
  rigid?: RigidBodyLike,
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const entity = candidate as Entity & {
        team?: string;
        position?: [number, number, number];
      };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);

    if (
      target &&
      (target as { position?: [number, number, number] }).position
    ) {
      const [tx, ty, tz] = (target as { position?: [number, number, number] })
        .position!;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(
        toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2,
      );

      if (distance > 0) {
        const normalized = [
          toTarget[0] / distance,
          toTarget[1] / distance,
          toTarget[2] / distance,
        ];
        const turnSpeed = homing.turnSpeed;

        velocity[0] =
          velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] =
          velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] =
          velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

        const speed = projectile.speed || 20;
        const currentSpeed = Math.sqrt(
          velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2,
        );
        if (currentSpeed > 0) {
          velocity[0] = (velocity[0] / currentSpeed) * speed;
          velocity[1] = (velocity[1] / currentSpeed) * speed;
          velocity[2] = (velocity[2] / currentSpeed) * speed;
        }

        if (rigid) {
          rigid.setLinvel(
            { x: velocity[0], y: velocity[1], z: velocity[2] },
            true,
          );
        }
      }
    }
  }
}
