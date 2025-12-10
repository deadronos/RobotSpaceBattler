import { RobotEntity } from '../../ecs/world';
import { useTelemetryStore } from '../../state/telemetryStore';
import {
  DamageEventInput,
  DeathEventInput,
  FireEventInput,
  TelemetryPort,
} from './ports';

/**
 * Creates a TelemetryPort implementation that bridges simulation events to the Zustand store.
 * @returns A TelemetryPort instance.
 */
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
        type: 'spawn',
        timestampMs,
        sequenceId: nextSequence(),
        entityId: robot.id,
        teamId: robot.team,
      });
    },
    recordFire: (event: FireEventInput) => {
      useTelemetryStore.getState().recordEvent({
        type: 'fire',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        entityId: event.entityId,
        teamId: event.teamId,
      });
    },
    recordDamage: (event: DamageEventInput) => {
      useTelemetryStore.getState().recordEvent({
        type: 'damage',
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
        type: 'death',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        entityId: event.entityId,
        attackerId: event.attackerId,
        teamId: event.teamId,
      });
    },
    recordObstacleMove: (event) => {
      useTelemetryStore.getState().recordEvent({
        type: 'obstacle:move',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        frameIndex: event.frameIndex,
        obstacleId: event.obstacleId,
        position: event.position,
        orientation: event.orientation,
      } as any);
    },
    recordHazardActivate: (event) => {
      useTelemetryStore.getState().recordEvent({
        type: 'hazard:activate',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        frameIndex: event.frameIndex,
        obstacleId: event.obstacleId,
      } as any);
    },
    recordHazardDeactivate: (event) => {
      useTelemetryStore.getState().recordEvent({
        type: 'hazard:deactivate',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        frameIndex: event.frameIndex,
        obstacleId: event.obstacleId,
      } as any);
    },
    recordCoverDestroyed: (event) => {
      useTelemetryStore.getState().recordEvent({
        type: 'cover:destroyed',
        timestampMs: event.timestampMs,
        sequenceId: nextSequence(),
        frameIndex: event.frameIndex,
        obstacleId: event.obstacleId,
        destroyedBy: event.destroyedBy,
      } as any);
    },
  };
}
