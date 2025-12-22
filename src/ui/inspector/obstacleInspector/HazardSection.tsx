import type { ObstacleEntity } from '../../../ecs/world';
import { NumberInput } from './NumberInput';

type Props = {
  obstacle: ObstacleEntity;
  apply: (patch: Partial<ObstacleEntity>) => void;
};

export function HazardSection({ obstacle, apply }: Props) {
  if (obstacle.obstacleType !== 'hazard') return null;

  return (
    <div className="obstacle-inspector-section">
      <div className="obstacle-inspector-section-title">Hazard schedule</div>
      <div className="obstacle-inspector-grid-2">
        <NumberInput
          label="Period (ms)"
          aria="Hazard period"
          value={obstacle.hazardSchedule?.periodMs ?? 1000}
          onChange={(v) =>
            apply({
              hazardSchedule: {
                periodMs: v,
                activeMs: obstacle.hazardSchedule?.activeMs ?? 500,
                offsetMs: obstacle.hazardSchedule?.offsetMs ?? 0,
              },
            })
          }
        />
        <NumberInput
          label="Active (ms)"
          aria="Hazard active"
          value={obstacle.hazardSchedule?.activeMs ?? 500}
          onChange={(v) =>
            apply({
              hazardSchedule: {
                periodMs: obstacle.hazardSchedule?.periodMs ?? 1000,
                activeMs: v,
                offsetMs: obstacle.hazardSchedule?.offsetMs ?? 0,
              },
            })
          }
        />
        <NumberInput
          label="Offset (ms)"
          aria="Hazard offset"
          value={obstacle.hazardSchedule?.offsetMs ?? 0}
          onChange={(v) =>
            apply({
              hazardSchedule: {
                periodMs: obstacle.hazardSchedule?.periodMs ?? 1000,
                activeMs: obstacle.hazardSchedule?.activeMs ?? 500,
                offsetMs: v,
              },
            })
          }
        />
        <NumberInput
          label="Damage /s"
          aria="Hazard damage"
          value={obstacle.hazardEffects?.[0]?.amount ?? 0}
          onChange={(v) =>
            apply({
              hazardEffects: [{ kind: 'damage', amount: v, perSecond: true }],
            })
          }
        />
      </div>
    </div>
  );
}
