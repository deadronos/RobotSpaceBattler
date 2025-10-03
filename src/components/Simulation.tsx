import { useThree } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import type { Query } from "miniplex";
import React, { useEffect, useMemo, useRef } from "react";

import type { RobotComponent } from "../ecs/components/robot";
import {
  clearRuntimeEventLog,
  resolveEntity,
  setRuntimeEventLog,
} from "../ecs/ecsResolve";
import { useEcsQuery } from "../ecs/hooks";
import {
  type Entity,
  getRenderKey,
  notifyEntityChanged,
  subscribeEntityChanges,
  type Team,
  world,
} from "../ecs/miniplexStore";
import { capturePauseVel, restorePauseVel } from "../ecs/pauseManager";
import type {
  BeamComponent,
  DamageEvent,
  ProjectileComponent,
  WeaponType,
} from "../ecs/weapons";
import { useFixedStepLoop } from "../hooks/useFixedStepLoop";
import { useSimulationBootstrap } from "../hooks/useSimulationBootstrap";
import { Robot } from "../robots/robotPrefab";
import { spawnRobot } from "../robots/spawnControls";
import { useUI } from "../store/uiStore";
import { aiSystem } from "../systems/AISystem";
import { beamSystem } from "../systems/BeamSystem";
import { damageSystem, type DeathEvent } from "../systems/DamageSystem";
import { fxSystem } from "../systems/FxSystem";
import { hitscanSystem, type ImpactEvent } from "../systems/HitscanSystem";
import { physicsSyncSystem } from "../systems/PhysicsSyncSystem";
import { projectileSystem } from "../systems/ProjectileSystem";
import { DEFAULT_RESPAWN_DELAY_MS, processRespawnQueue, type SpawnRequest } from "../systems/RespawnSystem";
import { scoringSystem } from "../systems/ScoringSystem";
import type { WeaponFiredEvent } from "../systems/WeaponSystem";
import { weaponSystem } from "../systems/WeaponSystem";
import { createRuntimeEventLog } from "../utils/runtimeEventLog";
import { updateFixedStepMetrics } from "../utils/sceneMetrics";
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
  testMode = false,
}: {
  renderFloor?: boolean;
  testMode?: boolean;
}) {
  const paused = useUI((s) => s.paused);
  const showFx = useUI((s) => s.showFx);
  const friendlyFire = useUI((s) => s.friendlyFire);
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

  // Create a runtime event log instance for observability and scoring audit entries
  const runtimeEventLog = useMemo(() => createRuntimeEventLog({ capacity: 200 }), []);

  // Expose runtime event log globally for diagnostics
  useEffect(() => {
    setRuntimeEventLog(runtimeEventLog);
    return () => clearRuntimeEventLog();
  }, [runtimeEventLog]);

  const queuedRespawnsRef = useRef<SpawnRequest[]>([]);

  // Use fixed-step loop hook to provide deterministic stepping
  const fixedStepHandle = useFixedStepLoop(
    {
      enabled: !paused,
      seed: DETERMINISTIC_SEED,
      step: FIXED_TIMESTEP,
      testMode: testMode,
      friendlyFire,
    },
    (ctx) => {
  const { step, rng, simNowMs, frameCount } = ctx;

      // Update fixed-step metrics for diagnostics
      const metrics = fixedStepHandle?.getMetrics?.() ?? { stepsLastFrame: 0, backlog: 0 };
      updateFixedStepMetrics({
        stepsLastFrame: metrics.stepsLastFrame,
        backlog: metrics.backlog,
        frameCount,
        simNowMs,
      });

      const events = {
        weaponFired: [] as WeaponFiredEvent[],
        damage: [] as DamageEvent[],
        death: [] as DeathEvent[],
        impact: [] as ImpactEvent[],
      };

  aiSystem(world, rng, rapier, simNowMs);

      // Use object param API to pass StepContext into systems that require deterministic inputs
      weaponSystem({ world, stepContext: ctx, events });
      hitscanSystem({ world, stepContext: ctx, weaponFiredEvents: events.weaponFired, events, rapierWorld: rapier });
      beamSystem(
        world,
        step,
        rng,
        events.weaponFired,
        events,
        ctx,
        rapier,
      );
      projectileSystem(
        world,
        step,
        ctx,
        events.weaponFired,
        events,
        rapier,
      );

      damageSystem(world, events.damage, events, ctx.frameCount);

      scoringSystem({
        deathEvents: events.death,
        stepContext: ctx,
        runtimeEventLog: runtimeEventLog,
        idFactory: ctx.idFactory,
      });

      // Build spawn requests from death events and append to the local queuedRespawns
      for (const d of events.death) {
        const ent = resolveEntity(world, d.entityId as unknown as number);
        const team = (d.team ?? ent?.team) as string;
        const weaponType = (ent as Entity & { weapon?: { type?: WeaponType } })?.weapon?.type ?? ("gun" as WeaponType);
        queuedRespawnsRef.current.push({
          entityId: String(d.entityId),
          team,
          respawnAtMs: simNowMs + DEFAULT_RESPAWN_DELAY_MS,
          weaponType,
        });
      }

      // Process the queued respawns deterministically
      const { respawned, remainingQueue } = processRespawnQueue({
        queue: queuedRespawnsRef.current,
        stepContext: ctx,
      });

      queuedRespawnsRef.current = remainingQueue;

      // Perform runtime spawn actions and set invulnerability on spawned robots
      for (const r of respawned) {
        const robot = spawnRobot(r.team as Team, r.weaponType ?? ("gun" as WeaponType));
        try {
          ((robot as unknown) as RobotComponent).invulnerableUntil = r.invulnerableUntil;
          notifyEntityChanged(robot);
          invalidate();
        } catch {
          // ignore in non-runtime tests
        }
      }

      physicsSyncSystem(world);

      // Pass showFx flag from UI store, allowing tests to control it via parameter
      const showFx = useUI.getState().showFx;
      fxSystem(world, step, ctx, events, showFx);
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
