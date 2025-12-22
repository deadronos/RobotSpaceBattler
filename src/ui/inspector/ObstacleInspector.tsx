import type { ObstacleEntity } from "../../ecs/world";

import { DurabilitySection } from "./obstacleInspector/DurabilitySection";
import { FlagsSection } from "./obstacleInspector/FlagsSection";
import { HazardSection } from "./obstacleInspector/HazardSection";
import { MovementSection } from "./obstacleInspector/MovementSection";
import { TransformSection } from "./obstacleInspector/TransformSection";

import "./obstacleInspector.css";

interface ObstacleInspectorProps {
  obstacle: ObstacleEntity | null;
  onChange: (next: ObstacleEntity) => void;
  onRemove?: (id: string) => void;
}

export function ObstacleInspector({
  obstacle,
  onChange,
  onRemove,
}: ObstacleInspectorProps) {
  if (!obstacle) {
    return (
      <div className="obstacle-inspector-empty">Select an obstacle to edit.</div>
    );
  }

  const apply = (patch: Partial<ObstacleEntity>) =>
    onChange({ ...obstacle, ...patch });
  

  return (
    <div className="obstacle-inspector">
      <div className="obstacle-inspector-header">
        <div className="obstacle-inspector-title">Inspector — {obstacle.id}</div>
        {onRemove ? (
          <button
            type="button"
            className="obstacle-inspector-input obstacle-inspector-button"
            onClick={() => onRemove(obstacle.id)}
          >
            Remove
          </button>
        ) : null}
      </div>

      <TransformSection obstacle={obstacle} apply={apply} />

      <FlagsSection obstacle={obstacle} apply={apply} />

      <MovementSection obstacle={obstacle} apply={apply} />
      <HazardSection obstacle={obstacle} apply={apply} />
      <DurabilitySection obstacle={obstacle} apply={apply} />
    </div>
  );
}
