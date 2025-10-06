import { createRobot } from '../entities/Robot';
import { setRobotBodyPosition } from './physics';
import type { AIState, Team, Vector3, WeaponType } from '../../types';
import { cloneVector, subtractVectors } from '../utils/vector';
import type { WorldView } from './worldTypes';

const WEAPON_DISTRIBUTION: Record<Team, WeaponType[]> = {
  red: ['laser', 'laser', 'laser', 'laser', 'gun', 'gun', 'gun', 'rocket', 'rocket', 'rocket'],
  blue: ['laser', 'laser', 'laser', 'gun', 'gun', 'gun', 'gun', 'rocket', 'rocket', 'rocket'],
};

function createAIState(offset: Vector3): AIState {
  return {
    behaviorMode: 'aggressive',
    targetId: null,
    coverPosition: null,
    lastFireTime: 0,
    formationOffset: cloneVector(offset),
  };
}

export function spawnTeam(context: WorldView, team: Team): void {
  const spawnZone = context.arena.spawnZones[team];
  const weapons = WEAPON_DISTRIBUTION[team];

  spawnZone.spawnPoints.forEach((point, index) => {
    const id = `${team}-${index}`;
    const formationOffset = subtractVectors(point, spawnZone.center);
    const robot = createRobot({
      id,
      team,
      position: cloneVector(point),
      rotation: { x: 0, y: team === 'red' ? 0.2 : -0.2, z: 0, w: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      maxHealth: 100,
      weaponType: weapons[index % weapons.length],
      isCaptain: index === 0,
      aiState: createAIState(formationOffset),
      stats: {
        kills: 0,
        damageDealt: 0,
        damageTaken: 0,
        timeAlive: 0,
        shotsFired: 0,
      },
    });

    context.entities.push(robot);
    setRobotBodyPosition(context.physics, robot, robot.position);
  });
}

export function spawnInitialTeams(context: WorldView, teams: Team[]): void {
  teams.forEach((team) => spawnTeam(context, team));
}

export { WEAPON_DISTRIBUTION };
