import type { RobotEntity, UnitRole } from "../../ecs/worldTypes";
import { ROBOT_ROLES } from "./robotLayout";

/**
 * Per-frame instance slot assignment for the instanced robot meshes (#168).
 *
 * One dense slot array per role, filled in ECS order. No allocation happens in
 * `fillRobotSlots`, so it is safe to call from `useFrame`.
 */

const ROLE_INDEX: Record<UnitRole, number> = {
  assault: 0,
  tank: 1,
  sniper: 2,
  medic: 3,
};

export interface RobotSlotBuffers {
  /** Number of robots written per role this frame. */
  counts: number[];
  /** Per-role robot references, dense from index 0. */
  slots: (RobotEntity | undefined)[][];
}

/** Creates reusable slot buffers; call once per rendered match. */
export function createRobotSlotBuffers(
  capacityPerRole: number,
): RobotSlotBuffers {
  return {
    counts: ROBOT_ROLES.map(() => 0),
    slots: ROBOT_ROLES.map(
      () => new Array<RobotEntity | undefined>(capacityPerRole),
    ),
  };
}

/**
 * Fills the per-role slots in ECS order.
 *
 * Robots past a role's capacity are dropped rather than growing the draw-call
 * count: the roster is far below capacity in practice (see robotLayout.ts).
 *
 * @param robots - Live robots from the ECS store, in iteration order.
 * @param buffers - Destination buffers, reused between frames.
 * @returns The same buffers, for convenience.
 */
export function fillRobotSlots(
  robots: readonly RobotEntity[],
  buffers: RobotSlotBuffers,
): RobotSlotBuffers {
  const { counts, slots } = buffers;
  counts.fill(0);

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    const roleIndex = ROLE_INDEX[robot.role] ?? 0;
    const count = counts[roleIndex];
    const roleSlots = slots[roleIndex];
    if (count >= roleSlots.length) {
      continue;
    }
    roleSlots[count] = robot;
    counts[roleIndex] = count + 1;
  }

  return buffers;
}

/** Index of a role in `ROBOT_ROLES`, used by the renderer. */
export function roleIndex(role: UnitRole): number {
  return ROLE_INDEX[role] ?? 0;
}
