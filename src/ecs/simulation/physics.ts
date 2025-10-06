import type { ArenaEntity } from '../entities/Arena';
import type { Projectile } from '../entities/Projectile';
import type { Robot } from '../entities/Robot';
import { addVectors, clampToArena, cloneVector, distance, scaleVector } from '../utils/vector';
import type { Vector3, WeaponType } from '../../types';

interface PhysicsBody {
  id: string;
  position: Vector3;
  velocity: Vector3;
}

interface PhysicsProjectileBody extends PhysicsBody {
  ownerId: string;
  weaponType: WeaponType;
  damage: number;
  distanceTraveled: number;
  maxDistance: number;
  lifetime: number;
  maxLifetime: number;
}

export interface PhysicsState {
  robots: Map<string, PhysicsBody>;
  projectiles: Map<string, PhysicsProjectileBody>;
}

export function createPhysicsState(): PhysicsState {
  return {
    robots: new Map(),
    projectiles: new Map(),
  };
}

function ensureRobotBody(state: PhysicsState, robot: Robot): PhysicsBody {
  const existing = state.robots.get(robot.id);
  if (existing) {
    existing.position = cloneVector(robot.position);
    return existing;
  }

  const body: PhysicsBody = {
    id: robot.id,
    position: cloneVector(robot.position),
    velocity: { x: 0, y: 0, z: 0 },
  };

  state.robots.set(robot.id, body);
  return body;
}

export function removeRobotBody(state: PhysicsState, robotId: string): void {
  state.robots.delete(robotId);
}

export function setRobotBodyPosition(state: PhysicsState, robot: Robot, position: Vector3): void {
  const body = ensureRobotBody(state, robot);
  body.position = cloneVector(position);
  body.velocity = { x: 0, y: 0, z: 0 };
  robot.position = cloneVector(position);
}

export function applyRobotImpulse(state: PhysicsState, robot: Robot, impulse: Vector3): void {
  const body = ensureRobotBody(state, robot);
  body.velocity = addVectors(body.velocity, impulse);
  robot.velocity = addVectors(robot.velocity, impulse);
}

export function spawnProjectileBody(state: PhysicsState, projectile: Projectile): void {
  const body: PhysicsProjectileBody = {
    id: projectile.id,
    ownerId: projectile.ownerId,
    weaponType: projectile.weaponType,
    position: cloneVector(projectile.position),
    velocity: cloneVector(projectile.velocity),
    damage: projectile.damage,
    distanceTraveled: projectile.distanceTraveled,
    maxDistance: projectile.maxDistance,
    lifetime: 0,
    maxLifetime: projectile.maxLifetime,
  };

  state.projectiles.set(projectile.id, body);
}

export function removeProjectileBody(state: PhysicsState, projectileId: string): void {
  state.projectiles.delete(projectileId);
}

export interface PhysicsStepResult {
  hits: Array<{
    projectileId: string;
    targetId: string;
    ownerId: string;
    damage: number;
    weaponType: WeaponType;
  }>;
  despawnedProjectiles: string[];
}

export interface PhysicsStepContext {
  state: PhysicsState;
  robots: Robot[];
  projectiles: Projectile[];
  arena: ArenaEntity;
  deltaTime: number;
}

const COLLISION_RADIUS = 1.5;
const LINEAR_DAMPING = 0.9;

export function stepPhysics(context: PhysicsStepContext): PhysicsStepResult {
  const { state, robots, projectiles, arena, deltaTime } = context;
  const hits: PhysicsStepResult['hits'] = [];
  const despawned: string[] = [];

  robots.forEach((robot) => {
    const body = ensureRobotBody(state, robot);
    if (body.velocity.x !== 0 || body.velocity.y !== 0 || body.velocity.z !== 0) {
      const delta = scaleVector(body.velocity, deltaTime);
      const nextPosition = clampToArena(arena, addVectors(body.position, delta));
      body.position = nextPosition;
      robot.position = cloneVector(nextPosition);
      robot.velocity = cloneVector(body.velocity);
      body.velocity = scaleVector(body.velocity, LINEAR_DAMPING);
    } else {
      body.position = cloneVector(robot.position);
    }
  });

  const ownerTeamCache = new Map<string, string>();

  projectiles.forEach((projectile) => {
    const body = state.projectiles.get(projectile.id);
    if (!body) {
      spawnProjectileBody(state, projectile);
      return;
    }

    const delta = scaleVector(body.velocity, deltaTime);
    const nextPosition = addVectors(body.position, delta);
    body.position = nextPosition;
    body.distanceTraveled += distance(projectile.position, nextPosition);
    body.lifetime += deltaTime;

    projectile.position = cloneVector(nextPosition);
    projectile.distanceTraveled = body.distanceTraveled;

    if (body.distanceTraveled >= body.maxDistance || body.lifetime >= body.maxLifetime) {
      state.projectiles.delete(projectile.id);
      despawned.push(projectile.id);
      return;
    }

    if (!ownerTeamCache.has(body.ownerId)) {
      const owner = robots.find((robot) => robot.id === body.ownerId);
      ownerTeamCache.set(body.ownerId, owner?.team ?? '');
    }
    const ownerTeam = ownerTeamCache.get(body.ownerId);

    for (const robot of robots) {
      if (!ownerTeam || robot.team === ownerTeam) {
        continue;
      }
      if (distance(robot.position, body.position) <= COLLISION_RADIUS) {
        hits.push({
          projectileId: projectile.id,
          targetId: robot.id,
          ownerId: body.ownerId,
          damage: body.damage,
          weaponType: body.weaponType,
        });
        state.projectiles.delete(projectile.id);
        despawned.push(projectile.id);
        break;
      }
    }
  });

  return {
    hits,
    despawnedProjectiles: despawned,
  };
}

export function getPhysicsSnapshot(state: PhysicsState): {
  robots: Record<string, PhysicsBody>;
  projectiles: Record<string, PhysicsProjectileBody>;
} {
  const robots: Record<string, PhysicsBody> = {};
  const projectiles: Record<string, PhysicsProjectileBody> = {};

  state.robots.forEach((body, id) => {
    robots[id] = { id, position: cloneVector(body.position), velocity: cloneVector(body.velocity) };
  });

  state.projectiles.forEach((body, id) => {
    projectiles[id] = {
      ...body,
      position: cloneVector(body.position),
      velocity: cloneVector(body.velocity),
    };
  });

  return { robots, projectiles };
}
