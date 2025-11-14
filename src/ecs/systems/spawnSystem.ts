import { applyCaptaincy } from "../../lib/captainElection";
import { createXorShift32 } from "../../lib/random/xorshift";
import { TEAM_CONFIGS, TeamId } from "../../lib/teamConfig";
import type { WeaponType } from "../../lib/weapons/types";
import type { LegacyWeaponProfile } from "../../simulation/combat/weapons";
import { getWeaponProfile } from "../../simulation/combat/weapons";
import { BattleWorld, RobotEntity, toVec3 } from "../world";

export interface SpawnOptions {
  seed?: number;
  onRobotSpawn?: (robot: RobotEntity) => void;
}

const WEAPON_TYPES: WeaponType[] = ["laser", "gun", "rocket"];
const BASE_MAX_HEALTH = 100;
const BASE_SPEED = 8;

function buildRobotId(team: TeamId, index: number): string {
  const displayIndex = index + 1;
  return `${team}-${displayIndex}`;
}

function createRobot(
  team: TeamId,
  spawnIndex: number,
  orientation: number,
  strafeSign: 1 | -1,
  profile: LegacyWeaponProfile,
): RobotEntity {
  return {
    id: buildRobotId(team, spawnIndex),
    kind: "robot",
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
      mode: "seek",
      targetId: undefined,
      directive: "balanced",
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
    const randomValue = generator.next();
    const normalizedRandom = randomValue - Math.floor(randomValue);
    const weaponIndex = Math.min(
      Math.floor(normalizedRandom * WEAPON_TYPES.length),
      WEAPON_TYPES.length - 1,
    );
    const weapon = WEAPON_TYPES[weaponIndex];
    const profile = getWeaponProfile(weapon);
    const robot = createRobot(
      team,
      index,
      teamConfig.orientation,
      strafeSign,
      profile,
    );
    robot.position = toVec3(spawnPoint.x, spawnPoint.y, spawnPoint.z);
    robot.fireCooldown = 0;
    world.add(robot);
    options.onRobotSpawn?.(robot);
  });

  const robots = battleWorld.getRobotsByTeam(team);
  applyCaptaincy(team, robots);
}

export function spawnTeams(
  battleWorld: BattleWorld,
  options: SpawnOptions = {},
): void {
  const baseSeed = options.seed ?? Date.now();
  battleWorld.state.seed = baseSeed;

  spawnTeamRobots(battleWorld, "red", baseSeed ^ 0x9e3779b9, options);
  spawnTeamRobots(battleWorld, "blue", baseSeed ^ 0x4f1bbcdc, options);
}
