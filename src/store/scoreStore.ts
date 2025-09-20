import { create } from 'zustand';

import type { Team } from '../ecs/miniplexStore';

type ScoreMap = Record<Team, number>;

interface ScoreState {
  scores: ScoreMap;
}

const INITIAL_SCORES: ScoreMap = { red: 0, blue: 0 };

export const useScoreStore = create<ScoreState>(() => ({
  scores: { ...INITIAL_SCORES },
}));

export function incrementScore(team: Team, delta = 1) {
  useScoreStore.setState((state) => {
    const current = state.scores[team] ?? 0;
    return {
      scores: {
        ...state.scores,
        [team]: current + delta,
      },
    };
  });
}

export function resetScores() {
  useScoreStore.setState({ scores: { ...INITIAL_SCORES } });
}

export function getScores(): ScoreMap {
  const { scores } = useScoreStore.getState();
  return { ...scores };
}
