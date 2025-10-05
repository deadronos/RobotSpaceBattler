import type { Team } from "../ecs/miniplexStore";
import { getScores, incrementScore, resetScores } from "../store/scoreStore";
import type { DeathEvent as DamageDeathEvent } from "../systems/DamageSystem";
import type { StepContext } from "../utils/fixedStepDriver";
import type { DeathAuditEntry,RuntimeEventLog } from "../utils/runtimeEventLog";

function isTeam(value: unknown): value is Team {
  return value === "red" || value === "blue";
}

export type ContractDeathEvent = {
  victimId: string;
  killerId?: string;
  victimTeam: string | number;
  killerTeam?: string | number;
  damageSource?: string;
  simNowMs?: number;
  frameCount?: number;
};

export type ScoringSystemParams = {
  deathEvents: Array<ContractDeathEvent | DamageDeathEvent>;
  stepContext: StepContext;
  runtimeEventLog?: RuntimeEventLog;
  scoreBoard?: { scores: Record<string, number>; lastUpdatedMs: number };
  idFactory?: () => string;
};

let internalSeq = 0;

export function scoringSystem(params: ScoringSystemParams) {
  const { deathEvents, stepContext, runtimeEventLog, scoreBoard, idFactory } =
    params;

  for (const rawDeath of deathEvents) {
    const raw = rawDeath as Record<string, unknown>;
    const victimId = String(raw.victimId ?? raw.entityId ?? "");
    const killerId = raw.killerId !== undefined ? String(raw.killerId) : undefined;
    const victimTeam = (raw.victimTeam ?? raw.team) as string | number;
    const killerTeam = (raw.killerTeam ?? raw.killerTeam) as string | number | undefined;

    const simNowMs = Number(raw.simNowMs ?? stepContext.simNowMs);
    const frameCount = Number(raw.frameCount ?? stepContext.frameCount);

    let classification: DeathAuditEntry["classification"] = "opponent";
    let scoreDelta = 0;

    if (killerId === undefined || killerId === "") {
      // Environmental death - no score changes
      classification = "opponent";
      scoreDelta = 0;
    } else if (killerId === victimId) {
      classification = "suicide";
      scoreDelta = -1;
    } else if (killerTeam !== undefined && killerTeam === victimTeam) {
      classification = "friendly-fire";
      scoreDelta = -1;
    } else {
      classification = "opponent";
      scoreDelta = 1;
    }

    // Apply score changes: prefer injected scoreBoard for tests, otherwise use global store
    if (scoreDelta !== 0) {
      if (scoreBoard) {
        const teamKey = (classification === "suicide" ? victimTeam : killerTeam) as string;
        if (teamKey) {
          scoreBoard.scores[teamKey] = (scoreBoard.scores[teamKey] ?? 0) + scoreDelta;
          scoreBoard.lastUpdatedMs = simNowMs;
        }
      } else {
        // Use store helpers when no injected scoreboard is present
        if (classification === "suicide") {
          if (isTeam(victimTeam)) incrementScore(victimTeam, scoreDelta);
        } else if (killerTeam && isTeam(killerTeam)) {
          incrementScore(killerTeam as Team, scoreDelta);
        }
      }
    }

    // Create deterministic id: prefer idFactory, but sanitize to integer ms if necessary
    let id: string;
    if (idFactory) {
      const raw = idFactory();
      if (/^\d+-\d+-\d+$/.test(raw)) {
        id = raw;
      } else {
        // Attempt to coerce the middle segment (simNowMs) to integer for deterministic IDs
        const parts = raw.split("-");
        if (parts.length >= 3 && !Number.isNaN(Number(parts[1]))) {
          parts[1] = String(Math.round(Number(parts[1])));
          id = parts.slice(0, 3).join("-");
        } else {
          id = `${stepContext.frameCount}-${Math.round(stepContext.simNowMs)}-${++internalSeq}`;
        }
      }
    } else {
      id = `${frameCount}-${Math.round(simNowMs)}-${++internalSeq}`;
    }

    const entry: DeathAuditEntry = {
      id,
      simNowMs,
      frameCount,
      victimId,
      killerId,
      victimTeam,
      killerTeam,
      classification,
      scoreDelta,
    };

    if (runtimeEventLog) {
      runtimeEventLog.append(entry);
    }
  }
}

export { getScores, resetScores };
