import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody, useRapier } from '@react-three/rapier';
import type { Query } from 'miniplex';
import React, { useEffect, useMemo, useRef } from 'react';

import { useEcsQuery } from '../ecs/hooks';
import { type Entity, resetWorld, world } from '../ecs/miniplexStore';
import type { BeamComponent, DamageEvent, ProjectileComponent } from '../ecs/weapons';
import { Robot } from '../robots/robotPrefab';
import { resetAndSpawnDefaultTeams } from '../robots/spawnControls';
import { useUI } from '../store/uiStore';
import { aiSystem } from '../systems/AISystem';
import { beamSystem } from '../systems/BeamSystem';
import { damageSystem, type DeathEvent } from '../systems/DamageSystem';
import { fxSystem } from '../systems/FxSystem';
import { hitscanSystem, type ImpactEvent } from '../systems/HitscanSystem';
import { projectileSystem } from '../systems/ProjectileSystem';
import { clearRespawnQueue,respawnSystem } from '../systems/RespawnSystem';
import { resetScores,scoringSystem } from '../systems/ScoringSystem';
import type { WeaponFiredEvent } from '../systems/WeaponSystem';
import { weaponSystem } from '../systems/WeaponSystem';
import { createSeededRng, type Rng } from '../utils/seededRng';
import { Beam } from './Beam';
import { FXLayer } from './FXLayer';
import { Projectile } from './Projectile';

const ARENA_SIZE = 20; // half-extent

// Deterministic mode configuration
const DETERMINISTIC_SEED = 12345;
const FIXED_TIMESTEP = 1/60; // 60 FPS

// utility helpers removed — AI and movement handled in aiSystem

type ProjectileEntity = Entity & {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
};

type BeamEntity = Entity & {
  beam: BeamComponent;
};


// pickNearestEnemy removed — AI decisions are handled by the centralized aiSystem

