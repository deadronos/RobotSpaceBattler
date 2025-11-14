import { RobotEntity } from "../../ecs/world";
import { useTelemetryStore } from "../../state/telemetryStore";
import {
  DamageEventInput,
  DeathEventInput,
  FireEventInput,
  TelemetryPort,
} from "./ports";

export function createTelemetryPort(): TelemetryPort {
  let sequenceId = 0;

  const nextSequence = () => {
    sequenceId += 1;
    return sequenceId;
  };

  return {
    reset: (matchId: string) => {
      sequenceId = 0;
      useTelemetryStore.getState().reset(matchId);
    },
    recordSpawn: (robot: RobotEntity, timestampMs: number) => {
      useTelemetryStore.getState().recordEvent({
        type: "spawn",
        timestampMs,
        sequenceId: nextSequence(),
        entityId: robot.id,
        teamId: robot.team,
      });
    },
    recordFire: (event: FireEventInput) => {
      useTelemetryStore.getState().recordEvent({
        type: "fire",
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        entityId: event.entityId,
        teamId: event.teamId,
      });
    },
    recordDamage: (event: DamageEventInput) => {
      useTelemetryStore.getState().recordEvent({
        type: "damage",
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        attackerId: event.attackerId,
        targetId: event.targetId,
        teamId: event.teamId,
        amount: event.amount,
      });
    },
    recordDeath: (event: DeathEventInput) => {
      useTelemetryStore.getState().recordEvent({
        type: "death",
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        entityId: event.entityId,
        attackerId: event.attackerId,
        teamId: event.teamId,
      });
    },
  };
}
