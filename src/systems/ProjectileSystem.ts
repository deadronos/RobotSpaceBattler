import type { World } from 'miniplex';
import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

// Compact, single coherent implementation. Keep helpers local and non-duplicated.

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(v: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const byIndex = getEntityById(id) as Entity | undefined;
  if (byIndex) return byIndex;
  return Array.from(world.entities).find((c) => (c.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, ev: WeaponFiredEvent) {
  const direct = resolveEntity(world, ev.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const e = candidate as Entity & { weapon?: WeaponComponent };
    return e.weapon?.id === ev.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  for (const ev of weaponFiredEvents) {
    if (ev.type !== 'rocket') continue;
    const owner = resolveOwner(world, ev) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;
    const speed = (weapon as any).speed ?? 20;
    const ent: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + ev.weaponId + '_' + Date.now(),
      position: [ev.origin[0], ev.origin[1], ev.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: ev.weaponId,
        ownerId: ev.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: (weapon as any).lifespan ?? 5,
        spawnTime: Date.now(),
        speed,
        homing: (weapon.flags && (weapon.flags as any).homing) ? { turnSpeed: ((weapon.flags as any).homing?.turnSpeed ?? 1), targetId: ev.targetId } : undefined,
      },
      velocity: [ev.direction[0] * speed, ev.direction[1] * speed, ev.direction[2] * speed],
    };
    world.add(ent);
  }

  for (const ent of Array.from(world.entities)) {
    const e = ent as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;
    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) { world.remove(ent); continue; }

    const rigid = e.rigid as unknown as RigidBodyLike | null;
    if (rigid) {
      try { const p = (rigid as any).translation(); if (p) { position[0] = p.x; position[1] = p.y; position[2] = p.z; } }
      catch { position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt; }
    } else { position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt; }

    const prev: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];
    const curr: [number, number, number] = [position[0], position[1], position[2]];

    const hit = checkProjectileCollision(prev, curr, world, projectile.team, _rapierWorld);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) applyAoEDamage(curr, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      else events.damage.push({ sourceId: projectile.ownerId, weaponId: projectile.sourceWeaponId, targetId: hit.targetId, position: curr.slice() as [number, number, number], damage: projectile.damage });
      world.remove(ent);
      continue;
    }

    if (projectile.homing) updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
    else if (rigid) {
      try { const lv = (rigid as any).linvel(); if (Math.abs(lv.x - velocity[0]) > 1e-4 || Math.abs(lv.y - velocity[1]) > 1e-4 || Math.abs(lv.z - velocity[2]) > 1e-4) (rigid as any).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true); } catch { }
    }

    if (Math.abs(position[0]) > 100 || Math.abs(position[2]) > 100 || position[1] < -50) world.remove(ent);
  }
}

function checkProjectileCollision(prevPos: [number, number, number], currPos: [number, number, number], world: World<Entity>, projectileTeam: string, _rapierWorld?: unknown): { targetId: number } | null {
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as any;
      const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
      const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
      if (len > 1e-6) {
        const norm = { x: dir[0] / len, y: dir[1] / len, z: dir[2] / len };
        const origin = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };
        let hit: unknown = undefined;
        if (typeof rw.castRay === 'function') { try { hit = rw.castRay(origin, norm, len); } catch { } }
        if (!hit && rw.queryPipeline && typeof rw.queryPipeline.castRay === 'function') { try { hit = rw.queryPipeline.castRay(rw.bodies, rw.colliders, origin, norm, len); } catch { } }
        if (!hit && rw.raw && typeof rw.raw.castRay === 'function') { try { hit = rw.raw.castRay(origin, norm, len); } catch { } }
        if (hit) { const id = extractEntityIdFromRapierHit(hit); if (typeof id === 'number') return { targetId: id }; }
      }
    }
  } catch { }

  const [cx, cy, cz] = currPos;
  for (const candidate of world.entities) {
    const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!c.position || !c.team || c.projectile) continue;
    if (c.team === projectileTeam) continue;
    let ex = c.position[0], ey = c.position[1], ez = c.position[2];
    if (c.rigid && typeof (c.rigid as any).translation === 'function') { try { const p = (c.rigid as any).translation(); ex = p.x; ey = p.y; ez = p.z; } catch { } }
    const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (d < 1) return { targetId: candidate.id as unknown as number };
  }

  return null;
}

function applyAoEDamage(center: [number, number, number], radius: number, damage: number, sourceTeam: string, sourceId: number, world: World<Entity>, events: { damage: DamageEvent[] }) {
  const [cx, cy, cz] = center;
  for (const candidate of world.entities) {
    const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!c.position || !c.team || c.projectile) continue;
    if (c.team === sourceTeam) continue;
    const [ex, ey, ez] = c.position;
    const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (dist <= radius) events.damage.push({ sourceId, targetId: candidate.id as unknown as number, position: [cx, cy, cz], damage: damage * (1 - dist / radius) });
  }
}

function updateHomingBehavior(projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] }, world: World<Entity>, dt: number, rng: Rng, rigid?: RigidBodyLike) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;
  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => { const c = candidate as Entity & { team?: string; position?: [number, number, number] }; return c.team && c.team !== projectile.team && c.position; });
    if (targets.length > 0) homing.targetId = targets[Math.floor(rng() * targets.length)].id as unknown as number;
  }
  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);
    if (!target || !(target as any).position) return;
    const [tx, ty, tz] = (target as any).position as [number, number, number];
    const [px, py, pz] = position;
    const toT = [tx - px, ty - py, tz - pz];
    const dist = Math.sqrt(toT[0] ** 2 + toT[1] ** 2 + toT[2] ** 2);
    if (dist <= 1e-6) return;
    const norm = [toT[0] / dist, toT[1] / dist, toT[2] / dist];
    const turn = homing.turnSpeed * dt;
    velocity[0] = velocity[0] * (1 - turn) + norm[0] * turn;
    velocity[1] = velocity[1] * (1 - turn) + norm[1] * turn;
    velocity[2] = velocity[2] * (1 - turn) + norm[2] * turn;
    const speed = projectile.speed || 20;
    const cur = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
    if (cur > 1e-6) { velocity[0] = (velocity[0] / cur) * speed; velocity[1] = (velocity[1] / cur) * speed; velocity[2] = (velocity[2] / cur) * speed; }
    if (rigid) { try { (rigid as any).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true); } catch { } }
  }
}
import type { World } from 'miniplex';
import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

