import { useFrame, useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody, useRapier } from '@react-three/rapier';
import type { Query } from 'miniplex';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import { useEcsQuery } from '../ecs/hooks';
import {
  clearPauseVel,
  type Entity,
  getPauseVel,
  resetWorld,
  setPauseVel,
  world,
} from '../ecs/miniplexStore';
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
import { clearRespawnQueue, respawnSystem } from '../systems/RespawnSystem';
import { resetScores, scoringSystem } from '../systems/ScoringSystem';
import type { WeaponFiredEvent } from '../systems/WeaponSystem';
import { weaponSystem } from '../systems/WeaponSystem';
import { createSeededRng } from '../utils/seededRng';
import { Beam } from './Beam';
import { FXLayer } from './FXLayer';
import { Projectile } from './Projectile';

// Constants
const ARENA_SIZE = 20; // half-extent
const FIXED_TIMESTEP = 1 / 60; // 60 FPS
const BASE_SEED = 12345; // deterministic base

// Entity refinements for queries
type ProjectileEntity = Entity & {
  projectile: ProjectileComponent;
  position: [number, number, number];
  velocity?: [number, number, number];
};

type BeamEntity = Entity & { beam: BeamComponent };

export default function Simulation({ renderFloor = false }: { renderFloor?: boolean }) {
  const paused = useUI((s) => s.paused);
  const showFx = useUI((s) => s.showFx);
  const rapier = useRapier();
  const { invalidate } = useThree();
  const booted = useRef(false);
  // Accumulator-based fixed-step sim (decoupled from render)
  const accumulator = useRef(0);
  const lastTime = useRef<number | null>(null);
  const simTick = useRef(0);
  const MAX_STEPS_PER_FRAME = 5; // avoid spiral-of-death
  const MAX_FRAME_TIME = 0.25; // clamp large frame deltas (seconds)

  // Queries for render layers
  const projectileQuery = useMemo(
    () => world.with('projectile', 'position') as unknown as Query<ProjectileEntity>,
    [],
  );
  const beamQuery = useMemo(() => world.with('beam') as unknown as Query<BeamEntity>, []);
  const robotQuery = useMemo(
    () => world.with('team', 'weapon', 'weaponState') as Query<Entity>,
    [],
  );
  const projectiles = useEcsQuery(projectileQuery);
  const beams = useEcsQuery(beamQuery);
  const robots = useEcsQuery(robotQuery);

  // Initial spawn/reset before first paint
  useLayoutEffect(() => {
    if (!booted.current) {
      resetScores();
      clearRespawnQueue();
      resetAndSpawnDefaultTeams();
      booted.current = true;
    }
    return () => {
      booted.current = false;
      clearRespawnQueue();
      resetScores();
      resetWorld();
    };
  }, []);

  // Pause/resume: capture and zero velocities on pause; restore and wake on resume
  useEffect(() => {
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
            const lv = r.linvel?.();
            if (lv) setPauseVel(ent as Entity, [lv.x, lv.y, lv.z], undefined);
          } catch {
            // ignore read error
          }
          try {
            const av = r.angvel?.();
            if (av) setPauseVel(ent as Entity, undefined, [av.x, av.y, av.z]);
          } catch {
            // ignore read error
          }
          try {
            r.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
            r.setAngvel?.({ x: 0, y: 0, z: 0 }, true);
            r.sleep?.();
          } catch {
            // ignore write error
          }
        }
      } else {
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
            const pv = getPauseVel(ent as Entity);
            if (pv?.lin) r.setLinvel?.({ x: pv.lin[0], y: pv.lin[1], z: pv.lin[2] }, true);
            if (pv?.ang) r.setAngvel?.({ x: pv.ang[0], y: pv.ang[1], z: pv.ang[2] }, true);
            r.wakeUp?.();
            r.wake?.();
            clearPauseVel(ent as Entity);
          } catch {
            // ignore restore error
          }
        }
      }
    } catch {
      // best-effort pause/resume handling
    }
  }, [paused]);

  // Deterministic step: AI -> weapons -> damage -> score/respawn -> FX
  useFrame((state) => {
    // Handle pause: reset timing so we don't accumulate a huge delta while paused
    if (paused) {
      lastTime.current = null;
      accumulator.current = 0;
      return;
    }

    const now = state.clock.getElapsedTime();
    if (lastTime.current == null) {
      lastTime.current = now;
      return; // skip stepping on first frame to establish baseline
    }

    let frameTime = now - lastTime.current;
    lastTime.current = now;
    // clamp very large frame times to avoid doing too many steps
    frameTime = Math.min(frameTime, MAX_FRAME_TIME);
    accumulator.current += frameTime;

    let steps = 0;
    while (accumulator.current >= FIXED_TIMESTEP && steps < MAX_STEPS_PER_FRAME) {
      // advance one deterministic sim tick
      simTick.current += 1;
      const dt = FIXED_TIMESTEP;
      const rng = createSeededRng(BASE_SEED + simTick.current);

      const events = {
        weaponFired: [] as WeaponFiredEvent[],
        damage: [] as DamageEvent[],
        death: [] as DeathEvent[],
        impact: [] as ImpactEvent[],
      };

      // AI & movement
      aiSystem(world, rng, rapier);
      // Weapons
      weaponSystem(world, dt, rng, events);
      hitscanSystem(world, rng, events.weaponFired, events, rapier);
      beamSystem(world, dt, rng, events.weaponFired, events);
      projectileSystem(world, dt, rng, events.weaponFired, events, rapier);
      // Damage & outcomes
      damageSystem(world, events.damage, events);
      scoringSystem(events.death);
      respawnSystem(world, events.death);
      // FX (non-authoritative)
      fxSystem(world, dt, events);

      accumulator.current -= FIXED_TIMESTEP;
      steps += 1;
    }

    // Only request a render if we actually stepped the sim this frame
    if (steps > 0) state.invalidate();
  });

  // Kick a render when unpausing
  useEffect(() => {
    if (!paused) invalidate();
  }, [paused, invalidate]);

  return (
    <group>
      {/* Arena floor collider (always), with optional visual plane */}
      <RigidBody type="fixed" colliders={false}>
        {renderFloor ? (
          <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
            <planeGeometry args={[ARENA_SIZE * 2, ARENA_SIZE * 2, 1, 1]} />
            <meshStandardMaterial color="#202531" />
          </mesh>
        ) : null}
        <CuboidCollider args={[ARENA_SIZE, 0.1, ARENA_SIZE]} position={[0, -0.05, 0]} />
      </RigidBody>

      {/* Render layers */}
      {robots.map((e, i) => (
        <Robot key={`r-${String(e.id ?? i)}`} entity={e} />
      ))}
      {projectiles.map((entity, i) => (
        <Projectile
          key={`p-${String(
            entity.id ?? `${entity.projectile.sourceWeaponId}_${entity.projectile.spawnTime}_${i}`,
          )}`}
          entity={entity}
        />
      ))}
      {beams.map((entity) => (
        <Beam key={`b-${String(entity.id ?? entity.beam.sourceWeaponId)}`} entity={entity} />
      ))}

      {showFx ? <FXLayer /> : null}
    </group>
  );
}



