import type { ObstacleEntity } from '../../../ecs/world';

type Props = {
  obstacle: ObstacleEntity;
  apply: (patch: Partial<ObstacleEntity>) => void;
};

export function FlagsSection({ obstacle, apply }: Props) {
  return (
    <div className="obstacle-inspector-flags">
      <label className="obstacle-inspector-flag">
        <input
          type="checkbox"
          checked={obstacle.active !== false}
          onChange={(e) => apply({ active: e.target.checked })}
        />
        Active
      </label>

      {obstacle.obstacleType !== 'hazard' ? (
        <>
          <label className="obstacle-inspector-flag">
            <input
              type="checkbox"
              checked={obstacle.blocksVision !== false}
              onChange={(e) => apply({ blocksVision: e.target.checked })}
            />
            Blocks vision
          </label>
          <label className="obstacle-inspector-flag">
            <input
              type="checkbox"
              checked={obstacle.blocksMovement !== false}
              onChange={(e) => apply({ blocksMovement: e.target.checked })}
            />
            Blocks movement
          </label>
        </>
      ) : null}
    </div>
  );
}