/**
 * Lightweight, single-file ProjectileSystem.
 * - Spawns simple rocket projectiles on weapon events
 * - Updates position / integrates with Rapier rigid if present
 * - Performs guarded Rapier segment casts (tries several wrapper shapes)
 * - Fallbacks to proximity checks when Rapier isn't available
 * - Supports AoE damage and simple homing
 */

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(v: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const fromIndex = getEntityById(id) as Entity | undefined;
  if (fromIndex) return fromIndex;
  return Array.from(world.entities).find((c) => (c.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const ent = candidate as Entity & { weapon?: WeaponComponent };
    return ent.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // Spawn rockets on incoming fire events
  for (const ev of weaponFiredEvents) {
    if (ev.type !== 'rocket') continue;
    const owner = resolveOwner(world, ev) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const speed = weapon.speed || 20;
    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + ev.weaponId + '_' + Date.now(),
      position: [ev.origin[0], ev.origin[1], ev.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: ev.weaponId,
        ownerId: ev.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: weapon.lifespan ?? 5,
        spawnTime: Date.now(),
        speed,
        homing: weapon.flags?.homing ? { turnSpeed: weapon.flags.homing.turnSpeed ?? 1, targetId: ev.targetId } : undefined,
      },
      velocity: [ev.direction[0] * speed, ev.direction[1] * speed, ev.direction[2] * speed],
    };

    world.add(projectileEntity);
  }

  // Update loop
  for (const ent of Array.from(world.entities)) {
    const e = ent as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;

    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(ent);
      continue;
    }

    // integrate position from rigid if present
    const rigid = e.rigid as unknown as RigidBodyLike | null;
    if (rigid) {
      try {
        const t = (rigid as unknown as any).translation;
        if (typeof t === 'function') {
          const p = (rigid as unknown as any).translation();
          position[0] = p.x; position[1] = p.y; position[2] = p.z;
        }
      } catch {
        // ignore translation failures and fall back to kinematic update
        position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt;
      }
    } else {
      position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt;
    }

    const prevPos: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];
    const currPos: [number, number, number] = [position[0], position[1], position[2]];

    const hit = checkProjectileCollision(prevPos, currPos, world, projectile.team, _rapierWorld);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        applyAoEDamage(currPos, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      } else {
        events.damage.push({ sourceId: projectile.ownerId, weaponId: projectile.sourceWeaponId, targetId: hit.targetId, position: currPos.slice() as [number, number, number], damage: projectile.damage });
      }
      world.remove(ent);
      continue;
    }

    if (projectile.homing) {
      updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
    } else if (rigid) {
      try {
        const lin = (rigid as unknown as RigidBodyLike).linvel();
        if (Math.abs(lin.x - velocity[0]) > 1e-4 || Math.abs(lin.y - velocity[1]) > 1e-4 || Math.abs(lin.z - velocity[2]) > 1e-4) {
          (rigid as unknown as RigidBodyLike).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        }
      } catch {
        // ignore
      }
    }

    // Cleanup if out of reasonable bounds
    if (Math.abs(position[0]) > 100 || Math.abs(position[2]) > 100 || position[1] < -50) {
      world.remove(ent);
    }
  }
}

function checkProjectileCollision(
  prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  // Try guarded Rapier segment cast (many runtimes expose different wrappers)
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as any;
      const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
      const length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
      if (length > 1e-6) {
        const normalized = { x: dir[0] / length, y: dir[1] / length, z: dir[2] / length };
        const origin = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };

        let hit: unknown = undefined;

        // try direct castRay
        if (typeof rw.castRay === 'function') {
          try { hit = rw.castRay(origin, normalized, length); } catch { /* ignore */ }
        }

        // try queryPipeline.castRay
        if (!hit && rw.queryPipeline && typeof rw.queryPipeline.castRay === 'function') {
          try { hit = rw.queryPipeline.castRay(rw.bodies, rw.colliders, origin, normalized, length); } catch { /* ignore */ }
        }

        // try raw.castRay
        if (!hit && rw.raw && typeof rw.raw.castRay === 'function') {
          try { hit = rw.raw.castRay(origin, normalized, length); } catch { /* ignore */ }
        }

        if (hit) {
          const id = extractEntityIdFromRapierHit(hit);
          if (typeof id === 'number') return { targetId: id };
        }
      }
    }
  } catch {
    // fall through to proximity fallback
  }

  // proximity fallback at current position
  const [cx, cy, cz] = currPos;
  for (const candidate of world.entities) {
    const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!c.position || !c.team || c.projectile) continue;
    if (c.team === projectileTeam) continue;

    let ex = c.position[0], ey = c.position[1], ez = c.position[2];
    if (c.rigid && typeof (c.rigid as any).translation === 'function') {
      try {
        const p = (c.rigid as any).translation();
        ex = p.x; ey = p.y; ez = p.z;
      } catch { /* ignore */ }
    }

    const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (dist < 1) return { targetId: candidate.id as unknown as number };
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
  const [cx, cy, cz] = center;
  for (const candidate of world.entities) {
    const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!c.position || !c.team || c.projectile) continue;
    if (c.team === sourceTeam) continue;

    const [ex, ey, ez] = c.position;
    const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (dist <= radius) {
      const factor = 1 - dist / radius;
      const finalDamage = damage * factor;
      events.damage.push({ sourceId, targetId: candidate.id as unknown as number, position: [cx, cy, cz], damage: finalDamage });
    }
  }
}

