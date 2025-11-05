import {
  addInPlaceVec3,
  clampVec3,
  lengthVec3,
  scaleInPlaceVec3,
  scaleVec3,
  vec3,
} from '../../lib/math/vec3';
import { BattleWorld } from '../world';

const MIN_BOUNDS = vec3(-30, 0, -30);
const MAX_BOUNDS = vec3(30, 0, 30);
const FRICTION = 0.92;

export function updateMovementSystem(world: BattleWorld, deltaSeconds: number): void {
  const { robots } = world;

  robots.entities.forEach((robot) => {
    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds);

    const displacement = scaleVec3(robot.velocity, deltaSeconds);
    addInPlaceVec3(robot.position, displacement);
    clampVec3(robot.position, MIN_BOUNDS, MAX_BOUNDS);
    robot.position.y = 0;

    scaleInPlaceVec3(robot.velocity, FRICTION);
    robot.speed = lengthVec3(robot.velocity);
  });
}
