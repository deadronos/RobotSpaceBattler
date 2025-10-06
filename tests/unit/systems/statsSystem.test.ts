import { describe, it, expect } from 'vitest';
import { capturePostBattleStats } from '../../../src/ecs/systems/statsSystem';
import { createInitialSimulationState } from '../../../src/ecs/entities/SimulationState';

describe('statsSystem.capturePostBattleStats', () => {
  it('captures per-robot and per-team stats when simulation reaches victory', () => {
    const robots = [
      { id: 'r1', stats: { kills: 2, damageDealt: 40, damageTaken: 10, timeAlive: 12, shotsFired: 5 } },
      { id: 'r2', stats: { kills: 0, damageDealt: 0, damageTaken: 40, timeAlive: 3, shotsFired: 1 } },
    ] as any;

    const teams = {
      red: {
        aggregateStats: {
          totalKills: 2,
          totalDamageDealt: 40,
          totalDamageTaken: 10,
          averageHealthRemaining: 50,
          weaponDistribution: { laser: 1, gun: 0, rocket: 0 },
        },
      },
      blue: {
        aggregateStats: {
          totalKills: 0,
          totalDamageDealt: 0,
          totalDamageTaken: 40,
          averageHealthRemaining: 0,
          weaponDistribution: { laser: 0, gun: 0, rocket: 0 },
        },
      },
    } as any;

    let simulation = createInitialSimulationState();
    simulation.status = 'victory';
    simulation.simulationTime = 1.23;

    const snapped = capturePostBattleStats({ robots, teams, simulation });
    expect(snapped.postBattleStats).toBeDefined();
    expect(snapped.postBattleStats!.perRobot['r1'].kills).toBe(2);
    expect(snapped.postBattleStats!.perTeam.red.totalKills).toBe(2);

    // Mutating source after snapshot should not change the captured snapshot
    robots[0].stats.kills = 99;
    const snappedAgain = capturePostBattleStats({ robots, teams, simulation: snapped });
    expect(snappedAgain.postBattleStats!.perRobot['r1'].kills).toBe(2);
  });
});
