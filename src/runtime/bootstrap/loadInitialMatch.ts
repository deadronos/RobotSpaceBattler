import { TeamId } from "../../ecs/world";

export interface InitialMatchTeamConfig {
  id: TeamId;
  robotCount: number;
}

export interface InitialMatchPayload {
  matchId: string;
  seed: number;
  teams: InitialMatchTeamConfig[];
}

function assertInitialMatchPayload(
  value: unknown,
): asserts value is InitialMatchPayload {
  if (!value || typeof value !== "object") {
    throw new Error("Initial match payload is not an object");
  }

  const payload = value as Record<string, unknown>;
  if (typeof payload.matchId !== "string") {
    throw new Error("Initial match payload is missing a matchId string");
  }

  if (typeof payload.seed !== "number" || Number.isNaN(payload.seed)) {
    throw new Error("Initial match payload is missing a numeric seed");
  }

  if (!Array.isArray(payload.teams)) {
    throw new Error("Initial match payload teams must be an array");
  }

  payload.teams.forEach((team, index) => {
    if (!team || typeof team !== "object") {
      throw new Error(
        `Initial match payload team at index ${index} is not an object`,
      );
    }

    const teamRecord = team as Record<string, unknown>;
    if (teamRecord.id !== "red" && teamRecord.id !== "blue") {
      throw new Error(
        `Initial match payload team id at index ${index} is invalid`,
      );
    }

    if (
      typeof teamRecord.robotCount !== "number" ||
      teamRecord.robotCount < 0
    ) {
      throw new Error(
        `Initial match payload team robotCount at index ${index} is invalid`,
      );
    }
  });
}

export async function loadInitialMatch({
  signal,
}: {
  signal?: AbortSignal;
} = {}): Promise<InitialMatchPayload> {
  const response = await fetch("/assets/data/initial-match.json", { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to load initial match (${response.status} ${response.statusText})`,
    );
  }

  const payload = (await response.json()) as unknown;
  assertInitialMatchPayload(payload);
  return payload;
}
