import { useMemo } from 'react';

import type { ObstacleEntity } from '../../../ecs/world';
import { vec3 } from '../../../lib/math/vec3';
import { NumberInput } from './NumberInput';

type MovementMode = 'none' | 'linear' | 'oscillate' | 'rotation';

type Props = {
  obstacle: ObstacleEntity;
  apply: (patch: Partial<ObstacleEntity>) => void;
};

export function MovementSection({ obstacle, apply }: Props) {
  const movementKind = useMemo<MovementMode>(
    () => (obstacle.movementPattern?.patternType as MovementMode) ?? 'none',
    [obstacle],
  );

  const updateMovementKind = (mode: MovementMode) => {
    if (mode === 'none') {
      apply({ movementPattern: null });
      return;
    }

    if (mode === 'rotation') {
      apply({
        movementPattern: {
          patternType: 'rotation',
          pivot: vec3(obstacle.position?.x ?? 0, 0, obstacle.position?.z ?? 0),
          speed: 1,
          loop: true,
        },
      });
      return;
    }

    apply({
      movementPattern: {
        patternType: mode === 'oscillate' ? 'oscillate' : 'linear',
        points: [
          vec3(obstacle.position?.x ?? 0, 0, obstacle.position?.z ?? 0),
          vec3((obstacle.position?.x ?? 0) + 2, 0, obstacle.position?.z ?? 0),
        ],
        speed: 1,
        loop: true,
        pingPong: mode === 'oscillate',
      },
    });
  };

  const movement = obstacle.movementPattern;

  const setMovement = (next: typeof movement) => apply({ movementPattern: next ?? undefined });

  const updatePoint = (index: 0 | 1, axis: 'x' | 'z', value: number) => {
    if (!movement || !movement.points) return;
    const pts = [...movement.points];
    pts[index] = { ...pts[index], [axis]: value };
    setMovement({ ...movement, points: pts });
  };

  return (
    <div className="obstacle-inspector-section">
      <div className="obstacle-inspector-section-title">Movement</div>

      <select
        aria-label="Movement pattern"
        className="obstacle-inspector-input"
        value={movementKind}
        onChange={(e) => updateMovementKind(e.target.value as MovementMode)}
      >
        <option value="none">None</option>
        <option value="linear">Linear</option>
        <option value="oscillate">Oscillate</option>
        <option value="rotation">Rotation</option>
      </select>

      {movementKind === 'linear' || movementKind === 'oscillate' ? (
        <div className="obstacle-inspector-grid-2 obstacle-inspector-mt-8">
          <NumberInput
            label="Start X"
            aria="Start X"
            value={movement?.points?.[0]?.x ?? 0}
            onChange={(v) => updatePoint(0, 'x', v)}
          />
          <NumberInput
            label="Start Z"
            aria="Start Z"
            value={movement?.points?.[0]?.z ?? 0}
            onChange={(v) => updatePoint(0, 'z', v)}
          />
          <NumberInput
            label="End X"
            aria="End X"
            value={movement?.points?.[1]?.x ?? 0}
            onChange={(v) => updatePoint(1, 'x', v)}
          />
          <NumberInput
            label="End Z"
            aria="End Z"
            value={movement?.points?.[1]?.z ?? 0}
            onChange={(v) => updatePoint(1, 'z', v)}
          />
        </div>
      ) : null}

      {movementKind === 'rotation' ? (
        <div className="obstacle-inspector-grid-2 obstacle-inspector-mt-8">
          <NumberInput
            label="Pivot X"
            aria="Pivot X"
            value={movement?.pivot?.x ?? obstacle.position?.x ?? 0}
            onChange={(v) =>
              setMovement({
                ...movement!,
                pivot: vec3(v, 0, movement?.pivot?.z ?? obstacle.position?.z ?? 0),
              })
            }
          />
          <NumberInput
            label="Pivot Z"
            aria="Pivot Z"
            value={movement?.pivot?.z ?? obstacle.position?.z ?? 0}
            onChange={(v) =>
              setMovement({
                ...movement!,
                pivot: vec3(movement?.pivot?.x ?? obstacle.position?.x ?? 0, 0, v),
              })
            }
          />
        </div>
      ) : null}

      {movementKind !== 'none' ? (
        <div className="obstacle-inspector-mt-6">
          <NumberInput
            label="Speed"
            aria="Movement speed"
            value={movement?.speed ?? 1}
            onChange={(v) => setMovement({ ...movement!, speed: v })}
          />
        </div>
      ) : null}
    </div>
  );
}