function updateHomingBehavior(
  projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const c = candidate as Entity & { team?: string; position?: [number, number, number] };
      return c.team && c.team !== projectile.team && c.position;
    });
    if (targets.length > 0) homing.targetId = targets[Math.floor(rng() * targets.length)].id as unknown as number;
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);
    if (!target || !(target as any).position) return;
    const [tx, ty, tz] = (target as any).position as [number, number, number];
    const [px, py, pz] = position;
    const toT = [tx - px, ty - py, tz - pz];
    const dist = Math.sqrt(toT[0] ** 2 + toT[1] ** 2 + toT[2] ** 2);
    if (dist <= 1e-6) return;
    const norm = [toT[0] / dist, toT[1] / dist, toT[2] / dist];
    const turn = homing.turnSpeed * dt;
    velocity[0] = velocity[0] * (1 - turn) + norm[0] * turn;
    velocity[1] = velocity[1] * (1 - turn) + norm[1] * turn;
    velocity[2] = velocity[2] * (1 - turn) + norm[2] * turn;

    const speed = projectile.speed || 20;
    const curSpeed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
    if (curSpeed > 1e-6) {
      velocity[0] = (velocity[0] / curSpeed) * speed;
      velocity[1] = (velocity[1] / curSpeed) * speed;
      velocity[2] = (velocity[2] / curSpeed) * speed;
    }

    if (rigid) {
      try { rigid.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true); } catch { /* ignore */ }
    }
  }
}
import type { World } from 'miniplex';