export default function Simulation({ renderFloor = false }: { renderFloor?: boolean }) {
  const paused = useUI((s) => s.paused);
  const showFx = useUI((s) => s.showFx);
  // rapier context (optional) for physics queries like raycasts
  const rapier = useRapier();
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

  // Robots query (used for rendering Robot prefabs)
  // Important: do NOT require 'rigid' here; the Robot prefab sets entity.rigid on mount.
  // If we require 'rigid', nothing will render and robots will never mount.
  const robotQuery = useMemo(() => world.with('team', 'weapon', 'weaponState') as Query<Entity>, []);
  const projectiles = useEcsQuery(projectileQuery);
  const beams = useEcsQuery(beamQuery);
  const robots = useEcsQuery(robotQuery);


  // Initialize deterministic RNG
  useEffect(() => {
    rngRef.current = createSeededRng(DETERMINISTIC_SEED);
  }, []);

  // Spawn initial teams once
  useEffect(() => {
    if (!spawnInitializedRef.current) {
      resetScores();
      clearRespawnQueue();
      resetAndSpawnDefaultTeams();
      spawnInitializedRef.current = true;
    }

    return () => {
      spawnInitializedRef.current = false;
      clearRespawnQueue();
      resetScores();
      resetWorld();
    };
  }, []);

  // Freeze physics when paused: zero velocities and attempt to put bodies to sleep.
  // On resume, try to restore previous linear/angular velocities when available.
  useEffect(() => {
    // No-op if Rapier not available
    try {
      if (paused) {
        for (const e of world.entities) {
          const ent = e as Entity & { rigid?: unknown } & Record<string, unknown>;
          type RigidLike = Partial<{
            linvel: () => { x: number; y: number; z: number };
            angvel: () => { x: number; y: number; z: number };
            setLinvel: (v: { x: number; y: number; z: number }, wake: boolean) => void;
            setAngvel: (v: { x: number; y: number; z: number }, wake: boolean) => void;
            sleep: () => void;
          }>;
          const r = ent.rigid as RigidLike | undefined;
          if (!r) continue;
          try {
            // Save existing linear velocity if accessible
            if (typeof r.linvel === 'function') {
              try {
                const cur = r.linvel();
                if (cur && typeof cur.x === 'number') {
                  ent['__savedLinvel'] = { x: cur.x, y: cur.y, z: cur.z };
                }
              } catch {
                // ignore
              }
            }

            // Save existing angular velocity if accessible
            if (typeof r.angvel === 'function') {
              try {
                const curA = r.angvel();
                if (curA && typeof curA.x === 'number') {
                  ent['__savedAngvel'] = { x: curA.x, y: curA.y, z: curA.z };
                }
              } catch {
                // ignore
              }
            }

            // Zero velocities
            if (typeof r.setLinvel === 'function') {
              try { r.setLinvel?.({ x: 0, y: 0, z: 0 }, true); } catch (err) { void err; }
            }
            if (typeof r.setAngvel === 'function') {
              try { r.setAngvel({ x: 0, y: 0, z: 0 }, true); } catch (err) { void err; }
            }

            // Attempt to put body to sleep if API exposed
            if (typeof r.sleep === 'function') {
              try { r.sleep(); } catch (err) { void err; }
            }
          } catch {
            // defensive: ignore any per-body errors
          }
        }
      } else {
        // Restore saved velocities where present and attempt to wake bodies
        for (const e of world.entities) {
          const ent = e as Entity & { rigid?: unknown } & Record<string, unknown>;
          type RigidLike = Partial<{
            setLinvel: (v: { x: number; y: number; z: number }, wake: boolean) => void;
            setAngvel: (v: { x: number; y: number; z: number }, wake: boolean) => void;
            wakeUp: () => void;
            wake: () => void;
          }>;
          const r = ent.rigid as RigidLike | undefined;
          if (!r) continue;
          try {
            const saved = ent['__savedLinvel'] as { x: number; y: number; z: number } | undefined;
            if (saved && typeof r.setLinvel === 'function') {
              try { r.setLinvel({ x: saved.x, y: saved.y, z: saved.z }, true); } catch (err) { void err; }
            }
            const savedA = ent['__savedAngvel'] as { x: number; y: number; z: number } | undefined;
            if (savedA && typeof r.setAngvel === 'function') {
              try { r.setAngvel({ x: savedA.x, y: savedA.y, z: savedA.z }, true); } catch (err) { void err; }
            }

            // Attempt to wake the body if API exposed
            if (typeof r.wakeUp === 'function') {
              try { r.wakeUp(); } catch (err) { void err; }
            }
            if (typeof r.wake === 'function') {
              try { r.wake(); } catch (err) { void err; }
            }

            // Clean up saved entries
            delete ent['__savedLinvel'];
            delete ent['__savedAngvel'];
          } catch (err) {
            void err;
          }
        }
      }
    } catch {
      // if any global rapier access throws, silently ignore — this is a best-effort feature
    }
  }, [paused]);


  // Deterministic per-frame systems
  useFrame(() => {
    if (paused || !rngRef.current) return;
    
    // Use fixed timestep for determinism
    const step = FIXED_TIMESTEP;
    frameCountRef.current++;
    
    // Create fresh RNG for this frame (deterministic)
    const frameRng = createSeededRng(DETERMINISTIC_SEED + frameCountRef.current);

  // (entities array not needed here)

    // Event containers for weapon systems
    const events = {
      weaponFired: [] as WeaponFiredEvent[],
      damage: [] as DamageEvent[],
      death: [] as DeathEvent[],
      impact: [] as ImpactEvent[],
    };

  // 1. AI decisions and movement (centralized AI system)
  // If Rapier provides a world handle via useRapier, pass it through for physics-based LOS.
  aiSystem(world, frameRng, rapier);

    // 2. Weapon systems (deterministic pipeline)
    weaponSystem(world, step, frameRng, events);
  hitscanSystem(world, frameRng, events.weaponFired, events, rapier);
  beamSystem(world, step, frameRng, events.weaponFired, events);
  projectileSystem(world, step, frameRng, events.weaponFired, events, rapier);
    
    // 3. Damage application
    damageSystem(world, events.damage, events);

    scoringSystem(events.death);
    respawnSystem(world, events.death);

    // 4. FX system (render-only, non-authoritative)
    fxSystem(world, step, events);
  });

  

  return (
    <group>
      {/* Arena floor: visual plane optional; collider always present. */}
      <RigidBody type="fixed" colliders={false}>
        {renderFloor ? (
          <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
            <planeGeometry args={[ARENA_SIZE * 2, ARENA_SIZE * 2, 1, 1]} />
            <meshStandardMaterial color="#202531" />
          </mesh>
        ) : null}
        <CuboidCollider args={[ARENA_SIZE, 0.1, ARENA_SIZE]} position={[0, -0.05, 0]} />
      </RigidBody>

      {/* Robots */}
      {robots.map((e, i) => (
        <Robot key={String(e.id ?? i)} entity={e} />
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

      {/* FX Layer */}
      {showFx ? <FXLayer /> : null}
    </group>
  );
}

// Movement and firing helpers removed — AI responsibilities moved to aiSystem



