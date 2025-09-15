import { useFrame } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useMemo } from 'react';

import { createRobotEntity, type Entity, resetWorld, world } from '../ecs/miniplexStore';
import { Robot } from '../robots/robotPrefab';
import { useUI } from '../store/uiStore';

const TEAM_SIZE = 10;
const ARENA_SIZE = 20; // half-extent

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
  const speed = useUI((s) => s.speed);

  // Spawn once
  const robots = useMemo(() => {
    resetWorld();
    const spawn: Entity[] = [];
    for (let i = 0; i < TEAM_SIZE; i++) {
      spawn.push(
        createRobotEntity({
          team: 'red',
          position: [-8 + (i % 5) * 2, 0.6, -6 + Math.floor(i / 5) * 2],
        }),
      );
    }
    for (let i = 0; i < TEAM_SIZE; i++) {
      spawn.push(
        createRobotEntity({
          team: 'blue',
          position: [8 - (i % 5) * 2, 0.6, 6 - Math.floor(i / 5) * 2],
        }),
      );
    }
    return spawn;
  }, []);

  // Simple per-frame systems
  useFrame((_, dt) => {
    if (paused) return;
    const step = Math.min(dt * speed, 0.05);

    const entities = Array.from(world.entities);
    const red = entities.filter((e) => e.team === 'red' && e.alive !== false && e.rigid);
    const blue = entities.filter((e) => e.team === 'blue' && e.alive !== false && e.rigid);

    // AI + Movement
    for (const e of red) {
      const target = pickNearestEnemy(e, blue);
  steerTowards(e, target);
      tryAttack(e, target, step);
    }
    for (const e of blue) {
      const target = pickNearestEnemy(e, red);
  steerTowards(e, target);
      tryAttack(e, target, step);
    }
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

function tryAttack(self: Entity, target: Entity | undefined, dt: number) {
  if (!self.cooldown && self.cooldown !== 0) return;
  self.cooldownLeft = Math.max(0, (self.cooldownLeft ?? 0) - dt);
  if (!target || !self.power || !self.range) return;

  const rb = self.rigid as unknown as RigidLike | null;
  const trb = target.rigid as unknown as RigidLike | null;
  if (!rb || !trb) return;
  const d2 = distanceSquared(rb.translation(), trb.translation());
  if (d2 <= self.range * self.range && (self.cooldownLeft ?? 0) <= 0) {
    // Apply damage
    target.hp = Math.max(0, (target.hp ?? 0) - self.power);
    target.alive = (target.hp ?? 0) > 0;
    self.cooldownLeft = self.cooldown;
    if (!target.alive) {
      // Stop the dead body
      trb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  }
}