import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) return lookup;
  return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // spawn simple projectiles for rocket-type weapons
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;
    const owner = resolveOwner(world, fireEvent) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: Date.now(),
        speed: 20,
        homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [fireEvent.direction[0] * 20, fireEvent.direction[1] * 20, fireEvent.direction[2] * 20],
    };

    world.add(projectileEntity);
  }

  // update loop (minimal, safe behavior)
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;

    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    // simple movement
    position[0] += velocity[0] * dt;
    position[1] += velocity[1] * dt;
    position[2] += velocity[2] * dt;

    // check collision (Rapier-aware fallback)
    const hit = checkProjectileCollision(position, position, world, projectile.team, _rapierWorld);
    if (hit) {
      events.damage.push({
        sourceId: projectile.ownerId,
        weaponId: projectile.sourceWeaponId,
        targetId: hit.targetId,
        position: [position[0], position[1], position[2]],
        damage: projectile.damage,
      });
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  _prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as unknown as Record<string, unknown>;
      // simplest guarded attempt: try a direct castRay-like call if present
      if (typeof (rw as any).castRay === 'function') {
        try {
          const hit = (rw as any).castRay({ x: currPos[0], y: currPos[1], z: currPos[2] }, { x: 0, y: 0, z: 0 }, 0);
          const id = extractEntityIdFromRapierHit(hit);
          if (typeof id === 'number') return { targetId: id };
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore and fall through
  }

  // fallback proximity
  for (const candidateEntity of world.entities) {
    const candidate = candidateEntity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;
    const dx = candidate.position[0] - currPos[0];
    const dy = candidate.position[1] - currPos[1];
    const dz = candidate.position[2] - currPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    import type { World } from 'miniplex';
    import { type Entity, getEntityById } from '../ecs/miniplexStore';
    import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
    import type { Rng } from '../utils/seededRng';
    import type { WeaponFiredEvent } from './WeaponSystem';
    import { extractEntityIdFromRapierHit } from './rapierHelpers';

    // Single clean implementation of the ProjectileSystem.
    // - Rapier-first guarded segment casts
    // - AoE and direct damage
    // - Homing support
    // - Robust fallbacks for headless/tests

    interface RigidBodyLike {
      translation(): { x: number; y: number; z: number };
      linvel(): { x: number; y: number; z: number };
      setLinvel(v: { x: number; y: number; z: number }, wake: boolean): void;
    }

    function resolveEntity(world: World<Entity>, id?: number) {
      if (typeof id !== 'number') return undefined;
      const byIndex = getEntityById(id) as Entity | undefined;
      if (byIndex) return byIndex;
      return Array.from(world.entities).find((c) => (c.id as unknown as number) === id) as Entity | undefined;
    }

    function resolveOwner(world: World<Entity>, ev: WeaponFiredEvent) {
      const direct = resolveEntity(world, ev.ownerId);
      if (direct) return direct;
      return Array.from(world.entities).find((candidate) => {
        const e = candidate as Entity & { weapon?: WeaponComponent };
        return e.weapon?.id === ev.weaponId;
      });
    }

    export function projectileSystem(
      world: World<Entity>,
      dt: number,
      rng: Rng,
      weaponFiredEvents: WeaponFiredEvent[],
      events: { damage: DamageEvent[] },
      _rapierWorld?: unknown
    ) {
      // Spawn rockets
      for (const ev of weaponFiredEvents) {
        if (ev.type !== 'rocket') continue;
        const owner = resolveOwner(world, ev) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
        const weapon = owner?.weapon;
        if (!owner || !weapon) continue;

        const speed = (weapon as any).speed ?? 20;
        const proj: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
          id: 'projectile_' + ev.weaponId + '_' + Date.now(),
          position: [ev.origin[0], ev.origin[1], ev.origin[2]],
          team: weapon.team,
          projectile: {
            sourceWeaponId: ev.weaponId,
            ownerId: ev.ownerId,
            damage: weapon.power,
            team: weapon.team,
            aoeRadius: weapon.aoeRadius,
            lifespan: (weapon as any).lifespan ?? 5,
            spawnTime: Date.now(),
            speed,
            homing: (weapon.flags && (weapon.flags as any).homing) ? { turnSpeed: ((weapon.flags as any).homing?.turnSpeed ?? 1), targetId: ev.targetId } : undefined,
          },
          velocity: [ev.direction[0] * speed, ev.direction[1] * speed, ev.direction[2] * speed],
        };

        world.add(proj);
      }

      // Update loop
      for (const ent of Array.from(world.entities)) {
        const e = ent as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
        const { projectile, position, velocity } = e;
        if (!projectile || !position || !velocity) continue;

        const age = (Date.now() - projectile.spawnTime) / 1000;
        if (age >= projectile.lifespan) { world.remove(ent); continue; }

        const rigid = e.rigid as unknown as RigidBodyLike | null;
        if (rigid) {
          try { const p = (rigid as any).translation(); if (p) { position[0] = p.x; position[1] = p.y; position[2] = p.z; } }
          catch { position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt; }
        } else { position[0] += velocity[0] * dt; position[1] += velocity[1] * dt; position[2] += velocity[2] * dt; }

        const prev: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];
        const curr: [number, number, number] = [position[0], position[1], position[2]];

        const hit = checkProjectileCollision(prev, curr, world, projectile.team, _rapierWorld);
        if (hit) {
          if (projectile.aoeRadius && projectile.aoeRadius > 0) applyAoEDamage(curr, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
          else events.damage.push({ sourceId: projectile.ownerId, weaponId: projectile.sourceWeaponId, targetId: hit.targetId, position: curr.slice() as [number, number, number], damage: projectile.damage });
          world.remove(ent);
          continue;
        }

        if (projectile.homing) updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
        else if (rigid) {
          try { const lv = (rigid as any).linvel(); if (Math.abs(lv.x - velocity[0]) > 1e-4 || Math.abs(lv.y - velocity[1]) > 1e-4 || Math.abs(lv.z - velocity[2]) > 1e-4) (rigid as any).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true); } catch { }
        }

        if (Math.abs(position[0]) > 100 || Math.abs(position[2]) > 100 || position[1] < -50) world.remove(ent);
      }
    }

    function checkProjectileCollision(prevPos: [number, number, number], currPos: [number, number, number], world: World<Entity>, projectileTeam: string, _rapierWorld?: unknown): { targetId: number } | null {
      try {
        if (_rapierWorld) {
          const rw = _rapierWorld as any;
          const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
          const len = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
          if (len > 1e-6) {
            const norm = { x: dir[0] / len, y: dir[1] / len, z: dir[2] / len };
            const origin = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };
            let hit: unknown = undefined;
            if (typeof rw.castRay === 'function') { try { hit = rw.castRay(origin, norm, len); } catch { } }
            if (!hit && rw.queryPipeline && typeof rw.queryPipeline.castRay === 'function') { try { hit = rw.queryPipeline.castRay(rw.bodies, rw.colliders, origin, norm, len); } catch { } }
            if (!hit && rw.raw && typeof rw.raw.castRay === 'function') { try { hit = rw.raw.castRay(origin, norm, len); } catch { } }
            if (hit) { const id = extractEntityIdFromRapierHit(hit); if (typeof id === 'number') return { targetId: id }; }
          }
        }
      } catch { }

      const [cx, cy, cz] = currPos;
      for (const candidate of world.entities) {
        const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
        if (!c.position || !c.team || c.projectile) continue;
        if (c.team === projectileTeam) continue;
        let ex = c.position[0], ey = c.position[1], ez = c.position[2];
        if (c.rigid && typeof (c.rigid as any).translation === 'function') { try { const p = (c.rigid as any).translation(); ex = p.x; ey = p.y; ez = p.z; } catch { } }
        const d = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
        if (d < 1) return { targetId: candidate.id as unknown as number };
      }
      return null;
    }

    function applyAoEDamage(center: [number, number, number], radius: number, damage: number, sourceTeam: string, sourceId: number, world: World<Entity>, events: { damage: DamageEvent[] }) {
      const [cx, cy, cz] = center;
      for (const candidate of world.entities) {
        const c = candidate as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
        if (!c.position || !c.team || c.projectile) continue;
        if (c.team === sourceTeam) continue;
        const [ex, ey, ez] = c.position;
        const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
        if (dist <= radius) events.damage.push({ sourceId, targetId: candidate.id as unknown as number, position: [cx, cy, cz], damage: damage * (1 - dist / radius) });
      }
    }

    function updateHomingBehavior(projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] }, world: World<Entity>, dt: number, rng: Rng, rigid?: RigidBodyLike) {
      const { projectile, position, velocity } = projectileEntity;
      const homing = projectile.homing;
      if (!homing) return;
      if (!homing.targetId) {
        const targets = Array.from(world.entities).filter((candidate) => {
          const c = candidate as Entity & { team?: string; position?: [number, number, number] };
          return c.team && c.team !== projectile.team && c.position;
        });
        if (targets.length > 0) homing.targetId = targets[Math.floor(rng() * targets.length)].id as unknown as number;
      }
      if (homing.targetId) {
        const target = resolveEntity(world, homing.targetId);
        if (!target || !(target as any).position) return;
        const [tx, ty, tz] = (target as any).position as [number, number, number];
        const [px, py, pz] = position;
        const toT = [tx - px, ty - py, tz - pz];
        const dist = Math.sqrt(toT[0] ** 2 + toT[1] ** 2 + toT[2] ** 2);
        if (dist <= 1e-6) return;
        const norm = [toT[0] / dist, toT[1] / dist, toT[2] / dist];
        const turn = homing.turnSpeed * dt;
        velocity[0] = velocity[0] * (1 - turn) + norm[0] * turn;
        velocity[1] = velocity[1] * (1 - turn) + norm[1] * turn;
        velocity[2] = velocity[2] * (1 - turn) + norm[2] * turn;
        const speed = projectile.speed || 20;
        const cur = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
        if (cur > 1e-6) { velocity[0] = (velocity[0] / cur) * speed; velocity[1] = (velocity[1] / cur) * speed; velocity[2] = (velocity[2] / cur) * speed; }
        if (rigid) { try { (rigid as any).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true); } catch { } }
      }
    }
        // try multiple Rapier shapes safely
        if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
          try {
            const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
            hit = fn(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && (rw as any).queryPipeline && typeof ((rw as any).queryPipeline.castRay) === 'function') {
          try {
            const qp = (rw as any).queryPipeline;
            const bodies = (rw as Record<string, unknown>)['bodies'];
            const colliders = (rw as Record<string, unknown>)['colliders'];
            if (qp.castRay) hit = qp.castRay(bodies, colliders, originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && (rw as any).raw && typeof ((rw as any).raw.castRay) === 'function') {
          try {
            const raw = (rw as any).raw;
            if (raw.castRay) hit = raw.castRay(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (hit) {
          const hitEntityId = extractEntityIdFromRapierHit(hit);
          if (typeof hitEntityId === 'number') return { targetId: hitEntityId };
        }
      }
    }
  } catch {
    // fall back to proximity
  }

  // fallback: proximity at currPos
  const [cx, cy, cz] = currPos;
  for (const entity of world.entities) {
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;

    let ex = candidate.position[0];
    let ey = candidate.position[1];
    let ez = candidate.position[2];
    if (candidate.rigid && typeof (candidate.rigid as Record<string, unknown>)['translation'] === 'function') {
      try {
        const tfn = (candidate.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (tfn) {
          const tv = tfn();
          ex = tv.x; ey = tv.y; ez = tv.z;
        }
      } catch {
        // ignore
      }
    }

    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (distance < 1) return { targetId: candidate.id as unknown as number };
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
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === sourceTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

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
  projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const entity = candidate as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);

    if (target && (target as { position?: [number, number, number] }).position) {
      const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = homing.turnSpeed;

        velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

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
import type { World } from 'miniplex';

import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) return lookup;
  return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // Spawn projectiles for rocket weapons (minimal implementation)
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;
    const owner = resolveOwner(world, fireEvent) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: Date.now(),
        speed: 20,
        homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [fireEvent.direction[0] * 20, fireEvent.direction[1] * 20, fireEvent.direction[2] * 20],
    };

    world.add(projectileEntity);
  }

  // Update projectiles (very small, safe loop)
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;

    // simple lifetime removal
    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    // advance
    position[0] += velocity[0] * dt;
    position[1] += velocity[1] * dt;
    position[2] += velocity[2] * dt;

    // simple proximity collision fallback
    const hit = checkProjectileCollision(position, position, world, projectile.team, _rapierWorld);
    if (hit) {
      events.damage.push({
        sourceId: projectile.ownerId,
        weaponId: projectile.sourceWeaponId,
        targetId: hit.targetId,
        position: [position[0], position[1], position[2]],
        damage: projectile.damage,
      });
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  _prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  // Try Rapier if available (guarded) — rely on helper to map hits to entity ids
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as unknown as Record<string, unknown>;
      if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
        try {
          const hit = (rw as any).castRay(currPos, { x: 0, y: 0, z: 0 }, 0);
          const id = extractEntityIdFromRapierHit(hit);
          if (typeof id === 'number') return { targetId: id };
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  // Fallback: proximity check at position
  const [cx] = currPos;
  for (const candidateEntity of world.entities) {
    const candidate = candidateEntity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;
    const distance = Math.sqrt((candidate.position[0] - currPos[0]) ** 2 + (candidate.position[1] - currPos[1]) ** 2 + (candidate.position[2] - currPos[2]) ** 2);
    if (distance < 1) return { targetId: candidate.id as unknown as number };
  }

  return null;
}
import type { World } from 'miniplex';

import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) return lookup;
  return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // spawn projectiles for rocket shots
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;

    const owner = resolveOwner(world, fireEvent) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: Date.now(),
        speed: 20,
        homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [0, 0, 0],
    };

    const [dx, dy, dz] = fireEvent.direction;
    const speed = projectileEntity.projectile.speed || 20;
    projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

    world.add(projectileEntity);
  }

  // update projectiles
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;
    const rigid = e.rigid as unknown as RigidBodyLike | null;

    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    const prevPos: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];

    if (rigid) {
      try {
        const t = (rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (t) {
          const tv = t();
          position[0] = tv.x; position[1] = tv.y; position[2] = tv.z;
        }
      } catch {
        // ignore
      }
    } else {
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
    }

    const currPos: [number, number, number] = [position[0], position[1], position[2]];

    const hit = checkProjectileCollision(prevPos, currPos, world, projectile.team, _rapierWorld);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      } else {
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

    if (projectile.homing) {
      updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
    } else if (rigid) {
      try {
        const cv = (rigid as unknown as RigidBodyLike).linvel();
        if (
          Math.abs(cv.x - velocity[0]) > 0.0001 ||
          Math.abs(cv.y - velocity[1]) > 0.0001 ||
          Math.abs(cv.z - velocity[2]) > 0.0001
        ) {
          (rigid as unknown as RigidBodyLike).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        }
      } catch {
        // ignore
      }
    }

    if (Math.abs(position[0]) > 50 || Math.abs(position[2]) > 50 || position[1] < -10) {
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as unknown as Record<string, unknown>;
      const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
      const length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
      if (length > 1e-6) {
        const normalized = { x: dir[0] / length, y: dir[1] / length, z: dir[2] / length };
        const originVec = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };

        let hit: unknown = undefined;

        if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
          try {
            const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
            hit = fn(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
          try {
            const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
            const bodies = (rw as Record<string, unknown>)['bodies'];
            const colliders = (rw as Record<string, unknown>)['colliders'];
            if (qp.castRay) hit = qp.castRay(bodies, colliders, originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
          try {
            const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
            if (raw.castRay) hit = raw.castRay(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (hit) {
          const hitEntityId = extractEntityIdFromRapierHit(hit);
          if (typeof hitEntityId === 'number') return { targetId: hitEntityId };
        }
      }
    }
  } catch {
    // fall back to proximity
  }

  // fallback: proximity at currPos
  const [cx, cy, cz] = currPos;
  for (const entity of world.entities) {
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;

    let ex = candidate.position[0];
    let ey = candidate.position[1];
    let ez = candidate.position[2];
    if (candidate.rigid && typeof (candidate.rigid as Record<string, unknown>)['translation'] === 'function') {
      try {
        const tfn = (candidate.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (tfn) {
          const tv = tfn();
          ex = tv.x; ey = tv.y; ez = tv.z;
        }
      } catch {
        // ignore
      }
    }

    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (distance < 1) return { targetId: candidate.id as unknown as number };
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
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === sourceTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

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
  projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const entity = candidate as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);

    if (target && (target as { position?: [number, number, number] }).position) {
      const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = homing.turnSpeed;

        velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

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

import type { World } from 'miniplex';

import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) return lookup;
  return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // spawn projectiles for rocket shots
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;

    const owner = resolveOwner(world, fireEvent) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: Date.now(),
        speed: 20,
        homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [0, 0, 0],
    };

    const [dx, dy, dz] = fireEvent.direction;
    const speed = projectileEntity.projectile.speed || 20;
    projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

    world.add(projectileEntity);
  }

  // update projectiles
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;
    const rigid = e.rigid as unknown as RigidBodyLike | null;

    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    const prevPos: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];

    if (rigid) {
      try {
        const t = (rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (t) {
          const tv = t();
          position[0] = tv.x; position[1] = tv.y; position[2] = tv.z;
        }
      } catch {
        // ignore
      }
    } else {
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
    }

    const currPos: [number, number, number] = [position[0], position[1], position[2]];

    const hit = checkProjectileCollision(prevPos, currPos, world, projectile.team, _rapierWorld);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      } else {
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

    if (projectile.homing) {
      updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
    } else if (rigid) {
      try {
        const cv = (rigid as unknown as RigidBodyLike).linvel();
        if (
          Math.abs(cv.x - velocity[0]) > 0.0001 ||
          Math.abs(cv.y - velocity[1]) > 0.0001 ||
          Math.abs(cv.z - velocity[2]) > 0.0001
        ) {
          (rigid as unknown as RigidBodyLike).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        }
      } catch {
        // ignore
      }
    }

    if (Math.abs(position[0]) > 50 || Math.abs(position[2]) > 50 || position[1] < -10) {
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as unknown as Record<string, unknown>;
      const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
      const length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
      if (length > 1e-6) {
        const normalized = { x: dir[0] / length, y: dir[1] / length, z: dir[2] / length };
        const originVec = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };

        let hit: unknown = undefined;

        if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
          try {
            const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
            hit = fn(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
          try {
            const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
            const bodies = (rw as Record<string, unknown>)['bodies'];
            const colliders = (rw as Record<string, unknown>)['colliders'];
            if (qp.castRay) hit = qp.castRay(bodies, colliders, originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
          try {
            const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
            if (raw.castRay) hit = raw.castRay(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (hit) {
          const hitEntityId = extractEntityIdFromRapierHit(hit);
          if (typeof hitEntityId === 'number') return { targetId: hitEntityId };
        }
      }
    }
  } catch {
    // fall back to proximity
  }

  // fallback: proximity at currPos
  const [cx, cy, cz] = currPos;
  for (const entity of world.entities) {
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;

    let ex = candidate.position[0];
    let ey = candidate.position[1];
    let ez = candidate.position[2];
    if (candidate.rigid && typeof (candidate.rigid as Record<string, unknown>)['translation'] === 'function') {
      try {
        const tfn = (candidate.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (tfn) {
          const tv = tfn();
          ex = tv.x; ey = tv.y; ez = tv.z;
        }
      } catch {
        // ignore
      }
    }

    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (distance < 1) return { targetId: candidate.id as unknown as number };
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
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === sourceTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

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
  projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const entity = candidate as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);

    if (target && (target as { position?: [number, number, number] }).position) {
      const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = homing.turnSpeed;

        velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

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
import type { World } from 'miniplex';

import { type Entity, getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';
import { extractEntityIdFromRapierHit } from './rapierHelpers';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') return undefined;
  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) return lookup;
  return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
}

function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
  const direct = resolveEntity(world, fireEvent.ownerId);
  if (direct) return direct;
  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === fireEvent.weaponId;
  });
}

export function projectileSystem(
  world: World<Entity>,
  dt: number,
  rng: Rng,
  weaponFiredEvents: WeaponFiredEvent[],
  events: { damage: DamageEvent[] },
  _rapierWorld?: unknown
) {
  // Spawn projectiles for rocket-type weapon events
  for (const fireEvent of weaponFiredEvents) {
    if (fireEvent.type !== 'rocket') continue;

    const owner = resolveOwner(world, fireEvent) as (Entity & { weapon?: WeaponComponent; team?: string; position?: [number, number, number] }) | undefined;
    const weapon = owner?.weapon;
    if (!owner || !weapon) continue;

    const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
      id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
      position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
      team: weapon.team,
      projectile: {
        sourceWeaponId: fireEvent.weaponId,
        ownerId: fireEvent.ownerId,
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5,
        spawnTime: Date.now(),
        speed: 20,
        homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
      },
      velocity: [0, 0, 0],
    };

    const [dx, dy, dz] = fireEvent.direction;
    const speed = projectileEntity.projectile.speed || 20;
    projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

    world.add(projectileEntity);
  }

  // Update active projectiles
  for (const entity of world.entities) {
    const e = entity as Entity & { projectile?: ProjectileComponent; position?: [number, number, number]; velocity?: [number, number, number]; rigid?: unknown };
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;
    const rigid = e.rigid as unknown as RigidBodyLike | null;

    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    const prevPos: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];

    if (rigid) {
      try {
        const t = (rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (t) {
          const tv = t();
          position[0] = tv.x; position[1] = tv.y; position[2] = tv.z;
        }
      } catch {
        // ignore
      }
    } else {
      position[0] += velocity[0] * dt;
      position[1] += velocity[1] * dt;
      position[2] += velocity[2] * dt;
    }

    const currPos: [number, number, number] = [position[0], position[1], position[2]];

    const hit = checkProjectileCollision(prevPos, currPos, world, projectile.team, _rapierWorld);
    if (hit) {
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
      } else {
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

    if (projectile.homing) {
      updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
    } else if (rigid) {
      try {
        const cv = (rigid as unknown as RigidBodyLike).linvel();
        if (
          Math.abs(cv.x - velocity[0]) > 0.0001 ||
          Math.abs(cv.y - velocity[1]) > 0.0001 ||
          Math.abs(cv.z - velocity[2]) > 0.0001
        ) {
          (rigid as unknown as RigidBodyLike).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
        }
      } catch {
        // ignore
      }
    }

    if (Math.abs(position[0]) > 50 || Math.abs(position[2]) > 50 || position[1] < -10) {
      world.remove(entity);
    }
  }
}

function checkProjectileCollision(
  prevPos: [number, number, number],
  currPos: [number, number, number],
  world: World<Entity>,
  projectileTeam: string,
  _rapierWorld?: unknown
): { targetId: number } | null {
  try {
    if (_rapierWorld) {
      const rw = _rapierWorld as unknown as Record<string, unknown>;
      const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
      const length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
      if (length > 1e-6) {
        const normalized = { x: dir[0] / length, y: dir[1] / length, z: dir[2] / length };
        const originVec = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };

        let hit: unknown = undefined;

        if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
          try {
            const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
            hit = fn(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
          try {
            const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
            const bodies = (rw as Record<string, unknown>)['bodies'];
            const colliders = (rw as Record<string, unknown>)['colliders'];
            if (qp.castRay) hit = qp.castRay(bodies, colliders, originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
          try {
            const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
            if (raw.castRay) hit = raw.castRay(originVec, normalized, length);
          } catch {
            // ignore
          }
        }

        if (hit) {
          const hitEntityId = extractEntityIdFromRapierHit(hit);
          if (typeof hitEntityId === 'number') return { targetId: hitEntityId };
        }
      }
    }
  } catch {
    // fall back to proximity
  }

  const [cx, cy, cz] = currPos;
  for (const entity of world.entities) {
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === projectileTeam) continue;

    let ex = candidate.position[0];
    let ey = candidate.position[1];
    let ez = candidate.position[2];
    if (candidate.rigid && typeof (candidate.rigid as Record<string, unknown>)['translation'] === 'function') {
      try {
        const tfn = (candidate.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
        if (tfn) {
          const tv = tfn();
          ex = tv.x; ey = tv.y; ez = tv.z;
        }
      } catch {
        // ignore
      }
    }

    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
    if (distance < 1) return { targetId: candidate.id as unknown as number };
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
    const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
    if (!candidate.position || !candidate.team || candidate.projectile) continue;
    if (candidate.team === sourceTeam) continue;

    const [ex, ey, ez] = candidate.position;
    const [cx, cy, cz] = center;
    const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

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
  projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
  world: World<Entity>,
  dt: number,
  rng: Rng,
  rigid?: RigidBodyLike
) {
  const { projectile, position, velocity } = projectileEntity;
  const homing = projectile.homing;
  if (!homing) return;

  if (!homing.targetId) {
    const targets = Array.from(world.entities).filter((candidate) => {
      const entity = candidate as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });

    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      homing.targetId = target.id as unknown as number;
    }
  }

  if (homing.targetId) {
    const target = resolveEntity(world, homing.targetId);

    if (target && (target as { position?: [number, number, number] }).position) {
      const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;
      const [px, py, pz] = position;

      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = homing.turnSpeed;

        velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
        velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
        velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

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
import type { World } from 'miniplex';

import { type Entity,getEntityById } from '../ecs/miniplexStore';
import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
import type { Rng } from '../utils/seededRng';
import type { WeaponFiredEvent } from './WeaponSystem';

interface RigidBodyLike {
  translation(): { x: number; y: number; z: number };
  linvel(): { x: number; y: number; z: number };
  setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
}

function resolveEntity(world: World<Entity>, id?: number) {
  if (typeof id !== 'number') {
    return undefined;
  }

  const lookup = getEntityById(id) as Entity | undefined;
  if (lookup) {
    return lookup;
  }

  return Array.from(world.entities).find(
    import type { World } from 'miniplex';

    import { type Entity, getEntityById } from '../ecs/miniplexStore';
    import type { DamageEvent, ProjectileComponent, WeaponComponent } from '../ecs/weapons';
    import type { Rng } from '../utils/seededRng';
    import type { WeaponFiredEvent } from './WeaponSystem';
    import { extractEntityIdFromRapierHit } from './rapierHelpers';

    interface RigidBodyLike {
      translation(): { x: number; y: number; z: number };
      linvel(): { x: number; y: number; z: number };
      setLinvel(velocity: { x: number; y: number; z: number }, wake: boolean): void;
    }

    function resolveEntity(world: World<Entity>, id?: number) {
      if (typeof id !== 'number') return undefined;
      const lookup = getEntityById(id) as Entity | undefined;
      if (lookup) return lookup;
      return Array.from(world.entities).find((candidate) => (candidate.id as unknown as number) === id) as Entity | undefined;
    }

    function resolveOwner(world: World<Entity>, fireEvent: WeaponFiredEvent) {
      const direct = resolveEntity(world, fireEvent.ownerId);
      if (direct) return direct;
      return Array.from(world.entities).find((candidate) => {
        const entity = candidate as Entity & { weapon?: WeaponComponent };
        return entity.weapon?.id === fireEvent.weaponId;
      });
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
      _rapierWorld?: unknown
    ) {
      // spawn projectiles
      for (const fireEvent of weaponFiredEvents) {
        if (fireEvent.type !== 'rocket') continue;

        const owner = resolveOwner(world, fireEvent) as (Entity & {
          weapon?: WeaponComponent;
          team?: string;
          position?: [number, number, number];
        }) | undefined;

        const weapon = owner?.weapon;
        if (!owner || !weapon) continue;

        const projectileEntity: Entity & { projectile: ProjectileComponent; velocity: [number, number, number] } = {
          id: 'projectile_' + fireEvent.weaponId + '_' + Date.now(),
          position: [fireEvent.origin[0], fireEvent.origin[1], fireEvent.origin[2]],
          team: weapon.team,
          projectile: {
            sourceWeaponId: fireEvent.weaponId,
            ownerId: fireEvent.ownerId,
            damage: weapon.power,
            team: weapon.team,
            aoeRadius: weapon.aoeRadius,
            lifespan: 5,
            spawnTime: Date.now(),
            speed: 20,
            homing: weapon.flags?.homing ? { turnSpeed: 2, targetId: fireEvent.targetId } : undefined,
          },
          velocity: [0, 0, 0],
        };

        const [dx, dy, dz] = fireEvent.direction;
        const speed = projectileEntity.projectile.speed || 20;
        projectileEntity.velocity = [dx * speed, dy * speed, dz * speed];

        world.add(projectileEntity);
      }

      // update projectiles
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

        const age = (Date.now() - projectile.spawnTime) / 1000;
        if (age >= projectile.lifespan) {
          world.remove(entity);
          continue;
        }

        // approximate previous position
        const prevPos: [number, number, number] = [position[0] - velocity[0] * dt, position[1] - velocity[1] * dt, position[2] - velocity[2] * dt];

        if (rigid) {
          try {
            const t = (rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
            if (t) {
              const tv = t();
              position[0] = tv.x; position[1] = tv.y; position[2] = tv.z;
            }
          } catch {
            // ignore
          }
        } else {
          position[0] += velocity[0] * dt;
          position[1] += velocity[1] * dt;
          position[2] += velocity[2] * dt;
        }

        const currPos: [number, number, number] = [position[0], position[1], position[2]];

        const hit = checkProjectileCollision(prevPos, currPos, world, projectile.team, _rapierWorld);
        if (hit) {
          if (projectile.aoeRadius && projectile.aoeRadius > 0) {
            applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, projectile.ownerId, world, events);
          } else {
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

        if (projectile.homing) {
          updateHomingBehavior(e as any, world, dt, rng, rigid || undefined);
        } else if (rigid) {
          try {
            const current = (rigid as unknown as Record<string, unknown>)['linvel'] as (() => { x: number; y: number; z: number }) | undefined;
            if (current) {
              const cv = (rigid as unknown as RigidBodyLike).linvel();
              if (
                Math.abs(cv.x - velocity[0]) > 0.0001 ||
                Math.abs(cv.y - velocity[1]) > 0.0001 ||
                Math.abs(cv.z - velocity[2]) > 0.0001
              ) {
                (rigid as unknown as RigidBodyLike).setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
              }
            }
          } catch {
            // ignore
          }
        }

        if (Math.abs(position[0]) > 50 || Math.abs(position[2]) > 50 || position[1] < -10) {
          world.remove(entity);
        }
      }
    }

    function checkProjectileCollision(
      prevPos: [number, number, number],
      currPos: [number, number, number],
      world: World<Entity>,
      projectileTeam: string,
      _rapierWorld?: unknown
    ): { targetId: number } | null {
      try {
        if (_rapierWorld) {
          const rw = _rapierWorld as unknown as Record<string, unknown>;
          const dir = [currPos[0] - prevPos[0], currPos[1] - prevPos[1], currPos[2] - prevPos[2]];
          const length = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2);
          if (length > 1e-6) {
            const normalized = { x: dir[0] / length, y: dir[1] / length, z: dir[2] / length };
            const originVec = { x: prevPos[0], y: prevPos[1], z: prevPos[2] };

            let hit: unknown = undefined;

            if (typeof (rw as { castRay?: unknown }).castRay === 'function') {
              try {
                const fn = (rw as { castRay?: (...args: unknown[]) => unknown }).castRay!;
                hit = fn(originVec, normalized, length);
              } catch {
                // ignore
              }
            }

            if (!hit && rw.queryPipeline && typeof (rw.queryPipeline as { castRay?: unknown }).castRay === 'function') {
              try {
                const qp = rw.queryPipeline as { castRay?: (...args: unknown[]) => unknown };
                const bodies = (rw as Record<string, unknown>)['bodies'];
                const colliders = (rw as Record<string, unknown>)['colliders'];
                if (qp.castRay) hit = qp.castRay(bodies, colliders, originVec, normalized, length);
              } catch {
                // ignore
              }
            }

            if (!hit && rw.raw && typeof (rw.raw as { castRay?: unknown }).castRay === 'function') {
              try {
                const raw = rw.raw as { castRay?: (...args: unknown[]) => unknown };
                if (raw.castRay) hit = raw.castRay(originVec, normalized, length);
              } catch {
                // ignore
              }
            }

            if (hit) {
              const hitEntityId = extractEntityIdFromRapierHit(hit);
              if (typeof hitEntityId === 'number') return { targetId: hitEntityId };
            }
          }
        }
      } catch {
        // fall back to proximity
      }

      // fallback: proximity at currPos
      const [cx, cy, cz] = currPos;
      for (const entity of world.entities) {
        const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
        if (!candidate.position || !candidate.team || candidate.projectile) continue;
        if (candidate.team === projectileTeam) continue;

        let ex = candidate.position[0];
        let ey = candidate.position[1];
        let ez = candidate.position[2];
        if (candidate.rigid && typeof (candidate.rigid as Record<string, unknown>)['translation'] === 'function') {
          try {
            const tfn = (candidate.rigid as unknown as Record<string, unknown>)['translation'] as (() => { x: number; y: number; z: number }) | undefined;
            if (tfn) {
              const tv = tfn();
              ex = tv.x; ey = tv.y; ez = tv.z;
            }
          } catch {
            // ignore
          }
        }

        const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);
        if (distance < 1) return { targetId: candidate.id as unknown as number };
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
        const candidate = entity as Entity & { position?: [number, number, number]; team?: string; projectile?: ProjectileComponent; weapon?: WeaponComponent };
        if (!candidate.position || !candidate.team || candidate.projectile) continue;
        if (candidate.team === sourceTeam) continue;

        const [ex, ey, ez] = candidate.position;
        const [cx, cy, cz] = center;
        const distance = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2 + (ez - cz) ** 2);

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
      projectileEntity: Entity & { projectile: ProjectileComponent; position: [number, number, number]; velocity: [number, number, number] },
      world: World<Entity>,
      dt: number,
      rng: Rng,
      rigid?: RigidBodyLike
    ) {
      const { projectile, position, velocity } = projectileEntity;
      const homing = projectile.homing;
      if (!homing) return;

      if (!homing.targetId) {
        const targets = Array.from(world.entities).filter((candidate) => {
          const entity = candidate as Entity & { team?: string; position?: [number, number, number] };
          return entity.team && entity.team !== projectile.team && entity.position;
        });

        if (targets.length > 0) {
          const target = targets[Math.floor(rng() * targets.length)];
          homing.targetId = target.id as unknown as number;
        }
      }

      if (homing.targetId) {
        const target = resolveEntity(world, homing.targetId);

        if (target && (target as { position?: [number, number, number] }).position) {
          const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;
          const [px, py, pz] = position;

          const toTarget = [tx - px, ty - py, tz - pz];
          const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);

          if (distance > 0) {
            const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
            const turnSpeed = homing.turnSpeed;

            velocity[0] = velocity[0] * (1 - turnSpeed * dt) + normalized[0] * turnSpeed * dt;
            velocity[1] = velocity[1] * (1 - turnSpeed * dt) + normalized[1] * turnSpeed * dt;
            velocity[2] = velocity[2] * (1 - turnSpeed * dt) + normalized[2] * turnSpeed * dt;

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
      const [tx, ty, tz] = (target as { position?: [number, number, number] }).position!;

      const [px, py, pz] = position;

