import type { ObstacleEntity } from '../../../ecs/world';
import { vec3 } from '../../../lib/math/vec3';
import { NumberInput } from './NumberInput';

type Props = {
  obstacle: ObstacleEntity;
  apply: (patch: Partial<ObstacleEntity>) => void;
};

export function TransformSection({ obstacle, apply }: Props) {
  const box =
    obstacle.shape?.kind === 'box'
      ? obstacle.shape
      : { kind: 'box', halfWidth: 1, halfDepth: 1 };

  const circle =
    obstacle.shape?.kind === 'circle'
      ? obstacle.shape
      : { kind: 'circle', radius: 1.5 };

  return (
    <div className="obstacle-inspector-grid-2">
      <NumberInput
        label="Pos X"
        aria="Position X"
        value={obstacle.position?.x ?? 0}
        onChange={(v) =>
          apply({
            position: vec3(v, obstacle.position?.y ?? 0, obstacle.position?.z ?? 0),
          })
        }
      />
      <NumberInput
        label="Pos Z"
        aria="Position Z"
        value={obstacle.position?.z ?? 0}
        onChange={(v) =>
          apply({
            position: vec3(obstacle.position?.x ?? 0, obstacle.position?.y ?? 0, v),
          })
        }
      />

      {obstacle.obstacleType !== 'hazard' ? (
        <>
          <NumberInput
            label="Half Width"
            aria="Half width"
            value={box.halfWidth}
            onChange={(v) =>
              apply({
                shape: {
                  kind: 'box',
                  halfWidth: v,
                  halfDepth: box.halfDepth,
                },
              })
            }
          />
          <NumberInput
            label="Half Depth"
            aria="Half depth"
            value={box.halfDepth}
            onChange={(v) =>
              apply({
                shape: {
                  kind: 'box',
                  halfWidth: box.halfWidth,
                  halfDepth: v,
                },
              })
            }
          />
        </>
      ) : (
        <NumberInput
          label="Radius"
          aria="Hazard radius"
          value={circle.radius}
          onChange={(v) => apply({ shape: { kind: 'circle', radius: v } })}
        />
      )}
    </div>
  );
}
