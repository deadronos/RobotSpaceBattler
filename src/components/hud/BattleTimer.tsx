import type { BattleHudStatusInfo } from "../../hooks/useBattleHudData";

export interface BattleTimerProps {
  status: BattleHudStatusInfo;
}

function formatElapsed(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  const padded = remainder.toString().padStart(2, "0");

  if (minutes <= 0) {
    return `${padded}s`;
  }

  return `${minutes}:${padded}`;
}

export function BattleTimer({ status }: BattleTimerProps) {
  const elapsedLabel = formatElapsed(status.elapsedSeconds);
  const countdownLabel = status.countdownLabel;

  return (
    <div className="battle-timer" role="group" aria-label="Battle timers">
      <span className="battle-timer__elapsed" aria-label="Elapsed time">
        Elapsed: {elapsedLabel}
      </span>

      {countdownLabel ? (
        <span
          className="battle-timer__countdown"
          role="status"
          aria-live="polite"
          data-paused={status.countdownPaused ? "true" : "false"}
        >
          {countdownLabel}
          {status.countdownPaused ? " (paused)" : ""}
        </span>
      ) : null}
    </div>
  );
}

export default BattleTimer;
