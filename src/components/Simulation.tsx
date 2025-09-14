import { useFrame } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import store from "../ecs/miniplexStore";
import type { Entity } from "../ecs/types";
import Robot from "../robots/RobotFactory";
import useUI from "../store/uiStore";
import { syncRigidBodiesToECS } from "../systems/physicsSync";
import { cleanupProjectiles } from "../systems/projectileCleanup";
import { handleProjectileHit } from "../systems/projectileOnHit";
import Projectile from "./Projectile";

// Entity type is imported from ecs/types

function createRobotEntity(
  id: string,
  team: "red" | "blue",
  pos: THREE.Vector3,
) {
  store.add({
    id,
    team,
    position: pos.toArray(),
    health: { hp: 10, maxHp: 10 },
    weapon: {
      cooldown: 0,
      fireRate: 2,
      range: 12,
      damage: 2,
      projectileSpeed: 25,
      projectileTTL: 3,
    }, // fireRate shots/sec
    fx: {},
  });
}

type Props = {
  physics?: boolean;
  // runtime-provided Rapier components to avoid static imports that can
  // cause multiple module instances (and context mismatch).
  rapierComponents?: {
    RigidBody?: React.ComponentType<unknown>;
    CuboidCollider?: React.ComponentType<unknown>;
    CapsuleCollider?: React.ComponentType<unknown>;
    BallCollider?: React.ComponentType<unknown>;
  } | null;
};
export default function Simulation({ physics = true, rapierComponents = null }: Props) {
  const { paused } = useUI();
  const didSpawnRef = useRef(false);

  function spawnProjectile(
    owner: Entity,
    from: THREE.Vector3,
    dir: THREE.Vector3,
    damage = 4,
  ) {
    const id = `proj-${owner.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    store.add({
      id,
      team: owner.team,
      position: [from.x, from.y, from.z],
      projectile: {
        ttl: owner.weapon?.projectileTTL ?? 3,
        damage,
        radius: 0.1,
        velocity: {
          x: dir.x * (owner.weapon?.projectileSpeed ?? 25),
          y: dir.y * (owner.weapon?.projectileSpeed ?? 25),
          z: dir.z * (owner.weapon?.projectileSpeed ?? 25),
        },
      },
    });
  }

  useEffect(() => {
    if (didSpawnRef.current) return;
    didSpawnRef.current = true;
    // spawn 10 red and 10 blue robots in two zones with stable ids
    const spacing = 3;
    for (let i = 0; i < 10; i++) {
      const rx = -12 + (i % 5) * spacing;
      const rz = -5 + Math.floor(i / 5) * spacing;
      // avoid duplicates if store already contains id (defensive)
      if (![...store.entities.values()].some((e) => e.id === `red-${i}`))
        createRobotEntity(`red-${i}`, "red", new THREE.Vector3(rx, 1, rz));
    }
    for (let i = 0; i < 10; i++) {
      const rx = 12 - (i % 5) * spacing;
      const rz = 5 - Math.floor(i / 5) * spacing;
      if (![...store.entities.values()].some((e) => e.id === `blue-${i}`))
        createRobotEntity(`blue-${i}`, "blue", new THREE.Vector3(rx, 1, rz));
    }
  }, []);

  // A very small, naive global AI loop to apply impulses toward nearest enemy
  useFrame((_, delta) => {
  if (paused) return;
  // Physics sync: mirror RB translations back into ECS positions
  if (physics) syncRigidBodiesToECS();

    // Projectile TTL and out-of-bounds cleanup
    // extracted into systems/projectileCleanup for testability
    const allEntities = [...store.entities.values()] as unknown as Entity[];
    cleanupProjectiles(delta, store);

    // Muzzle flash timers
    for (const ent of allEntities) {
      if (ent && ent.fx && ent.fx.muzzleTimer && ent.fx.muzzleTimer > 0) {
        ent.fx.muzzleTimer = Math.max(0, ent.fx.muzzleTimer - delta);
      }
    }

    // remove dead entities from the store (very simple cleanup) and update UI
  const ents = allEntities;
    const ui = useUI.getState();
    for (const ent of ents) {
      if (ent && ent.health && ent.health.hp <= 0) {
        if (ent.team === "red") ui.addKill("blue");
        else ui.addKill("red");
        store.remove(ent);
      }
    }
    // update alive counts after removals
    const redAlive = [...store.entities.values()].filter(
      (e) => e.team === "red" && e.health,
    ).length;
    const blueAlive = [...store.entities.values()].filter(
      (e) => e.team === "blue" && e.health,
    ).length;
    ui.setCounts(redAlive, blueAlive);

    const entities = allEntities.filter((e) => !!e);
    entities.forEach((e) => {
      // each entity will look for the nearest enemy and apply a small force toward them
      // we store RigidBodyApi on the miniplex entity when the Robot registers it
      if (!physics || !e.rb) return;
      // find nearest enemy using RigidBody translations (authoritative source)
      const enemies = entities.filter((x) => x.team !== e.team && x !== e);
      if (enemies.length === 0) return;
      // compute nearest by distance using the RigidBody world transform if available
      let best: Entity | undefined;
      let bestDist = Number.POSITIVE_INFINITY;
      const a =
        e.rb && e.rb.translation
          ? e.rb.translation()
          : { x: e.position[0], y: e.position[1], z: e.position[2] };
      for (const enemy of enemies) {
        if (!enemy.rb) continue;
        const b =
          enemy.rb && enemy.rb.translation
            ? enemy.rb.translation()
            : {
                x: enemy.position[0],
                y: enemy.position[1],
                z: enemy.position[2],
              };
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestDist) {
          bestDist = d2;
          best = enemy as Entity;
        }
      }
      if (!best || !best.rb) return;
      // steer: compute direction and set a modest linear velocity toward target
      const from =
        e.rb && e.rb.translation
          ? e.rb.translation()
          : { x: e.position[0], y: e.position[1], z: e.position[2] };
      const to =
        best.rb && best.rb.translation
          ? best.rb.translation()
          : { x: best.position[0], y: best.position[1], z: best.position[2] };
      const dir = { x: to.x - from.x, y: 0, z: to.z - from.z };
      const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1;
      const speed = 4; // tuning value
      const vx = (dir.x / len) * speed;
      const vz = (dir.z / len) * speed;
      // set target linear velocity while preserving Y velocity
      const current =
        e.rb && e.rb.linvel ? e.rb.linvel() : { x: 0, y: 0, z: 0 };
      if (e.rb && e.rb.setLinvel)
        e.rb.setLinvel({ x: vx, y: current.y, z: vz }, true);

      // Weapon cooldown and in-range fire check
      if (e.weapon) {
        e.weapon.cooldown = Math.max(0, e.weapon.cooldown - delta);
        const dist2 = dir.x * dir.x + dir.z * dir.z;
        const range2 = e.weapon.range * e.weapon.range;
        if (e.weapon.cooldown <= 0 && dist2 <= range2) {
          const fireDir = new THREE.Vector3(dir.x, 0, dir.z).normalize();
          spawnProjectile(
            e as Entity,
            new THREE.Vector3(from.x, from.y + 1, from.z),
            fireDir,
            e.weapon.damage,
          );
          e.weapon.cooldown = 1 / e.weapon.fireRate;
          if (!e.fx) e.fx = {};
          e.fx.muzzleTimer = 0.05;
        }
      }
    });

  });

  return (
      <>
        {/* Ground / floor (visual + collider) */}
        {physics && rapierComponents && rapierComponents.RigidBody && rapierComponents.CuboidCollider ? (
          React.createElement(
            rapierComponents.RigidBody,
            ({ type: "fixed", colliders: false, position: [0, 0, 0] } as unknown as Record<string, unknown>),
            React.createElement(rapierComponents.CuboidCollider, ({ args: [60, 0.5, 60], friction: 1, restitution: 0 } as unknown as Record<string, unknown>)),
            <mesh receiveShadow rotation-x={-Math.PI / 2}>
              <planeGeometry args={[120, 120]} />
              <meshStandardMaterial color="#11151d" />
            </mesh>,
          )
        ) : (
          <mesh receiveShadow rotation-x={-Math.PI / 2}>
            <planeGeometry args={[120, 120]} />
            <meshStandardMaterial color="#11151d" />
          </mesh>
        )}

        {/* Boundary walls to keep robots in arena */}
        {physics && rapierComponents && rapierComponents.RigidBody && rapierComponents.CuboidCollider ? (
          React.createElement(
            rapierComponents.RigidBody,
            ({ type: "fixed", colliders: false } as unknown as Record<string, unknown>),
            React.createElement(rapierComponents.CuboidCollider, ({ args: [1, 5, 60], position: [60, 5, 0] } as unknown as Record<string, unknown>)),
            React.createElement(rapierComponents.CuboidCollider, ({ args: [1, 5, 60], position: [-60, 5, 0] } as unknown as Record<string, unknown>)),
            React.createElement(rapierComponents.CuboidCollider, ({ args: [60, 5, 1], position: [0, 5, 60] } as unknown as Record<string, unknown>)),
            React.createElement(rapierComponents.CuboidCollider, ({ args: [60, 5, 1], position: [0, 5, -60] } as unknown as Record<string, unknown>)),
          )
        ) : (
          <group>
            <mesh position={[60, 5, 0]}>
              <boxGeometry args={[2, 10, 120]} />
              <meshStandardMaterial color="#000" transparent opacity={0.01} />
            </mesh>
            <mesh position={[-60, 5, 0]}>
              <boxGeometry args={[2, 10, 120]} />
              <meshStandardMaterial color="#000" transparent opacity={0.01} />
            </mesh>
            <mesh position={[0, 5, 60]}>
              <boxGeometry args={[120, 10, 2]} />
              <meshStandardMaterial color="#000" transparent opacity={0.01} />
            </mesh>
            <mesh position={[0, 5, -60]}>
              <boxGeometry args={[120, 10, 2]} />
              <meshStandardMaterial color="#000" transparent opacity={0.01} />
            </mesh>
          </group>
        )}

        {/* Spawn robots from the store as React objects */}
        {[...store.entities.values()]
          .filter((e) => !e.projectile)
          .map((e) => (
            <Robot
              key={e.id}
              team={e.team}
              initialPos={new THREE.Vector3(...(e.position as number[]))}
              muzzleFlash={!!e.fx?.muzzleTimer && e.fx.muzzleTimer > 0}
          rapierComponents={rapierComponents}
              onRigidBodyReady={(rb) => {
                // attach rapier api to the entity so AI system can access it
                const ent = [...store.entities.values()].find(
                  (ent) => ent.id === e.id,
                ) as Entity | undefined;
                if (ent) {
                  ent.rb = rb;
                }
              }}
            />
          ))}

        {/* Projectiles as ECS entities with rapier sensors */}
        {[...store.entities.values()]
          .filter((e) => !!e.projectile)
          .map((p) => (
            <Projectile
              key={p.id}
              id={p.id}
              team={p.team}
              position={{ x: p.position[0], y: p.position[1], z: p.position[2] }}
              rapierComponents={rapierComponents}
              velocity={p.projectile!.velocity}
              onRigidBodyReady={(rb) => {
                p.rb = rb;
                const rbApi = rb;
                if (rbApi) {
                  try {
                    rbApi.setTranslation?.(
                      { x: p.position[0], y: p.position[1], z: p.position[2] },
                      true,
                    );
                    rbApi.setLinvel?.(p.projectile!.velocity, true);
                  } catch {
                    // ignore runtime differences in RAPier API shape
                  }
                }
              }}
              onHit={(other) => {
                handleProjectileHit(p as Entity, other, store);
              }}
            />
          ))}
      </>
    );
}
