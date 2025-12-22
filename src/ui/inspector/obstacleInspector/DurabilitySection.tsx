import type { ObstacleEntity } from '../../../ecs/world';
import { NumberInput } from './NumberInput';

type Props = {
  obstacle: ObstacleEntity;
  apply: (patch: Partial<ObstacleEntity>) => void;
};

export function DurabilitySection({ obstacle, apply }: Props) {
  if (obstacle.obstacleType !== 'destructible') return null;

  return (
    <div className="obstacle-inspector-section">
      <div className="obstacle-inspector-section-title">Durability</div>
      <NumberInput
        label="Durability"
        aria="Durability"
        value={obstacle.durability ?? obstacle.maxDurability ?? 10}
        onChange={(v) =>
          apply({
            durability: v,
            maxDurability: obstacle.maxDurability ?? v,
          })
        }
      />
    </div>
  );
}
