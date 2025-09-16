import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { Query } from 'miniplex';
import React, { useEffect, useMemo, useRef } from 'react';

import { useEcsQuery } from '../ecs/hooks';
import { type Entity, resetWorld, world } from '../ecs/miniplexStore';
import type {
  BeamComponent,
  DamageEvent,
  ProjectileComponent,
  WeaponComponent,
  WeaponStateComponent,
} from '../ecs/weapons';
import { Robot } from '../robots/robotPrefab';
import { resetAndSpawnDefaultTeams } from '../robots/spawnControls';
import { useUI } from '../store/uiStore';
import { beamSystem } from '../systems/BeamSystem';
import { damageSystem, type DeathEvent } from '../systems/DamageSystem';
import { hitscanSystem, type ImpactEvent } from '../systems/HitscanSystem';
import { projectileSystem } from '../systems/ProjectileSystem';
import type { WeaponFiredEvent } from '../systems/WeaponSystem';
import { weaponSystem } from '../systems/WeaponSystem';
import { createSeededRng, type Rng } from '../utils/seededRng';
import { Beam } from './Beam';
import { Projectile } from './Projectile';

const ARENA_SIZE = 20; // half-extent

// Deterministic mode configuration
const DETERMINISTIC_SEED = 12345;
const FIXED_TIMESTEP = 1/60; // 60 FPS

function distanceSquared(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

type RigidLike = {
  translation: () => { x: number; y: number; z: number };
  linvel: () => { x: number; y: number; z: number };
  setLinvel: (v: { x: number; y: number; z: number }, wake: boolean) => void;
};

type ProjectileEntity = Entity & {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
};

type BeamEntity = Entity & {
  beam: BeamComponent;
};


function pickNearestEnemy(self: Entity, enemies: Entity[]) {
  const rigid = self.rigid as unknown as RigidLike | null;
  if (!rigid) return undefined;
  const p = rigid.translation();
  let best: { e: Entity; d2: number } | undefined;
  for (const e of enemies) {
    const r = e.rigid as unknown as RigidLike | null;
    if (!r) continue;
    const d2 = distanceSquared(p, r.translation());
    if (!best || d2 < best.d2) best = { e, d2 };
  }
  return best?.e;
}

export default function Simulation() {
  const paused = useUI((s) => s.paused);
  const frameCountRef = useRef(0);
  const rngRef = useRef<Rng | null>(null);
  const spawnInitializedRef = useRef(false);
  const projectileQuery = useMemo(
    () => world.with('projectile', 'position') as unknown as Query<ProjectileEntity>,
    []
  );
  const beamQuery = useMemo(
    () => world.with('beam') as unknown as Query<BeamEntity>,
    []
  );
  const projectiles = useEcsQuery(projectileQuery);
  const beams = useEcsQuery(beamQuery);


  // Initialize deterministic RNG
  useEffect(() => {
    rngRef.current = createSeededRng(DETERMINISTIC_SEED);
  }, []);

  // Track active robots via ECS
  const robotQuery = useMemo(
    () => world.with('weaponState', 'position') as unknown as Query<Entity>,
    []
  );
  const robots = useEcsQuery(robotQuery);
  useEffect(() => {
    if (!spawnInitializedRef.current) {
      resetAndSpawnDefaultTeams();
      spawnInitializedRef.current = true;
    }

    return () => {
      spawnInitializedRef.current = false;
      resetWorld();
    };
  }, []);


  // Deterministic per-frame systems
  useFrame(() => {
    if (paused || !rngRef.current) return;
    
    // Use fixed timestep for determinism
    const step = FIXED_TIMESTEP;
    frameCountRef.current++;
    
    // Create fresh RNG for this frame (deterministic)
    const frameRng = createSeededRng(DETERMINISTIC_SEED + frameCountRef.current);

    const entities = Array.from(world.entities);
    const red = entities.filter((e) => e.team === 'red' && e.alive !== false && e.rigid);
    const blue = entities.filter((e) => e.team === 'blue' && e.alive !== false && e.rigid);

    // Event containers for weapon systems
    const events = {
      weaponFired: [] as WeaponFiredEvent[],
      damage: [] as DamageEvent[],
      death: [] as DeathEvent[],
      impact: [] as ImpactEvent[],
    };

    // 1. AI decisions and movement
    for (const e of red) {
      const target = pickNearestEnemy(e, blue);
      steerTowards(e, target);
      setWeaponFiring(e, target);
    }
    for (const e of blue) {
      const target = pickNearestEnemy(e, red);
      steerTowards(e, target);
      setWeaponFiring(e, target);
    }

    // 2. Weapon systems (deterministic pipeline)
    weaponSystem(world, step, frameRng, events);
    hitscanSystem(world, frameRng, events.weaponFired, events);
    beamSystem(world, step, frameRng, events.weaponFired, events);
    projectileSystem(world, step, frameRng, events.weaponFired, events);
    
    // 3. Damage application
    damageSystem(world, events.damage, events);

    // 4. TODO: FX system would go here
  });

  useEffect(() => {
    return () => {
      resetWorld();
    };
  }, []);

  return (
    <group>
      {/* Arena floor */}
      <RigidBody type="fixed" colliders={false}>
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[ARENA_SIZE * 2, ARENA_SIZE * 2, 1, 1]} />
          <meshStandardMaterial color="#202531" />
        </mesh>
        <CuboidCollider args={[ARENA_SIZE, 0.1, ARENA_SIZE]} position={[0, -0.05, 0]} />
      </RigidBody>

      {/* Robots */}
      {robots.map((e, i) => (
        <Robot key={i} entity={e} />
      ))}
      {projectiles.map((entity) => (
        <Projectile
          key={String(entity.id ?? `${entity.projectile.sourceWeaponId}_${entity.projectile.spawnTime}`)}
          entity={entity}
        />
      ))}
      {beams.map((entity) => (
        <Beam key={String(entity.id ?? entity.beam.sourceWeaponId)} entity={entity} />
      ))}
    </group>
  );
}

