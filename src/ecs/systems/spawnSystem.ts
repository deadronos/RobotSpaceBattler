import { applyCaptaincy } from '../../lib/captainElection';
import { createXorShift32 } from '../../lib/random/xorshift';
import { TEAM_CONFIGS, TeamId } from '../../lib/teamConfig';
import { getWeaponProfile, WeaponProfile } from '../../simulation/combat/weapons';
import { BattleWorld, RobotEntity, toVec3, WeaponType } from '../world';

/**
 * Options for spawning robots.
 */
export interface SpawnOptions {
  /** The random seed for the match. */
  seed?: number;
  /** Callback triggered when a robot is spawned. */
  onRobotSpawn?: (robot: RobotEntity) => void;
}

const WEAPON_ROTATION: WeaponType[] = ['laser', 'gun', 'rocket'];
const BASE_MAX_HEALTH = 100;
const BASE_SPEED = 8;

/**
 * Generates a unique ID for a robot.
 * @param team - The team ID.
 * @param index - The robot's index within the team.
 * @returns A string ID.
 */
function buildRobotId(team: TeamId, index: number): string {
  const displayIndex = index + 1;
  return `${team}-${displayIndex}`;
}

/**
 * Determines the weapon for a robot based on its spawn index.
 * Cyclically rotates through available weapon types.
 * @param index - The spawn index.
 * @returns The WeaponType.
 */
function getWeaponForIndex(index: number): WeaponType {
  return WEAPON_ROTATION[index % WEAPON_ROTATION.length];
}

/**
 * Creates a new robot entity with initial stats.
 * @param team - The team ID.
 * @param spawnIndex - The robot's spawn index.
 * @param orientation - Initial facing direction.
 * @param strafeSign - Initial strafing direction preference.
 * @param profile - Weapon profile.
 * @returns A new RobotEntity.
 */
function createRobot(
  team: TeamId,
  spawnIndex: number,
  orientation: number,
  strafeSign: 1 | -1,
  profile: WeaponProfile,
): RobotEntity {
  return {
    id: buildRobotId(team, spawnIndex),
    kind: 'robot',
    team,
    position: toVec3(0, 0, 0),
    velocity: toVec3(0, 0, 0),
    orientation,
    speed: BASE_SPEED,
    weapon: profile.type,
    fireCooldown: 0,
    fireRate: profile.fireRate,
    health: BASE_MAX_HEALTH,
    maxHealth: BASE_MAX_HEALTH,
    ai: {
      mode: 'seek',
      targetId: undefined,
      directive: 'balanced',
      anchorPosition: null,
      anchorDistance: profile.range,
      strafeSign,
      targetDistance: null,
      visibleEnemyIds: [],
      enemyMemory: {},
      searchPosition: null,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex,
    lastDamageTimestamp: 0,
  };
}

/**
 * Spawns all robots for a specific team.
 * @param battleWorld - The battle world.
 * @param team - The team ID.
 * @param seed - The seed for randomization.
 * @param options - Spawn options.
 */
function spawnTeamRobots(
  battleWorld: BattleWorld,
  team: TeamId,
  seed: number,
  options: SpawnOptions,
) {
  const generator = createXorShift32(seed);
  const teamConfig = TEAM_CONFIGS[team];
  const { world } = battleWorld;

  teamConfig.spawnPoints.slice(0, 10).forEach((spawnPoint, index) => {
    const strafeSign = generator.next() >= 0.5 ? 1 : -1;
    const weapon = getWeaponForIndex(index);
    const profile = getWeaponProfile(weapon);
    const robot = createRobot(team, index, teamConfig.orientation, strafeSign, profile);
    robot.position = toVec3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    robot.fireCooldown = 0;
    world.add(robot);
    options.onRobotSpawn?.(robot);
  });

  const robots = battleWorld.getRobotsByTeam(team);
  applyCaptaincy(team, robots);
}

/**
 * Initializes the battle by spawning teams and setting up the initial state.
 * @param battleWorld - The battle world.
 * @param options - Configuration options for spawning.
 */
export function spawnTeams(battleWorld: BattleWorld, options: SpawnOptions = {}): void {
  const baseSeed = options.seed ?? Date.now();
  battleWorld.state.seed = baseSeed;

  spawnTeamRobots(battleWorld, 'red', baseSeed ^ 0x9e3779b9, options);
  spawnTeamRobots(battleWorld, 'blue', baseSeed ^ 0x4f1bbcdc, options);
}
