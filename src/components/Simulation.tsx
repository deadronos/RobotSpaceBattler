import { useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import type { Query } from "miniplex";
import React, { useEffect, useMemo } from "react";

import { useEcsQuery } from "../ecs/hooks";
import {
  type Entity,
  getRenderKey,
  subscribeEntityChanges,
  world,
} from "../ecs/miniplexStore";
import { capturePauseVel, restorePauseVel } from "../ecs/pauseManager";
import type {
  BeamComponent,
  DamageEvent,
  ProjectileComponent,
} from "../ecs/weapons";
import { useFixedStepLoop } from "../hooks/useFixedStepLoop";
import { useSimulationBootstrap } from "../hooks/useSimulationBootstrap";
import { Robot } from "../robots/robotPrefab";
import { useUI } from "../store/uiStore";
import { aiSystem } from "../systems/AISystem";
import { beamSystem } from "../systems/BeamSystem";
import { damageSystem, type DeathEvent } from "../systems/DamageSystem";
import { fxSystem } from "../systems/FxSystem";
import { hitscanSystem, type ImpactEvent } from "../systems/HitscanSystem";
import { physicsSyncSystem } from "../systems/PhysicsSyncSystem";
import { projectileSystem } from "../systems/ProjectileSystem";
import { respawnSystem } from "../systems/RespawnSystem";
import { scoringSystem } from "../systems/ScoringSystem";
import type { WeaponFiredEvent } from "../systems/WeaponSystem";
import { weaponSystem } from "../systems/WeaponSystem";
// RNG is created by FixedStepDriver; no per-component RNG import needed
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
  // internal step/frame counters are held by the FixedStepDriver
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
  // debug logs removed
  const projectiles = useEcsQuery(projectileQuery);
  const beams = useEcsQuery(beamQuery);
  const robots = useEcsQuery(robotQuery);

  // debug logs removed

  // RNG is created per-frame deterministically; no persistent RNG state needed

  // Spawn & bootstrap logic extracted to hook
  useSimulationBootstrap(robotQuery, projectileQuery, beamQuery, invalidate);

  // Use fixed-step loop hook to provide deterministic stepping
  useFixedStepLoop(
    { enabled: !paused, seed: DETERMINISTIC_SEED, step: FIXED_TIMESTEP },
    (ctx) => {
      const { step, rng, simNowMs } = ctx;
      const events = {
        weaponFired: [] as WeaponFiredEvent[],
        damage: [] as DamageEvent[],
        death: [] as DeathEvent[],
        impact: [] as ImpactEvent[],
      };

      aiSystem(world, rng, rapier, simNowMs);

      weaponSystem(world, step, rng, events, simNowMs);
      hitscanSystem(world, rng, events.weaponFired, events, rapier);
      beamSystem(
        world,
        step,
        rng,
        events.weaponFired,
        events,
        simNowMs,
        rapier,
      );
      projectileSystem(
        world,
        step,
        rng,
        events.weaponFired,
        events,
        simNowMs,
        rapier,
      );

      damageSystem(world, events.damage, events);

      scoringSystem(events.death);
      respawnSystem(world, events.death);

      physicsSyncSystem(world);

      fxSystem(world, step, events);
    },
  );

  // Kick the demand loop when unpausing or on mount
  useEffect(() => {
    if (!paused) invalidate();
  }, [paused, invalidate]);

  // Use centralized ECS render-key helper for stable unique keys
  // (see miniplexStore.getRenderKey)

  useEffect(() => {
    if (!world) return;
    if (paused) {
      capturePauseVel(world);
    } else {
      restorePauseVel(world);
    }
  }, [paused]);

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
        <Robot key={getRenderKey(e, i)} entity={e} />
      ))}

      {/* Projectiles */}
      {projectiles.map((entity, i) => (
        <Projectile key={getRenderKey(entity, i)} entity={entity} />
      ))}
      {beams.map((entity, i) => (
        <Beam key={getRenderKey(entity, i)} entity={entity} />
      ))}

      {/* FX Layer */}
      {showFx ? <FXLayer /> : null}
    </group>
  );
}

// Movement and firing helpers removed — AI responsibilities moved to aiSystem
