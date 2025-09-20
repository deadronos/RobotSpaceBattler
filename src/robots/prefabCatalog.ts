import { ROBOT_BASE_STATS } from '../ecs/miniplexStore';
import type { WeaponType } from '../ecs/weapons';
import { weaponProfiles } from './weaponProfiles';

export interface RobotPrefabDefinition {
  id: string;
  label: string;
  weaponType: WeaponType;
  summary: string;
  stats: {
    hp: number;
    speed: number;
    range: number;
    cooldown: number;
    power: number;
    accuracy?: number;
  };
}

const baseStats = {
  hp: ROBOT_BASE_STATS.hp ?? 100,
  speed: ROBOT_BASE_STATS.speed ?? 3,
};

export const robotPrefabs: RobotPrefabDefinition[] = [
  {
    id: 'gunner',
    label: 'Autocannon Gunner',
    weaponType: 'gun',
    summary: 'Rapid-fire frontline unit with short cooldown bursts.',
    stats: {
      ...baseStats,
      range: weaponProfiles.gun.range,
      cooldown: weaponProfiles.gun.cooldown,
      power: weaponProfiles.gun.power,
      accuracy: weaponProfiles.gun.accuracy,
    },
  },
  {
    id: 'laser',
    label: 'Beam Support',
    weaponType: 'laser',
    summary: 'Precision beam that maintains pressure at long range.',
    stats: {
      ...baseStats,
      range: weaponProfiles.laser.range,
      cooldown: weaponProfiles.laser.cooldown,
      power: weaponProfiles.laser.power,
      accuracy: weaponProfiles.laser.accuracy,
    },
  },
  {
    id: 'rocket',
    label: 'Rocket Artillery',
    weaponType: 'rocket',
    summary: 'Slow-firing AoE rocket for clustered targets.',
    stats: {
      ...baseStats,
      range: weaponProfiles.rocket.range,
      cooldown: weaponProfiles.rocket.cooldown,
      power: weaponProfiles.rocket.power,
      accuracy: weaponProfiles.rocket.accuracy,
    },
  },
];

export function getRobotPrefabById(id: string) {
  return robotPrefabs.find((prefab) => prefab.id === id);
}
