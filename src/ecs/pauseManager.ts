import type { World } from "miniplex";
import type { Entity } from "./miniplexStore";
import { setPauseVel, getPauseVel, clearPauseVel } from "./miniplexStore";

export function capturePauseVel(world: World<Entity>) {
  for (const raw of world.entities) {
    const e = raw as Entity;
    try {
      if (!e.rigid) continue;
      const rigid = e.rigid as unknown as {
        linvel?: () => { x: number; y: number; z: number };
        angvel?: () => { x: number; y: number; z: number };
        setLinvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
        setAngvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
      };
      const lin = rigid.linvel?.() ?? null;
      const ang = rigid.angvel?.() ?? null;
      if (lin) setPauseVel(e, [lin.x, lin.y, lin.z]);
      if (ang) setPauseVel(e, undefined, [ang.x, ang.y, ang.z]);
      // Zero velocities
      rigid.setLinvel?.({ x: 0, y: 0, z: 0 }, true);
      rigid.setAngvel?.({ x: 0, y: 0, z: 0 }, true);
    } catch {
      // ignore per-entity errors
    }
  }
}

export function restorePauseVel(world: World<Entity>) {
  for (const raw of world.entities) {
    const e = raw as Entity;
    try {
      if (!e.rigid) continue;
      const rigid = e.rigid as unknown as {
        setLinvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
        setAngvel?: (v: { x: number; y: number; z: number }, wake: boolean) => void;
      };
      const pv = getPauseVel(e);
      if (pv?.lin) {
        rigid.setLinvel?.({ x: pv.lin[0], y: pv.lin[1], z: pv.lin[2] }, true);
      }
      if (pv?.ang) {
        rigid.setAngvel?.({ x: pv.ang[0], y: pv.ang[1], z: pv.ang[2] }, true);
      }
      clearPauseVel(e);
    } catch {
      // ignore
    }
  }
}
