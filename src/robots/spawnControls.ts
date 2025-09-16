import { createRobotEntity, resetWorld, world, type Entity, type Team, type Vec3 } from '../ecs/miniplexStore';
import type { WeaponComponent, WeaponStateComponent, WeaponType } from '../ecs/weapons';

export const DEFAULT_TEAM_SIZE = 10;
const GRID_COLUMNS = 5;
const GRID_SPACING = 2;
const BASE_HEIGHT = 0.6;

const TEAM_BASES: Record<Team, Vec3> = {
  red: [-8, BASE_HEIGHT, -6],
  blue: [8, BASE_HEIGHT, 6],
};

const WEAPON_PROFILES: Record<WeaponType, Pick<WeaponComponent, 'range' | 'cooldown' | 'power' | 'accuracy' | 'spread' | 'ammo' | 'aoeRadius' | 'beamParams' | 'flags'>> = {
  gun: {
    range: 15,
    cooldown: 0.5,
    power: 15,
    accuracy: 0.8,
    spread: 0.1,
    ammo: { clip: 10, clipSize: 10, reserve: 50 },
    aoeRadius: undefined,
    beamParams: undefined,
    flags: undefined,
  },
  laser: {
    range: 25,
    cooldown: 1.5,
    power: 8,
    accuracy: 0.95,
    spread: 0,
    ammo: undefined,
    aoeRadius: undefined,
    beamParams: { duration: 1000, width: 0.1, tickInterval: 100 },
    flags: { continuous: true },
  },
  rocket: {
    range: 20,
    cooldown: 2,
    power: 25,
    accuracy: 0.7,
    spread: 0,
    ammo: undefined,
    aoeRadius: 3,
    beamParams: undefined,
    flags: undefined,
  },
};

function countTeamRobots(team: Team) {
  let total = 0;

  for (const entity of world.entities) {
    if (entity.team !== team) continue;
    if ((entity as { projectile?: unknown }).projectile) continue;
    if ((entity as { beam?: unknown }).beam) continue;

    total += 1;
  }

  return total;
}

function computeGridPosition(team: Team, index: number): Vec3 {
  const [baseX, baseY, baseZ] = TEAM_BASES[team];
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);

  const direction = team === 'red' ? 1 : -1;

  return [
    baseX + column * GRID_SPACING * direction,
    baseY,
    baseZ + row * GRID_SPACING * direction,
  ];
}

function configureWeapon(
  robot: Entity,
  team: Team,
  weaponType: WeaponType,
  index: number
): WeaponComponent {
  const profile = WEAPON_PROFILES[weaponType];
  const ownerId = robot.id as number;

  return {
    id: `weapon_${team}_${weaponType}_${index}`,
    type: weaponType,
    ownerId,
    team,
    ...profile,
  };
}

function createWeaponState(): WeaponStateComponent {
  return {
    firing: false,
    reloading: false,
    cooldownRemaining: 0,
  };
}

export function spawnRobot(
  team: Team,
  weaponType: WeaponType,
  options: { position?: Vec3; indexOverride?: number } = {}
) {
  const spawnIndex = options.indexOverride ?? countTeamRobots(team);
  const position = options.position ?? computeGridPosition(team, spawnIndex);

  const robot = createRobotEntity({
    team,
    position,
  }) as Entity & { weapon?: WeaponComponent; weaponState?: WeaponStateComponent };

  robot.weapon = configureWeapon(robot, team, weaponType, spawnIndex);
  robot.weaponState = createWeaponState();

  return robot;
}

export function spawnTeam(
  team: Team,
  loadout: WeaponType[],
  count = DEFAULT_TEAM_SIZE
) {
  const created: Entity[] = [];
  let spawnIndex = countTeamRobots(team);

  for (let i = 0; i < count; i += 1) {
    const weaponType = loadout[i % loadout.length];
    created.push(spawnRobot(team, weaponType, { indexOverride: spawnIndex }));
    spawnIndex += 1;
  }

  return created;
}

export function resetAndSpawnDefaultTeams() {
  resetWorld();
  spawnTeam('red', ['gun', 'laser', 'rocket']);
  spawnTeam('blue', ['rocket', 'gun', 'laser']);
}

