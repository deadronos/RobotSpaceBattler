import type { World } from "miniplex";

import type { Entity } from "../ecs/miniplexStore";
import { notifyEntityChanged } from "../ecs/miniplexStore";

/**
 * Physics Sync System - Synchronizes entity positions from Rapier physics bodies back to ECS components.
 *
 * This system ensures that visual rendering stays in sync with physics simulation by copying
 * the authoritative physics positions back to the entity.position components that React
 * components use for rendering.
 *
 * Should run every frame after physics simulation but before rendering.
 */
export function physicsSyncSystem(world: World<Entity>) {
  for (const entity of world.entities) {
    const e = entity as Entity & {
      position?: [number, number, number];
      rigid?: unknown;
    };

    // Skip entities without rigid bodies or position components
    if (!e.rigid || !e.position) continue;

    // Attempt to read physics position from rigid body
    const rigid = e.rigid as unknown as {
      translation?: () => { x: number; y: number; z: number };
    };

    if (rigid && typeof rigid.translation === "function") {
      try {
        const translation = rigid.translation();
        const newX = translation.x;
        const newY = translation.y;
        const newZ = translation.z;

        // Check if position has actually changed to avoid unnecessary notifications
        const threshold = 0.0001;
        const positionChanged =
          Math.abs(e.position[0] - newX) > threshold ||
          Math.abs(e.position[1] - newY) > threshold ||
          Math.abs(e.position[2] - newZ) > threshold;

        if (positionChanged) {
          // Update existing position vector in-place to preserve the reference
          e.position[0] = newX;
          e.position[1] = newY;
          e.position[2] = newZ;

          // Notify React components that this entity has changed
          notifyEntityChanged(e as Entity);
        }
      } catch {
        // Defensive: ignore any physics API errors
        // This allows the system to work even if the rigid body API changes
      }
    }
  }
}
