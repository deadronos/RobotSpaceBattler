import { BattleWorld } from '../../ecs/world';
import { distanceSquaredVec3 } from '../../lib/math/vec3';

export function updateHazardSystem(world: BattleWorld, deltaMs: number): void {
  const now = world.state.elapsedMs;
  for (const obstacle of world.obstacles.entities) {
    if (obstacle.obstacleType !== 'hazard') continue;

    const schedule = obstacle.hazardSchedule;
    if (!schedule) continue;

    const period = Math.max(1, schedule.periodMs);
    const activeMs = Math.max(0, Math.min(period, schedule.activeMs));
    const offset = schedule.offsetMs ?? 0;

    const cyclePos = ((now + offset) % period + period) % period;
    const willBeActive = cyclePos < activeMs;

    const previouslyActive = !!obstacle.active;
    obstacle.active = willBeActive;

    // Apply effects to robots inside the hazard while active
    if (willBeActive && obstacle.hazardEffects && obstacle.shape) {
      for (const robot of world.robots.entities) {
        // check containment in XZ plane
        let inside = false;
        const robPos = robot.position;
        const obsPos = (obstacle as any).position || { x: 0, z: 0 };

        if (obstacle.shape.kind === 'circle') {
          const dx = robPos.x - obsPos.x;
          const dz = robPos.z - obsPos.z;
          inside = dx * dx + dz * dz <= (obstacle.shape.radius * obstacle.shape.radius + 1e-6);
        } else if (obstacle.shape.kind === 'box') {
          const minX = obsPos.x - obstacle.shape.halfWidth;
          const maxX = obsPos.x + obstacle.shape.halfWidth;
          const minZ = obsPos.z - obstacle.shape.halfDepth;
          const maxZ = obsPos.z + obstacle.shape.halfDepth;
          inside = robPos.x >= minX && robPos.x <= maxX && robPos.z >= minZ && robPos.z <= maxZ;
        }

        if (inside) {
          for (const effect of obstacle.hazardEffects) {
            if (effect.kind === 'damage' && effect.perSecond) {
              const damage = effect.amount * (deltaMs / 1000);
              robot.health = Math.max(0, robot.health - damage);
              robot.lastDamageTimestamp = now;
            }
            // slow/status can be added later as higher level status flags
          }
        }
      }
    }
  }
}