function steerTowards(self: Entity, target: Entity | undefined) {
  const rb = self.rigid as unknown as RigidLike | null;
  if (!rb || !self.speed) return;
  if (!target) {
    // slow down
    const lv = rb.linvel();
    rb.setLinvel({ x: lv.x * 0.95, y: lv.y, z: lv.z * 0.95 }, true);
    return;
  }
  const p = rb.translation();
  const tp = (target.rigid as unknown as RigidLike).translation();
  const dx = tp.x - p.x;
  const dz = tp.z - p.z;
  const len = Math.hypot(dx, dz) || 1;
  const vx = (dx / len) * self.speed;
  const vz = (dz / len) * self.speed;
  rb.setLinvel({ x: vx, y: 0, z: vz }, true);
}

function setWeaponFiring(self: Entity, target: Entity | undefined) {
  const weaponEntity = self as Entity & { 
    weapon?: WeaponComponent; 
    weaponState?: WeaponStateComponent 
  };
  
  if (!weaponEntity.weapon || !weaponEntity.weaponState) return;

  const rb = self.rigid as unknown as RigidLike | null;
  const targetId = target && typeof target.id === 'number' ? target.id : undefined;

  if (!rb || !targetId) {
    weaponEntity.weaponState.firing = false;
    weaponEntity.targetId = undefined;
    return;
  }

  const currentTarget = target;
  const trb = currentTarget?.rigid as unknown as RigidLike | null;
  if (!trb) {
    weaponEntity.weaponState.firing = false;
    weaponEntity.targetId = undefined;
    return;
  }

  weaponEntity.targetId = targetId;

  // Check if target is in range
  const d2 = distanceSquared(rb.translation(), trb.translation());
  const range = weaponEntity.weapon.range || 10;

  if (d2 <= range * range) {
    weaponEntity.weaponState.firing = true;
  } else {
    weaponEntity.weaponState.firing = false;
    weaponEntity.targetId = undefined;
  }
}

