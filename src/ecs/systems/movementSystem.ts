import { BattleWorld } from '../world';

export function updateMovementSystem(world: BattleWorld, deltaSeconds: number): void {
  const { robots } = world;

  robots.entities.forEach((robot) => {
    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds * robot.fireRate);
  });
}
