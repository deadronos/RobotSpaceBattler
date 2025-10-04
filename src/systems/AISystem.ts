import type { World } from "miniplex";

import type { Entity } from "../ecs/miniplexStore";
import { notifyEntityChanged } from "../ecs/miniplexStore";
import type { RapierWorldOrAdapter } from "../utils/physicsAdapter";
import {
  type AIContext,
  type AIDecision,
  decideEngageAction,
  decideFleeAction,
  decideIdleAction,
  decidePatrolAction,
  shouldFlee,
} from "./ai/decisions";
import { canSeeTarget, type PerceptionContext } from "./ai/perception";
import { findNearestEnemy } from "./ai/queries";

export type AIState = "idle" | "patrol" | "engage" | "flee";

export interface AIComponent {
  state: AIState;
  stateSince: number; // timestamp ms
}

const POSITION_EPSILON = 0.0001;

/**
 * Apply an AI decision to an entity, updating its state and issuing commands.
 */
function applyDecision(
  entity: Entity & {
    ai: AIComponent;
    weaponState: { firing?: boolean; cooldownRemaining?: number };
    rigid?: {
      setLinvel?: (
        v: { x: number; y: number; z: number },
        wake: boolean,
      ) => void;
    } | null;
  },
  decision: AIDecision,
): void {
  if (decision.nextState !== undefined) {
    entity.ai.state = decision.nextState;
  }

  if (decision.stateSince !== undefined) {
    entity.ai.stateSince = decision.stateSince;
  }

  if (decision.targetId !== undefined) {
    entity.targetId = decision.targetId;
  }

  if (decision.shouldFire !== undefined) {
    entity.weaponState.firing = decision.shouldFire;
  }

  if (decision.velocity !== undefined && entity.rigid?.setLinvel) {
    entity.rigid.setLinvel(decision.velocity, true);
  }
}

/**
 * Simple AI system implementing a tiny state machine and perception checks.
 * - Idle: stand still
 * - Patrol: wander (slow random velocity)
 * - Engage: move to and fire at target
 * - Flee: back off when low HP
 *
 * Refactored to use query-based enemy finding and pure decision functions
 * for improved testability.
 */
export function aiSystem(
  world: World<Entity>,
  rng: () => number,
  rapierWorld?: RapierWorldOrAdapter,
  simNowMs?: number,
) {
  if (typeof simNowMs !== "number") {
    throw new Error(
      "aiSystem requires simNowMs (from StepContext) to avoid Date.now fallback and ensure determinism",
    );
  }
  if (typeof rng !== "function") {
    throw new Error(
      "aiSystem requires a deterministic rng function to ensure determinism",
    );
  }

  const now = simNowMs;

  const perceptionContext: PerceptionContext = {
    world,
    rapierWorld,
  };

  for (const e of world.entities) {
    const entity = e as Entity & {
      ai?: AIComponent;
      weaponState?: { firing?: boolean; cooldownRemaining?: number };
      weapon?: { range?: number } & Record<string, unknown>;
      position?: [number, number, number];
      rigid?: {
        setLinvel?: (
          v: { x: number; y: number; z: number },
          wake: boolean,
        ) => void;
        translation?: () => { x: number; y: number; z: number };
      } | null;
      hp?: number;
      maxHp?: number;
      speed?: number;
    };

    if (!entity.weapon || !entity.weaponState || !entity.position) continue;

    // Sync position from physics before making AI decisions
    if (entity.rigid && typeof entity.rigid.translation === "function") {
      try {
        const translation = entity.rigid.translation();
        const nextPosition: [number, number, number] = [
          translation.x,
          translation.y,
          translation.z,
        ];
        if (
          Math.abs(entity.position[0] - nextPosition[0]) > POSITION_EPSILON ||
          Math.abs(entity.position[1] - nextPosition[1]) > POSITION_EPSILON ||
          Math.abs(entity.position[2] - nextPosition[2]) > POSITION_EPSILON
        ) {
          entity.position = nextPosition;
        }
      } catch {
        // Defensive: ignore physics API errors
      }
    }

    // Ensure an AI component
    if (!entity.ai) {
      entity.ai = { state: "idle", stateSince: now } as AIComponent;
    }

    const context: AIContext = {
      now,
      hp: entity.hp ?? 0,
      maxHp: entity.maxHp ?? 100,
      weaponRange: entity.weapon.range ?? 10,
      speed: entity.speed ?? 3,
    };

    // Health-based forced flee transition
    if (shouldFlee(context.hp, context.maxHp)) {
      entity.ai.state = "flee";
    }

    // Find nearest enemy using query helper
    const target = findNearestEnemy(world, entity);
    const hasTarget = target !== undefined;
    const hasLOS = canSeeTarget(
      entity,
      target,
      context.weaponRange,
      perceptionContext,
    );

    let decision: AIDecision = {};

    switch (entity.ai.state) {
      case "idle":
        decision = decideIdleAction(
          context,
          hasTarget,
          hasLOS,
          target,
          entity.ai.stateSince,
          rng,
        );
        break;

      case "patrol":
        decision = decidePatrolAction(
          context,
          hasTarget,
          hasLOS,
          target,
          entity.ai.stateSince,
          rng,
        );
        break;

      case "engage":
        decision = decideEngageAction(
          context,
          hasTarget,
          hasLOS,
          target,
          entity.position,
          rng,
        );
        break;

      case "flee":
        decision = decideFleeAction(context, target, entity.position, rng);
        break;

      default:
        decision = {
          nextState: "idle",
          stateSince: now,
        };
    }

    applyDecision(
      entity as Entity & {
        ai: AIComponent;
        weaponState: { firing?: boolean; cooldownRemaining?: number };
        rigid?: {
          setLinvel?: (
            v: { x: number; y: number; z: number },
            wake: boolean,
          ) => void;
        } | null;
      },
      decision,
    );
    notifyEntityChanged(entity as Entity);
  }
}
