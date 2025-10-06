import { updateTeamCounts, updateTeamStats, type TeamEntity } from '../entities/Team';
import type { Team } from '../../types';
import type { WorldView } from './worldTypes';
import type { WeaponType } from '../../types';

export function refreshTeamStats(world: WorldView, teams: Team[]): void {
  teams.forEach((team) => {
    const robots = world.entities.filter((robot) => robot.team === team);
    world.teams[team] = updateTeamCounts(world.teams[team], robots.length);
    const healthValues = robots.map((robot) => robot.health);
    const weapons: Record<string, WeaponType> = {};
    robots.forEach((robot) => {
      weapons[robot.id] = robot.weaponType;
    });
    world.teams[team] = updateTeamStats(world.teams[team], healthValues, weapons);
  });
}

