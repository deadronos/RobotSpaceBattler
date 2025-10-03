import { normalizeTeam } from "./id";

export interface TeamScoreDelta {
  team: string | number;
  delta: number;
  simNowMs: number;
}

export interface ScoreBoard {
  scores: Record<string, number>;
  lastUpdatedMs: number;
}

export function createScoreBoard(): ScoreBoard {
  return {
    scores: { red: 0, blue: 0 },
    lastUpdatedMs: 0,
  };
}

export function applyScoreDelta(board: ScoreBoard, delta: TeamScoreDelta) {
  const team = normalizeTeam(delta.team);
  const current = board.scores[team] ?? 0;
  board.scores[team] = current + delta.delta;
  board.lastUpdatedMs = delta.simNowMs;
}
