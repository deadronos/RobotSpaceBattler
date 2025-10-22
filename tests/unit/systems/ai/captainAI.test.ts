import { beforeEach, describe, expect, it } from 'vitest';

import type { Robot } from '../../../../src/ecs/entities/Robot';
import type { Team } from '../../../../src/types';
import { createTestWorld, type TestWorld } from './testUtils';
import {
  maintainFormations,
  propagateCaptainDirectives,
  reassignCaptain,
} from '../../../../src/ecs/systems/ai/captainAI';

function getTeamRobots(world: TestWorld, team: Team): Robot[] {
  return world.entities.filter((robot) => robot.team === team);
}

describe('captainAI system', () => {
  let world: TestWorld;
  let redTeam: Robot[];
  let blueTeam: Robot[];

  beforeEach(() => {
    world = createTestWorld();
    redTeam = getTeamRobots(world, 'red');
    blueTeam = getTeamRobots(world, 'blue');
  });

  it('propagates captain target priorities to squad members', () => {
    const redCaptain = redTeam.find((robot) => robot.isCaptain)!;
    const target = blueTeam[1];
    redCaptain.aiState.targetId = target.id;

    propagateCaptainDirectives(world);

    redTeam
      .filter((robot) => !robot.isCaptain)
      .forEach((robot) => {
        expect(robot.aiState.targetId).toBe(target.id);
      });
  });

  it('pulls squad members toward their formation offsets', () => {
    const redCaptain = redTeam.find((robot) => robot.isCaptain)!;
    const offsetMember = redTeam.find((robot) => !robot.isCaptain)!;
    offsetMember.position = {
      x: redCaptain.position.x + offsetMember.aiState.formationOffset.x + 20,
      y: 0,
      z: redCaptain.position.z + offsetMember.aiState.formationOffset.z + 20,
    };

    const before = {
      x: offsetMember.position.x - (redCaptain.position.x + offsetMember.aiState.formationOffset.x),
      z: offsetMember.position.z - (redCaptain.position.z + offsetMember.aiState.formationOffset.z),
    };

    maintainFormations(world, 0.5);

    const after = {
      x: offsetMember.position.x - (redCaptain.position.x + offsetMember.aiState.formationOffset.x),
      z: offsetMember.position.z - (redCaptain.position.z + offsetMember.aiState.formationOffset.z),
    };

    expect(Math.abs(after.x)).toBeLessThan(Math.abs(before.x));
    expect(Math.abs(after.z)).toBeLessThan(Math.abs(before.z));
  });

  it('reassigns captaincy to the healthiest remaining robot when leader falls', () => {
    const redCaptain = redTeam.find((robot) => robot.isCaptain)!;
    redCaptain.health = 0;

    const healthiest = redTeam
      .filter((robot) => robot.id !== redCaptain.id)
      .sort((a, b) => b.health - a.health)[0];

    reassignCaptain(world, 'red');

    expect(healthiest.isCaptain).toBe(true);
    expect(world.teams.red.captainId).toBe(healthiest.id);
  });
});
