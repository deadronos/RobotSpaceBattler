import { Color } from 'three';
import { GroupProps } from '@react-three/fiber';

import { ObstacleEntity } from '../ecs/world';

interface ObstacleVisualProps extends GroupProps {
  obstacle: ObstacleEntity;
}

const barrierColor = new Color('#7dd3ff');
const hazardColor = new Color('#ff8f7a');
const coverColor = new Color('#c7ffc1');

export function ObstacleVisual({ obstacle, ...rest }: ObstacleVisualProps) {
  const { shape, obstacleType, active } = obstacle;
  const isHazard = obstacleType === 'hazard';
  const isCover = obstacleType === 'destructible';
  const color = isHazard ? hazardColor : isCover ? coverColor : barrierColor;

  const opacity = active === false ? 0.35 : 0.9;

  const position = [
    obstacle.position?.x ?? 0,
    obstacle.position?.y ?? 0,
    obstacle.position?.z ?? 0,
  ] as const;

  if (shape?.kind === 'circle') {
    return (
      <group {...rest} position={position}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[shape.radius, 32]} />
          <meshStandardMaterial color={color} transparent opacity={opacity} />
        </mesh>
      </group>
    );
  }

  const width = (shape?.kind === 'box' ? shape.halfWidth * 2 : 2) || 2;
  const depth = (shape?.kind === 'box' ? shape.halfDepth * 2 : 2) || 2;

  return (
    <group {...rest} position={position} rotation={[0, obstacle.orientation ?? 0, 0]}>
      <mesh>
        <boxGeometry args={[width, 1, depth]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  );
}
