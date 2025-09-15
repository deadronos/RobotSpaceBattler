import type { World } from 'miniplex';
import type { Rng } from '../utils/seededRng';

import type { Entity } from '../ecs/miniplexStore';
import type { ProjectileComponent, WeaponComponent, DamageEvent } from '../ecs/weapons';
import type { WeaponFiredEvent } from './WeaponSystem';

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

    // Find the weapon that fired to get projectile parameters
    const weaponEntity = Array.from(world.entities).find(e => {
      const entity = e as Entity & { weapon?: WeaponComponent };
      return entity.weapon?.id === fireEvent.weaponId;
    });

    if (!weaponEntity) continue;
    const weapon = (weaponEntity as Entity & { weapon: WeaponComponent }).weapon;

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
        damage: weapon.power,
        team: weapon.team,
        aoeRadius: weapon.aoeRadius,
        lifespan: 5.0, // 5 seconds default
        spawnTime: Date.now(),
        speed: 20, // m/s default
        homing: weapon.flags?.homing ? { turnSpeed: 2.0 } : undefined,
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
    };
    
    const { projectile, position, velocity } = e;
    if (!projectile || !position || !velocity) continue;

    // Update lifetime
    const age = (Date.now() - projectile.spawnTime) / 1000;
    if (age >= projectile.lifespan) {
      world.remove(entity);
      continue;
    }

    // Update position
    position[0] += velocity[0] * dt;
    position[1] += velocity[1] * dt;
    position[2] += velocity[2] * dt;

    // Check for collisions (simplified)
    const hit = checkProjectileCollision(position, world, projectile.team);
    if (hit) {
      // Apply damage
      if (projectile.aoeRadius && projectile.aoeRadius > 0) {
        // AoE damage
        applyAoEDamage(position, projectile.aoeRadius, projectile.damage, projectile.team, world, events);
      } else {
        // Direct hit damage
        events.damage.push({
          sourceId: parseInt(projectile.sourceWeaponId),
          weaponId: projectile.sourceWeaponId,
          targetId: hit.targetId,
          position: [position[0], position[1], position[2]],
          damage: projectile.damage,
        });
      }

      // Remove projectile
      world.remove(entity);
    }

    // Handle homing behavior
    if (projectile.homing && velocity) {
      updateHomingBehavior(e as Entity & { 
        projectile: ProjectileComponent;
        position: [number, number, number];
        velocity: [number, number, number];
      }, world, dt, rng);
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
    
    if (distance < 1.0) { // Hit radius
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
      const falloffFactor = 1 - (distance / radius);
      const finalDamage = damage * falloffFactor;
      
      events.damage.push({
        sourceId: 0, // TODO: Get from weapon source
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
  rng: Rng
) {
  const { projectile, position, velocity } = projectileEntity;
  if (!projectile.homing) return;

  // Find target if not set
  if (!projectile.homing.targetId) {
    const targets = Array.from(world.entities).filter(e => {
      const entity = e as Entity & { team?: string; position?: [number, number, number] };
      return entity.team && entity.team !== projectile.team && entity.position;
    });
    
    if (targets.length > 0) {
      const target = targets[Math.floor(rng() * targets.length)];
      projectile.homing.targetId = target.id as unknown as number;
    }
  }

  // Steer towards target
  if (projectile.homing.targetId) {
    const target = Array.from(world.entities).find(e => 
      (e.id as unknown as number) === projectile.homing!.targetId
    ) as Entity & { position?: [number, number, number] };
    
    if (target?.position) {
      const [tx, ty, tz] = target.position;
      const [px, py, pz] = position;
      
      const toTarget = [tx - px, ty - py, tz - pz];
      const distance = Math.sqrt(toTarget[0] ** 2 + toTarget[1] ** 2 + toTarget[2] ** 2);
      
      if (distance > 0) {
        const normalized = [toTarget[0] / distance, toTarget[1] / distance, toTarget[2] / distance];
        const turnSpeed = projectile.homing.turnSpeed;
        
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
      }
    }
  }
}
