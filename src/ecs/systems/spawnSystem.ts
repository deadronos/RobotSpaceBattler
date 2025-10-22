import { applyCaptaincy } from "../../lib/captainElection";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { getWeaponStats } from "../../lib/weapons";
import { createRng } from "../utils/random";
import { addVec3 } from "../utils/vector";
import { BattleWorld, RobotEntity, TeamId, toVec3, WeaponType } from "../world";

const robotCountPerTeam = 10;
const formationSpacing = 2.4;
const rows = 2;

function formationOffset(index: number): { x: number; z: number } {
  const row = Math.floor(index / (robotCountPerTeam / rows));
  const column = index % (robotCountPerTeam / rows);
  const centeredColumn = column - (robotCountPerTeam / rows - 1) / 2;
  return {
    x: centeredColumn * formationSpacing,
    z: row * formationSpacing,
  };
}

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
    ai: { mode: "seek" },
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

export function spawnTeams(world: BattleWorld, seed = 1337): void {
  const rng = createRng(seed);

  (["red", "blue"] as TeamId[]).forEach((team) => {
    const robots: RobotEntity[] = [];

    for (let index = 0; index < robotCountPerTeam; index += 1) {
      const weapon = pickWeapon(index);
      const weaponStats = getWeaponStats(weapon);
      const offset = 0.2 + rng() * weaponStats.fireRate;
      const displacement = formationOffset(index);
      const robot = buildRobot({
        team,
        spawnIndex: index,
        basePosition: displacement,
        weapon,
        offset,
      });
      world.world.add(robot);
      robots.push(robot);
    }

    applyCaptaincy(team, robots);
  });
}
