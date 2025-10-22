import { describe, it, expect } from 'vitest';
import { capturePostBattleStats } from '../../../src/ecs/systems/statsSystem';
import {
  clearVictoryState,
  createInitialSimulationState,
  setVictoryState,
} from '../../../src/ecs/entities/SimulationState';

const createRobots = () =>
  [
    {
      id: 'r1',
      stats: {
        kills: 2,
        damageDealt: 40,
        damageTaken: 10,
        timeAlive: 12,
        shotsFired: 5,
      },
    },
    {
      id: 'r2',
      stats: {
        kills: 0,
        damageDealt: 0,
        damageTaken: 40,
        timeAlive: 3,
        shotsFired: 1,
      },
    },
  ] as any;

const createTeams = () =>
  ({
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
  }) as any;

describe('statsSystem.capturePostBattleStats', () => {
  it('captures per-robot and per-team stats when simulation reaches victory', () => {
    const robots = createRobots();
    const teams = createTeams();

    let simulation = createInitialSimulationState();
    simulation.simulationTime = 1.23;
    simulation = setVictoryState(simulation, 'red', simulation.simulationTime);

    const snapped = capturePostBattleStats({ robots, teams, simulation });
    expect(snapped.postBattleStats).toBeDefined();
    expect(snapped.postBattleStats!.perRobot['r1'].kills).toBe(2);
    expect(snapped.postBattleStats!.perTeam.red.totalKills).toBe(2);

    robots[0].stats.kills = 99;
    const snappedAgain = capturePostBattleStats({
      robots,
      teams,
      simulation: snapped,
    });
    expect(snappedAgain.postBattleStats!.perRobot['r1'].kills).toBe(2);
  });

  it('creates immutable team snapshots including weapon distribution', () => {
    const robots = createRobots();
    const teams = createTeams();

    let simulation = createInitialSimulationState();
    simulation.simulationTime = 2.5;
    simulation = setVictoryState(simulation, 'red', simulation.simulationTime);

    const snapped = capturePostBattleStats({ robots, teams, simulation });
    const before = snapped.postBattleStats!.perTeam.red.weaponDistribution.laser;

    teams.red.aggregateStats.weaponDistribution.laser = 99;

    expect(snapped.postBattleStats!.perTeam.red.weaponDistribution.laser).toBe(
      before,
    );
    expect(teams.red.aggregateStats.weaponDistribution.laser).toBe(99);
  });

  it('captures new stats when a subsequent match reaches victory', () => {
    const robotsRoundOne = createRobots();
    const teamsRoundOne = createTeams();

    let simulation = createInitialSimulationState();
    simulation.simulationTime = 10;
    simulation = setVictoryState(simulation, 'red', simulation.simulationTime);

    const afterFirst = capturePostBattleStats({
      robots: robotsRoundOne,
      teams: teamsRoundOne,
      simulation,
    });
    const firstSnapshot = afterFirst.postBattleStats!;

    const resetState = clearVictoryState(afterFirst);
    resetState.simulationTime = 24;
    const nextVictoryState = setVictoryState(
      resetState,
      'blue',
      resetState.simulationTime,
    );

    const robotsRoundTwo = [
      {
        id: 'r1',
        stats: {
          kills: 5,
          damageDealt: 90,
          damageTaken: 5,
          timeAlive: 18,
          shotsFired: 12,
        },
      },
      {
        id: 'r2',
        stats: {
          kills: 1,
          damageDealt: 30,
          damageTaken: 25,
          timeAlive: 11,
          shotsFired: 6,
        },
      },
    ] as any;

    const teamsRoundTwo = {
      red: {
        aggregateStats: {
          totalKills: 1,
          totalDamageDealt: 35,
          totalDamageTaken: 95,
          averageHealthRemaining: 20,
          weaponDistribution: { laser: 0, gun: 1, rocket: 1 },
        },
      },
      blue: {
        aggregateStats: {
          totalKills: 6,
          totalDamageDealt: 120,
          totalDamageTaken: 30,
          averageHealthRemaining: 75,
          weaponDistribution: { laser: 2, gun: 0, rocket: 0 },
        },
      },
    } as any;

    const afterSecond = capturePostBattleStats({
      robots: robotsRoundTwo,
      teams: teamsRoundTwo,
      simulation: nextVictoryState,
    });
    const secondSnapshot = afterSecond.postBattleStats!;

    expect(secondSnapshot).not.toBe(firstSnapshot);
    expect(secondSnapshot.computedAt).toBe(
      nextVictoryState.victoryScreenStartTime,
    );
    expect(secondSnapshot.perTeam.blue.totalKills).toBe(6);
    expect(secondSnapshot.perRobot['r1'].kills).toBe(5);
    expect(secondSnapshot.perTeam.red.totalKills).toBe(1);
  });
});
