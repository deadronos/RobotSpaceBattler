import { describe, expect, it } from 'vitest';

const sampleSnapshot = {
  teams: [
    {
      name: 'red',
      label: 'Red Team',
      activeRobots: 0,
      eliminatedRobots: 10,
      captainId: 'r-01',
      weaponDistribution: { laser: 4, gun: 3, rocket: 3 },
    },
    {
      name: 'blue',
      label: 'Blue Team',
      activeRobots: 5,
      eliminatedRobots: 5,
      captainId: 'b-07',
      weaponDistribution: { laser: 3, gun: 4, rocket: 3 },
    },
  ],
  robots: [
    {
      id: 'r-01',
      name: 'R-01',
      team: 'red',
      weaponType: 'rocket',
      stats: {
        kills: 2,
        damageDealt: 180,
        damageTaken: 420,
        timeAliveSeconds: 95,
      },
      isCaptain: true,
    },
    {
      id: 'b-07',
      name: 'B-07',
      team: 'blue',
      weaponType: 'laser',
      stats: {
        kills: 4,
        damageDealt: 360,
        damageTaken: 80,
        timeAliveSeconds: 200,
      },
      isCaptain: true,
    },
    {
      id: 'b-09',
      name: 'B-09',
      team: 'blue',
      weaponType: 'gun',
      stats: {
        kills: 2,
        damageDealt: 210,
        damageTaken: 120,
        timeAliveSeconds: 160,
      },
      isCaptain: false,
    },
  ],
  simulation: {
    status: 'victory',
    winner: 'blue',
    simulationTime: 245,
    autoRestartCountdown: 3,
  },
  performance: {
    currentFPS: 22,
    averageFPS: 24,
    qualityScalingActive: true,
    autoScalingEnabled: true,
  },
} as const;

describe('uiSelectors', () => {
  it('builds team summaries with captain metadata', async () => {
    const { buildTeamSummaries } = await import('../../../src/selectors/uiSelectors');
    const summaries = buildTeamSummaries(sampleSnapshot);

    expect(summaries).toEqual([
      {
        teamId: 'red',
        label: 'Red Team',
        alive: 0,
        eliminated: 10,
        weaponDistribution: { laser: 4, gun: 3, rocket: 3 },
        captain: { id: 'r-01', name: 'R-01', alive: false },
      },
      {
        teamId: 'blue',
        label: 'Blue Team',
        alive: 5,
        eliminated: 5,
        weaponDistribution: { laser: 3, gun: 4, rocket: 3 },
        captain: { id: 'b-07', name: 'B-07', alive: true },
      },
    ]);
  });

  it('builds robot stat rows sorted by kills then damage dealt', async () => {
    const { buildRobotStatRows } = await import('../../../src/selectors/uiSelectors');
    const rows = buildRobotStatRows(sampleSnapshot);

    expect(rows.map((row) => row.id)).toEqual(['b-07', 'b-09', 'r-01']);
    expect(rows[0]).toMatchObject({
      id: 'b-07',
      kills: 4,
      damageDealt: 360,
      damageTaken: 80,
      timeAliveSeconds: 200,
      isCaptain: true,
    });
  });

  it('formats countdown strings with leading zeros', async () => {
    const { formatCountdownLabel } = await import('../../../src/selectors/uiSelectors');
    expect(formatCountdownLabel(5)).toBe('Restarts in 05s');
    expect(formatCountdownLabel(null)).toBe('Auto-restart paused');
  });
});
