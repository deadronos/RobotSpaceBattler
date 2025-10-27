import { applyCaptaincy } from "../../lib/captainElection";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { getWeaponStats } from "../../lib/weapons";
import { getGridFormationOffset } from "../../lib/formation";
import { createRng } from "../utils/random";
import { addVec3 } from "../utils/vector";
import { BattleWorld, RobotEntity, TeamId, toVec3, WeaponType } from "../world";

const DEFAULT_ROBOTS_PER_TEAM = 10;
function buildRobot(props: {
  team: TeamId;
  spawnIndex: number;
  basePosition: { x: number; z: number };
  weapon: WeaponType;
  offset: number;
}): RobotEntity {
  const { team, spawnIndex, basePosition, weapon, offset } = props;
  const id = `${team}-${spawnIndex}`;
  const heading = team === "red" ? 0 : Math.PI;
  const base = TEAM_CONFIGS[team].spawnCenter;
  const position = addVec3(base, toVec3(basePosition.x, 0, basePosition.z));

  return {
    id,
    kind: "robot",
    team,
    position,
    velocity: toVec3(0, 0, 0),
    orientation: heading,
    weapon,
    fireCooldown: offset,
    fireRate: getWeaponStats(weapon).fireRate,
    health: 100,
    maxHealth: 100,
    ai: { mode: "seek", strafeSign: 1 },
    kills: 0,
    isCaptain: false,
    spawnIndex,
    lastDamageTimestamp: 0,
  };
}

function pickWeapon(index: number): WeaponType {
  const weapons: WeaponType[] = ["laser", "gun", "rocket"];
  return weapons[index % weapons.length];
}

export interface SpawnTeamsOptions {
  seed?: number;
  teamRobotCounts?: Partial<Record<TeamId, number>>;
  onSpawn?: (robot: RobotEntity) => void;
}

export function spawnTeams(
  world: BattleWorld,
  options: SpawnTeamsOptions = {},
): Record<TeamId, RobotEntity[]> {
  const { seed = 1337, teamRobotCounts = {}, onSpawn } = options;
  const rng = createRng(seed);

  const teams: Record<TeamId, RobotEntity[]> = { red: [], blue: [] };

  (["red", "blue"] as TeamId[]).forEach((team) => {
    const robots: RobotEntity[] = [];
    const robotCount = teamRobotCounts[team] ?? DEFAULT_ROBOTS_PER_TEAM;

    if (robotCount <= 0) {
      teams[team] = robots;
      return;
    }

    for (let index = 0; index < robotCount; index += 1) {
      const weapon = pickWeapon(index);
      const weaponStats = getWeaponStats(weapon);
      const offset = 0.2 + rng() * weaponStats.fireRate;
      const displacement = getGridFormationOffset(index, robotCount);
      const robot = buildRobot({
        team,
        spawnIndex: index,
        basePosition: displacement,
        weapon,
        offset,
      });
      world.world.add(robot);
      robots.push(robot);
      onSpawn?.(robot);
    }

    applyCaptaincy(team, robots);
    teams[team] = robots;
  });

  return teams;
}
