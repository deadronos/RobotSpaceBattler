import { BattleWorld } from '../../ecs/world';
import { TelemetryPort } from '../../runtime/simulation/ports';

/**
 * Apply damage to a destructible obstacle. Returns true if the obstacle was destroyed.
 */
export function applyDamageToObstacle(world: BattleWorld, obstacleId: string, amount: number, telemetry?: TelemetryPort): boolean {
  const obs = world.obstacles.entities.find((o) => o.id === obstacleId);
  if (!obs) return false;
  if (obs.obstacleType !== 'destructible') return false;

  if (obs.durability == null) obs.durability = obs.maxDurability ?? 0;

  obs.durability = Math.max(0, obs.durability - amount);

  if (obs.durability <= 0) {
    // Remove obstacle from world (it will be absent from obstacles store)
    world.world.remove(obs);
    telemetry?.recordCoverDestroyed?.({
      frameIndex: world.state.frameIndex ?? 0,
      timestampMs: world.state.elapsedMs,
      obstacleId: obs.id,
    });
    return true;
  }

  return false;
}
