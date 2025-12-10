import { BattleWorld } from "../../ecs/world";
import { TelemetryPort } from "../../runtime/simulation/ports";

export function updateHazardSystem(
  world: BattleWorld,
  deltaMs: number,
  telemetry?: TelemetryPort,
): void {
  const now = world.state.elapsedMs;

  // Prepare maps to collect per-robot slows and active status flags for this tick
  const slowMultipliers: Map<string, number[]> = new Map();
  const activeStatus: Map<string, Set<string>> = new Map();

  // Remove expired status flags before processing new hazard windows
  for (const robot of world.robots.entities) {
    if (!robot.statusExpirations) continue;
    robot.statusExpirations = robot.statusExpirations.filter(
      (entry) => entry.expiresAt > now,
    );
    if (robot.statusFlags) {
      robot.statusFlags = robot.statusFlags.filter(
        (f) =>
          robot.statusExpirations!.some((e) => e.flag === f) ||
          (robot.statusFlags && robot.statusFlags.includes(f)),
      );
      // leave cleanup of non-expiring active flags to the main loop
    }
  }

  for (const obstacle of world.obstacles.entities) {
    if (obstacle.obstacleType !== "hazard") continue;

    const schedule = obstacle.hazardSchedule;
    if (!schedule) continue;

    const period = Math.max(1, schedule.periodMs);
    const activeMs = Math.max(0, Math.min(period, schedule.activeMs));
    const offset = schedule.offsetMs ?? 0;

    const cyclePos = (((now + offset) % period) + period) % period;
    const willBeActive = cyclePos < activeMs;

    const previouslyActive = !!obstacle.active;
    obstacle.active = willBeActive;

    // Emit telemetry on activation/deactivation transitions
    if (telemetry && previouslyActive !== willBeActive) {
      if (willBeActive) {
        telemetry.recordHazardActivate?.({
          frameIndex: world.state.frameIndex ?? 0,
          timestampMs: now,
          obstacleId: obstacle.id,
        });
      } else {
        telemetry.recordHazardDeactivate?.({
          frameIndex: world.state.frameIndex ?? 0,
          timestampMs: now,
          obstacleId: obstacle.id,
        });
      }
    }

    // Apply effects to robots inside the hazard while active
    if (willBeActive && obstacle.hazardEffects && obstacle.shape) {
      for (const robot of world.robots.entities) {
        // check containment in XZ plane
        let inside = false;
        const robPos = robot.position;
        const obsPos = obstacle.position ?? { x: 0, y: 0, z: 0 };

        if (obstacle.shape.kind === "circle") {
          const dx = robPos.x - obsPos.x;
          const dz = robPos.z - obsPos.z;
          inside =
            dx * dx + dz * dz <=
            obstacle.shape.radius * obstacle.shape.radius + 1e-6;
        } else if (obstacle.shape.kind === "box") {
          const minX = obsPos.x - obstacle.shape.halfWidth;
          const maxX = obsPos.x + obstacle.shape.halfWidth;
          const minZ = obsPos.z - obstacle.shape.halfDepth;
          const maxZ = obsPos.z + obstacle.shape.halfDepth;
          inside =
            robPos.x >= minX &&
            robPos.x <= maxX &&
            robPos.z >= minZ &&
            robPos.z <= maxZ;
        }

        if (inside) {
          for (const effect of obstacle.hazardEffects) {
            if (effect.kind === "damage" && effect.perSecond) {
              const damage = effect.amount * (deltaMs / 1000);
              robot.health = Math.max(0, robot.health - damage);
              robot.lastDamageTimestamp = now;
            } else if (effect.kind === "slow") {
              // slow.amount is interpreted as fraction [0..1] of speed to remove (e.g. 0.5 = 50% slow)
              const mul = Math.max(0, 1 - (effect.amount ?? 0));
              const list = slowMultipliers.get(robot.id) ?? [];
              list.push(mul);
              slowMultipliers.set(robot.id, list);
            } else if (effect.kind === "status") {
              const flag = `hazard:${obstacle.id}`;
              // If durationMs is provided, store an expiration per robot for this flag
              if (effect.durationMs && effect.durationMs > 0) {
                robot.statusExpirations = robot.statusExpirations ?? [];
                const expiresAt = now + effect.durationMs;
                const existing = robot.statusExpirations.find(
                  (e) => e.flag === flag,
                );
                if (existing) {
                  existing.expiresAt = Math.max(existing.expiresAt, expiresAt);
                } else {
                  robot.statusExpirations.push({ flag, expiresAt });
                }
                robot.statusFlags = robot.statusFlags ?? [];
                if (!robot.statusFlags.includes(flag))
                  robot.statusFlags.push(flag);
              } else {
                // active only while hazard is active
                const set = activeStatus.get(robot.id) ?? new Set<string>();
                set.add(flag);
                activeStatus.set(robot.id, set);
              }
            }
          }
        }
      }
    }
  }

  // Apply computed slow multipliers and reconcile status flags
  for (const robot of world.robots.entities) {
    // compute final multiplier (multiplicative stacking)
    const multipliers = slowMultipliers.get(robot.id) ?? [];
    let finalMul = 1;
    for (const m of multipliers) finalMul *= m;
    robot.slowMultiplier = multipliers.length > 0 ? finalMul : 1;

    // Merge active statuses (from active hazards this tick) with existing expirations
    const active = activeStatus.get(robot.id) ?? new Set<string>();
    // Build set of still-valid expiration flags
    const validExpirations = new Set(
      (robot.statusExpirations ?? []).map((e) => e.flag),
    );

    // Compute resulting flags
    const resultFlags = new Set<string>([...active, ...validExpirations]);

    robot.statusFlags = Array.from(resultFlags);
  }
}
