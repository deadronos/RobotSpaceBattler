import {
  formatSimSpeed,
  SIM_SPEED_OPTIONS,
  type SimSpeed,
} from "../../lib/simSpeed";

interface SimSpeedControlProps {
  /** Currently selected speed. */
  value: SimSpeed;
  onChange: (speed: SimSpeed) => void;
}

/**
 * Speed selector for the fixed-timestep simulation (#170). The steps stay at
 * 1/60 s at every speed, so the outcome of a seed never depends on this.
 */
export function SimSpeedControl({ value, onChange }: SimSpeedControlProps) {
  return (
    <div
      className="sim-speed-control"
      role="group"
      aria-label="Simulation speed"
    >
      {SIM_SPEED_OPTIONS.map((speed) => (
        <button
          key={speed}
          type="button"
          className="sim-speed-button"
          aria-pressed={speed === value}
          title={`Simulation speed ${formatSimSpeed(speed)}`}
          onClick={() => onChange(speed)}
        >
          {formatSimSpeed(speed)}
        </button>
      ))}
    </div>
  );
}
