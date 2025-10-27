import { FormEvent, useMemo, useState } from "react";

import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { InitialMatchPayload } from "../../runtime/bootstrap/loadInitialMatch";
import { useSimulationStore } from "../../state/simulationStore";
import {
  selectTeamTotals,
  selectTopRobots,
  useTelemetryStore,
} from "../../state/telemetryStore";
import { useHudStore } from "../../state/ui/hudStore";

const overlayStyle: React.CSSProperties = {
  pointerEvents: "auto",
  minWidth: "420px",
  padding: "20px 24px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(14, 20, 44, 0.92) 0%, rgba(4, 7, 18, 0.94) 100%)",
  border: "1px solid rgba(123, 156, 255, 0.3)",
  boxShadow: "0 28px 46px rgba(4, 6, 18, 0.65)",
  color: "#ecf0ff",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const sectionStyle: React.CSSProperties = {
  padding: "16px",
  borderRadius: "14px",
  background: "rgba(10, 14, 34, 0.85)",
  border: "1px solid rgba(118, 150, 255, 0.15)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#8e9eff",
  marginBottom: "8px",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  border: "none",
  borderRadius: "12px",
  padding: "10px 16px",
  fontWeight: 600,
  cursor: "pointer",
  background: "linear-gradient(180deg, #4a68ff 0%, #2b3fe6 100%)",
  color: "#f5f7ff",
  flex: "1 1 auto",
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: "rgba(74, 88, 140, 0.7)",
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "8px",
};

interface MatchConfigFormState {
  red: number;
  blue: number;
  seed: number;
}

const clampRobots = (value: number) =>
  Math.min(20, Math.max(4, Math.floor(value)));

function VictoryOverlay() {
  const winner = useSimulationStore((state) => state.winner);
  const restartTimer = useSimulationStore((state) => state.restartTimer);
  const elapsedMs = useSimulationStore((state) => state.elapsedMs);
  const initialMatch = useSimulationStore((state) => state.initialMatch);
  const initialize = useSimulationStore((state) => state.initialize);
  const setRestartTimer = useSimulationStore((state) => state.setRestartTimer);
  const setPhase = useSimulationStore((state) => state.setPhase);
  const toggleHud = useHudStore((state) => state.toggleHud);

  const [showStats, setShowStats] = useState(true);
  const [config, setConfig] = useState<MatchConfigFormState>(() => ({
    red: initialMatch?.teams.find((team) => team.id === "red")?.robotCount ?? 10,
    blue:
      initialMatch?.teams.find((team) => team.id === "blue")?.robotCount ?? 10,
    seed: initialMatch?.seed ?? 1337,
  }));

  const topRobots = useTelemetryStore(selectTopRobots(4));
  const redTotals = useTelemetryStore(selectTeamTotals("red"));
  const blueTotals = useTelemetryStore(selectTeamTotals("blue"));

  const winnerName = winner ? TEAM_CONFIGS[winner].name : "Unknown";
  const countdownSeconds =
    restartTimer !== null ? Math.max(0, restartTimer / 1000).toFixed(1) : null;

  const handleConfigChange = (team: "red" | "blue") => (value: number) => {
    setConfig((prev) => ({ ...prev, [team]: clampRobots(value) }));
  };

  const handleSeedChange = (value: number) => {
    setConfig((prev) => ({ ...prev, seed: value }));
  };

  const handleApplyConfig = (event: FormEvent) => {
    event.preventDefault();
    const payload: InitialMatchPayload = {
      matchId: `custom-${Date.now()}`,
      seed: Number.isNaN(config.seed) ? 1337 : config.seed,
      teams: [
        { id: "red", robotCount: clampRobots(config.red) },
        { id: "blue", robotCount: clampRobots(config.blue) },
      ],
    };
    initialize(payload);
    setRestartTimer(0);
    setPhase("initializing");
  };

  const stats = useMemo(
    () =>
      topRobots.map((robot) => ({
        ...robot,
        teamName: TEAM_CONFIGS[robot.teamId].name,
      })),
    [topRobots],
  );

  return (
    <div style={overlayStyle}>
      <div>
        <div style={{ fontSize: "12px", letterSpacing: "0.16em", color: "#8aa7ff" }}>
          Match Complete
        </div>
        <div style={{ fontSize: "24px", fontWeight: 700, marginTop: "4px" }}>
          {winnerName} Victory
        </div>
        <div style={{ fontSize: "13px", color: "#aebdff" }}>
          Elapsed {Math.round(elapsedMs / 1000)}s ·
          {countdownSeconds
            ? ` Restarting in ${countdownSeconds}s`
            : " Awaiting restart"}
        </div>
      </div>

      <div style={buttonRowStyle}>
        <button
          type="button"
          style={primaryButton}
          onClick={() => setRestartTimer(0)}
        >
          Restart Now
        </button>
        <button
          type="button"
          style={secondaryButton}
          onClick={() => setShowStats((value) => !value)}
        >
          {showStats ? "Hide Stats" : "Show Stats"}
        </button>
        <button type="button" style={secondaryButton} onClick={toggleHud}>
          Hide HUD
        </button>
      </div>

      {showStats && (
        <div style={sectionStyle}>
          <div style={titleStyle}>Top Performers</div>
          {stats.length === 0 && (
            <div style={{ fontSize: "13px", color: "#9fb2ff" }}>
              No telemetry recorded yet.
            </div>
          )}
          {stats.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {stats.map((robot) => (
                <div
                  key={robot.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{robot.id}</div>
                    <div style={{ fontSize: "12px", color: "#96a6ff" }}>
                      {robot.teamName} · {robot.kills} K · {robot.damageDealt.toFixed(0)} dmg
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "12px" }}>
                    <div>{robot.hits} hits</div>
                    <div>{Math.round(robot.timeAliveMs / 1000)}s alive</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={statGridStyle}>
            <div>
              <div style={titleStyle}>Red Totals</div>
              <div style={{ fontSize: "13px" }}>
                Damage {redTotals.damageDealt.toFixed(0)} · Kills {redTotals.kills}
              </div>
            </div>
            <div>
              <div style={titleStyle}>Blue Totals</div>
              <div style={{ fontSize: "13px" }}>
                Damage {blueTotals.damageDealt.toFixed(0)} · Kills {blueTotals.kills}
              </div>
            </div>
            <div>
              <div style={titleStyle}>Shots Landed</div>
              <div style={{ fontSize: "13px" }}>
                {redTotals.hits + blueTotals.hits} hits logged
              </div>
            </div>
          </div>
        </div>
      )}

      <form style={sectionStyle} onSubmit={handleApplyConfig}>
        <div style={titleStyle}>Next Match Setup</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          {(["red", "blue"] as const).map((team) => (
            <label
              key={team}
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              htmlFor={`config-${team}`}
            >
              <span style={{ fontSize: "12px", color: "#9baef9" }}>
                {TEAM_CONFIGS[team].name} count
              </span>
              <input
                id={`config-${team}`}
                type="number"
                min={4}
                max={20}
                value={config[team]}
                onChange={(event) =>
                  handleConfigChange(team)(Number(event.target.value))
                }
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  color: "#f5f7ff",
                  padding: "8px",
                }}
              />
            </label>
          ))}
        </div>
        <label
          htmlFor="config-seed"
          style={{ display: "flex", flexDirection: "column", gap: "6px" }}
        >
          <span style={{ fontSize: "12px", color: "#9baef9" }}>Seed</span>
          <input
            id="config-seed"
            type="number"
            value={config.seed}
            onChange={(event) => handleSeedChange(Number(event.target.value))}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#f5f7ff",
              padding: "8px",
            }}
          />
        </label>
        <button
          type="submit"
          style={{ ...primaryButton, marginTop: "12px" }}
        >
          Apply & Queue Match
        </button>
      </form>
    </div>
  );
}

export default VictoryOverlay;
