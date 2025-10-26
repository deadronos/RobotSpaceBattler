import { Vec3 } from "../ecs/world";

export type MatchTraceEventType =
  | "spawn"
  | "move"
  | "fire"
  | "hit"
  | "damage"
  | "death"
  | "score";

export type MatchTraceEventBase = {
  type: MatchTraceEventType;
  timestampMs: number;
  frameIndex?: number;
  entityId?: string;
  attackerId?: string;
  targetId?: string;
  position?: Vec3;
  projectileId?: string;
  collisionNormal?: Vec3;
  amount?: number;
  resultingHealth?: number;
  sourceEventId?: string;
} & Record<string, unknown>;

export type MatchTraceEvent = MatchTraceEventBase & {
  sequenceId: number;
};

export type MatchTraceEventInput = MatchTraceEventBase;
