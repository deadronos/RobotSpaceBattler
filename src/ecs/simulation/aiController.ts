import type { Team } from '../../types';
import type { Robot } from '../entities/Robot';
import { applyAdaptiveStrategy } from '../systems/ai/adaptiveStrategy';
import { maintainFormations, propagateCaptainDirectives } from '../systems/ai/captainAI';
import { applyIndividualMovement, evaluateIndividualBehaviors } from '../systems/ai/individualAI';
import { getAliveRobots as getAliveRobotsInternal } from '../systems/ai/common';
import type { WorldView } from './worldTypes';

export function getAliveRobots(world: WorldView, team?: Team): Robot[] {
  return getAliveRobotsInternal(world, team);
}

export function updateBehaviors(world: WorldView): void {
  evaluateIndividualBehaviors(world);
  applyAdaptiveStrategy(world);
}

export function propagateCaptainTargets(world: WorldView): void {
  propagateCaptainDirectives(world);
}

export function applyMovement(world: WorldView, deltaTime: number): void {
  applyIndividualMovement(world, deltaTime);
  maintainFormations(world, deltaTime);
}
