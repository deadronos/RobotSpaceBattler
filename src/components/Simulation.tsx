import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

import store from "../ecs/miniplexStore";
import Robot from "../robots/RobotFactory";
import useUI from "../store/uiStore";
import { syncRigidBodiesToECS } from "../systems/physicsSync";
import Projectile from "./Projectile";

type Entity = {
  id: string;
  team: "red" | "blue";
  position: number[];
  rb?: RapierRigidBody;
  health?: { hp: number; maxHp: number };
  weapon?: {
    cooldown: number;
    fireRate: number;
    range: number;
    damage: number;
    projectileSpeed: number;
    projectileTTL: number;
  };
  projectile?: {
    ttl: number;
    damage: number;
    radius: number;
    velocity: { x: number; y: number; z: number };
  };
  fx?: { muzzleTimer?: number };
};

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

export default function Simulation() {
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
    syncRigidBodiesToECS();

    // Projectile TTL and out-of-bounds cleanup
    for (const p of [...store.entities.values()]) {
      if (!p || !p.projectile) continue;
      p.projectile.ttl -= delta;
      // Use RB translation if present for bounds check
      const pos = p.rb
        ? p.rb.translation()
        : { x: p.position[0], y: p.position[1], z: p.position[2] };
      const OOB =
        Math.abs(pos.x) > 200 ||
        Math.abs(pos.z) > 200 ||
        pos.y < -10 ||
        pos.y > 100;
      if (p.projectile.ttl <= 0 || OOB) {
        store.remove(p);
      }
    }

    // Muzzle flash timers
    for (const ent of [...store.entities.values()]) {
      if (ent && ent.fx && ent.fx.muzzleTimer && ent.fx.muzzleTimer > 0) {
        ent.fx.muzzleTimer = Math.max(0, ent.fx.muzzleTimer - delta);
      }
    }

    // remove dead entities from the store (very simple cleanup) and update UI
    const ents = [...store.entities.values()];
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

    const entities = [...store.entities.values()].filter((e) => !!e);
    entities.forEach((e) => {
      // each entity will look for the nearest enemy and apply a small force toward them
      // we store RigidBodyApi on the miniplex entity when the Robot registers it
      if (!e.rb) return;
      // find nearest enemy using RigidBody translations (authoritative source)
      const enemies = entities.filter((x) => x.team !== e.team && x !== e);
      if (enemies.length === 0) return;
      // compute nearest by distance using the RigidBody world transform if available
      let best: Entity | undefined;
      let bestDist = Number.POSITIVE_INFINITY;
      const a = e.rb.translation();
      for (const enemy of enemies) {
        if (!enemy.rb) continue;
        const b = enemy.rb.translation();
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
      const from = e.rb.translation();
      const to = best.rb.translation();
      const dir = { x: to.x - from.x, y: 0, z: to.z - from.z };
      const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1;
      const speed = 4; // tuning value
      const vx = (dir.x / len) * speed;
      const vz = (dir.z / len) * speed;
      // set target linear velocity while preserving Y velocity
      const current = e.rb.linvel();
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
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <CuboidCollider args={[60, 0.5, 60]} friction={1} restitution={0} />
        <mesh receiveShadow rotation-x={-Math.PI / 2}>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#11151d" />
        </mesh>
      </RigidBody>

      {/* Boundary walls to keep robots in arena */}
      <RigidBody type="fixed" colliders={false}>
        {/* +X wall */}
        <CuboidCollider args={[1, 5, 60]} position={[60, 5, 0]} />
        {/* -X wall */}
        <CuboidCollider args={[1, 5, 60]} position={[-60, 5, 0]} />
        {/* +Z wall */}
        <CuboidCollider args={[60, 5, 1]} position={[0, 5, 60]} />
        {/* -Z wall */}
        <CuboidCollider args={[60, 5, 1]} position={[0, 5, -60]} />
      </RigidBody>

      {/* Spawn robots from the store as React objects */}
      {[...store.entities.values()]
        .filter((e) => !e.projectile)
        .map((e) => (
          <Robot
            key={e.id}
            team={e.team}
            initialPos={new THREE.Vector3(...(e as any).position)}
            muzzleFlash={!!e.fx?.muzzleTimer && e.fx.muzzleTimer > 0}
            onRigidBodyReady={(rb) => {
              // attach rapier api to the entity so AI system can access it
              const ent = [...store.entities.values()].find(
                (ent) => ent.id === e.id,
              );
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
            velocity={p.projectile!.velocity}
            onRigidBodyReady={(rb) => {
              (p as any).rb = rb;
              rb.setTranslation(
                { x: p.position[0], y: p.position[1], z: p.position[2] },
                true,
              );
              rb.setLinvel(p.projectile!.velocity, true);
            }}
            onHit={(other) => {
              // find entity by matching rigid body reference
              const ents = [...store.entities.values()];
              const victim = ents.find((e) => (e as any).rb === other);
              if (victim && victim.team !== p.team && victim.health) {
                victim.health.hp -= p.projectile!.damage;
                store.remove(p);
              }
            }}
          />
        ))}
    </>
  );
}
