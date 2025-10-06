import { createRobot, type Robot } from '../entities/Robot';
import { updateTeamCaptain } from '../entities/Team';
import { setRobotBodyPosition } from '../simulation/physics';
import { refreshTeamStats } from '../simulation/teamStats';
import type { WorldView } from '../simulation/worldTypes';
import { cloneVector, subtractVectors } from '../utils/vector';
import type { AIState, Team, Vector3, WeaponType } from '../../types';

export const WEAPON_DISTRIBUTION: Record<Team, WeaponType[]> = {
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

function assignCaptain(world: WorldView, team: Team, robots: Robot[]): void {
  const [captain] = robots;
  robots.forEach((robot, index) => {
    robot.isCaptain = index === 0;
  });
  world.teams[team] = updateTeamCaptain(world.teams[team], captain ? captain.id : null);
}

export function spawnTeam(world: WorldView, team: Team): Robot[] {
  const spawnZone = world.arena.spawnZones[team];
  const weapons = WEAPON_DISTRIBUTION[team];
  const robots: Robot[] = [];

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

    robots.push(robot);
    world.entities.push(robot);
    world.ecs?.robots.add(robot);
    setRobotBodyPosition(world.physics, robot, robot.position);
  });

  assignCaptain(world, team, robots);
  return robots;
}

export function spawnInitialTeams(world: WorldView, teams: Team[]): Robot[] {
  const spawned: Robot[] = [];
  teams.forEach((team) => {
    spawned.push(...spawnTeam(world, team));
  });
  refreshTeamStats(world, teams);
  return spawned;
}
