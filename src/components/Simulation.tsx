import { useFrame, useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import type { Query } from "miniplex";
import React, { useEffect, useMemo, useRef } from "react";

import { useEcsQuery } from "../ecs/hooks";
import {
  type Entity,
  resetWorld,
  subscribeEntityChanges,
  world,
} from "../ecs/miniplexStore";
import type {
  BeamComponent,
  DamageEvent,
  ProjectileComponent,
} from "../ecs/weapons";
import { Robot } from "../robots/robotPrefab";
import { resetAndSpawnDefaultTeams } from "../robots/spawnControls";
import { useUI } from "../store/uiStore";
import { aiSystem } from "../systems/AISystem";
import { beamSystem } from "../systems/BeamSystem";
import { damageSystem, type DeathEvent } from "../systems/DamageSystem";
import { fxSystem } from "../systems/FxSystem";
import { hitscanSystem, type ImpactEvent } from "../systems/HitscanSystem";
import { physicsSyncSystem } from "../systems/PhysicsSyncSystem";
import { projectileSystem } from "../systems/ProjectileSystem";
import { clearRespawnQueue, respawnSystem } from "../systems/RespawnSystem";
import { resetScores, scoringSystem } from "../systems/ScoringSystem";
import type { WeaponFiredEvent } from "../systems/WeaponSystem";
import { weaponSystem } from "../systems/WeaponSystem";
import { createSeededRng } from "../utils/seededRng";
import { Beam } from "./Beam";
import { FXLayer } from "./FXLayer";
import { Projectile } from "./Projectile";

const ARENA_SIZE = 20; // half-extent

// Deterministic mode configuration
const DETERMINISTIC_SEED = 12345;
const FIXED_TIMESTEP = 1 / 60; // 60 FPS

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

export default function Simulation({
  renderFloor = false,
}: {
  renderFloor?: boolean;
}) {
  const paused = useUI((s) => s.paused);
  const showFx = useUI((s) => s.showFx);
  // rapier context (optional) for physics queries like raycasts
  const rapier = useRapier();
  const { invalidate } = useThree();
  const frameCountRef = useRef(0);
  const spawnInitializedRef = useRef(false);
  const projectileQuery = useMemo(
    () =>
      world.with(
        "projectile",
        "position",
      ) as unknown as Query<ProjectileEntity>,
    [],
  );
  const beamQuery = useMemo(
    () => world.with("beam") as unknown as Query<BeamEntity>,
    [],
  );

  // Robots query (used for rendering Robot prefabs)
  // Important: do NOT require 'rigid' here; the Robot prefab sets entity.rigid on mount.
  // If we require 'rigid', nothing will render and robots will never mount.
  const robotQuery = useMemo(
    () => world.with("team", "weapon", "weaponState") as Query<Entity>,
    [],
  );
  const projectiles = useEcsQuery(projectileQuery);
  const beams = useEcsQuery(beamQuery);
  const robots = useEcsQuery(robotQuery);

  // RNG is created per-frame deterministically; no persistent RNG state needed

  // Spawn initial teams once (only if the world is empty on mount)
  useEffect(() => {
<<<<<<< HEAD
  let tid: number | undefined;
  // connections that we may create so cleanup can call disconnect()
  let robotConn: { disconnect?: () => void } | undefined;
  let projectileConn: { disconnect?: () => void } | undefined;
  let beamConn: { disconnect?: () => void } | undefined;

  if (!spawnInitializedRef.current) {
      // Explicitly connect queries early so their internal connections exist
      // before we add entities. This avoids a race where entities are
      // created before any listeners have attached and thus no onEntityAdded
      // notifications reach subscribers.
  robotConn = robotQuery.connect();
  projectileConn = projectileQuery.connect();
  beamConn = beamQuery.connect();

      // Defer spawning to the next macrotask so child components (Robot,
      // Projectile, Beam) have a chance to run their connection effects
      // (query.connect) and subscribe to entity add/remove events. When
      // spawning happens synchronously here it's possible the child
      // subscriptions haven't attached yet and they'll miss the initial
      // entities.
=======
    if (!spawnInitializedRef.current) {
      if (world.entities.length === 0) {
        resetScores();
        clearRespawnQueue();
        resetAndSpawnDefaultTeams();
      }
>>>>>>> f58ca147e8c92f2bf1932c64f13c8b5cb15628a6
      spawnInitializedRef.current = true;
      tid = window.setTimeout(() => {
        resetScores();
        clearRespawnQueue();
        resetAndSpawnDefaultTeams();
        // Force an immediate invalidation to ensure robots render
        invalidate();
      }, 0);
    }

    return () => {
      if (typeof tid === "number") window.clearTimeout(tid);
      try {
        robotConn?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        projectileConn?.disconnect?.();
      } catch {
        // ignore
      }
      try {
        beamConn?.disconnect?.();
      } catch {
        // ignore
      }

      spawnInitializedRef.current = false;
      clearRespawnQueue();
      resetScores();
      resetWorld();
    };
  }, [invalidate, robotQuery, projectileQuery, beamQuery]);

  // Deterministic per-frame systems
  useFrame((state) => {
    if (paused) return;

    // Use fixed timestep for determinism
    const step = FIXED_TIMESTEP;
    frameCountRef.current++;

    // Create fresh RNG for this frame (deterministic)
    const frameRng = createSeededRng(
      DETERMINISTIC_SEED + frameCountRef.current,
    );

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

    // 4. Physics sync - Update ECS positions from rigid body translations
    // This ensures visual components render at current physics positions
    physicsSyncSystem(world);

    // 5. FX system (render-only, non-authoritative)
    fxSystem(world, step, events);

    // Request a re-render since we're on an on-demand frameloop
    state.invalidate();
  });

  // Kick the demand loop when unpausing or on mount
  useEffect(() => {
    if (!paused) invalidate();
  }, [paused, invalidate]);

  useEffect(() => {
    const unsubscribe = subscribeEntityChanges(() => {
      invalidate();
    });
    return () => {
      unsubscribe();
    };
  }, [invalidate]);

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
        <CuboidCollider
          args={[ARENA_SIZE, 0.1, ARENA_SIZE]}
          position={[0, -0.05, 0]}
        />
      </RigidBody>

      {/* Robots */}
      {robots.map((e, i) => (
        <Robot key={String(e.id ?? i)} entity={e} />
      ))}

      {/* Projectiles */}
      {projectiles.map((entity, i) => (
        <Projectile
          key={String(
            entity.id ??
              `${entity.projectile.sourceWeaponId}_${entity.projectile.spawnTime}_${i}`,
          )}
          entity={entity}
        />
      ))}
      {beams.map((entity) => (
        <Beam
          key={String(entity.id ?? entity.beam.sourceWeaponId)}
          entity={entity}
        />
      ))}

      {/* FX Layer */}
      {showFx ? <FXLayer /> : null}
    </group>
  );
}

// Movement and firing helpers removed — AI responsibilities moved to aiSystem
