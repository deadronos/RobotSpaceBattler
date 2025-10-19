import type { MatchTraceEvent } from "../../../src/systems/matchTrace/types";

export const sampleEvents: MatchTraceEvent[] = [
  {
    type: "spawn",
    timestampMs: 0,
    sequenceId: 0,
    entityId: "robot-1",
    teamId: "red",
    position: [0, 0, 0],
  } as any,
  {
    type: "move",
    timestampMs: 100,
    sequenceId: 1,
    entityId: "robot-1",
    position: [1, 0, 0],
  } as any,
  {
    type: "fire",
    timestampMs: 100,
    sequenceId: 2,
    attackerId: "robot-1",
    projectileId: "proj-1",
    position: [1, 0, 0],
  } as any,
  {
    type: "hit",
    timestampMs: 200,
    sequenceId: 3,
    projectileId: "proj-1",
    targetId: "robot-2",
    position: [2, 0, 0],
  } as any,
  {
    type: "death",
    timestampMs: 300,
    sequenceId: 4,
    entityId: "robot-2",
    killedBy: "robot-1",
  } as any,
];

export default sampleEvents;
