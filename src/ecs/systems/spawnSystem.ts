import { applyCaptaincy } from '../../lib/captainElection';
import { createXorShift32 } from '../../lib/random/xorshift';
import { TEAM_CONFIGS, TeamId } from '../../lib/teamConfig';
import { BattleWorld, RobotEntity, toVec3,WeaponType } from '../world';

export interface SpawnOptions {
  seed?: number;
}

const WEAPON_ROTATION: WeaponType[] = ['laser', 'gun', 'rocket'];
const INITIAL_FIRE_RATE = 1.2;
const INITIAL_HEALTH = 100;

function buildRobotId(team: TeamId, index: number): string {
  const displayIndex = index + 1;
  return `${team}-${displayIndex}`;
}

function getWeaponForIndex(index: number): WeaponType {
  return WEAPON_ROTATION[index % WEAPON_ROTATION.length];
}

function createRobot(
  team: TeamId,
  spawnIndex: number,
  position: RobotEntity['position'],
  orientation: number,
  strafeSign: 1 | -1,
): RobotEntity {
  return {
    id: buildRobotId(team, spawnIndex),
    kind: 'robot',
    team,
    position: toVec3(position.x, position.y, position.z),
    velocity: toVec3(0, 0, 0),
    orientation,
    weapon: getWeaponForIndex(spawnIndex),
    fireCooldown: 0,
    fireRate: INITIAL_FIRE_RATE,
    health: INITIAL_HEALTH,
    maxHealth: INITIAL_HEALTH,
    ai: {
      mode: 'seek',
      targetId: undefined,
      directive: 'balanced',
      anchorPosition: null,
      anchorDistance: null,
      strafeSign,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex,
    lastDamageTimestamp: 0,
  };
}

function spawnTeamRobots(battleWorld: BattleWorld, team: TeamId, seed: number) {
  const generator = createXorShift32(seed);
  const teamConfig = TEAM_CONFIGS[team];
  const { world } = battleWorld;

  teamConfig.spawnPoints.slice(0, 10).forEach((spawnPoint, index) => {
    const strafeSign = generator.next() >= 0.5 ? 1 : -1;
    const robot = createRobot(team, index, spawnPoint, teamConfig.orientation, strafeSign);
    world.add(robot);
  });

  const robots = battleWorld.getRobotsByTeam(team);
  applyCaptaincy(team, robots);
}

export function spawnTeams(battleWorld: BattleWorld, options: SpawnOptions = {}): void {
  const baseSeed = options.seed ?? Date.now();

  spawnTeamRobots(battleWorld, 'red', baseSeed ^ 0x9e3779b9);
  spawnTeamRobots(battleWorld, 'blue', baseSeed ^ 0x4f1bbcdc);
}
