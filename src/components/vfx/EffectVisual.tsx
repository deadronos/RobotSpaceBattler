import { Sparkles } from '@react-three/drei';

import { EffectEntity } from '../../ecs/world';

interface EffectVisualProps {
  effect: EffectEntity;
  currentTimeMs: number;
}

function toPositionArray(effect: EffectEntity): [number, number, number] {
  return [effect.position.x, effect.position.y, effect.position.z];
}

function ExplosionEffect({ effect, progress }: { effect: EffectEntity; progress: number }) {
  const position = toPositionArray(effect);
  const scale = effect.radius * (0.6 + 0.6 * progress);
  const fade = Math.max(0, 1 - progress);

  return (
    <>
      <group position={position} scale={[scale, scale, scale]}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={effect.color}
            emissive={effect.color}
            emissiveIntensity={1.4}
            transparent
            opacity={0.55 * fade}
          />
        </mesh>
        <mesh scale={0.55}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial
            color={effect.secondaryColor ?? '#fff4d6'}
            emissive={effect.secondaryColor ?? '#fff4d6'}
            emissiveIntensity={1.0}
            transparent
            opacity={0.45 * fade}
          />
        </mesh>
      </group>
      <Sparkles
        position={position}
        count={24}
        speed={1.2}
        size={effect.radius * 3}
        scale={effect.radius * 2.2}
        color={effect.secondaryColor ?? effect.color}
      />
    </>
  );
}

function ImpactEffect({ effect, progress }: { effect: EffectEntity; progress: number }) {
  const position = toPositionArray(effect);
  const scale = effect.radius * (0.7 + 0.4 * progress);
  const fade = Math.max(0, 1 - progress);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh>
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial
          color={effect.color}
          emissive={effect.color}
          emissiveIntensity={1.0}
          transparent
          opacity={0.5 * fade}
        />
      </mesh>
    </group>
  );
}

function LaserImpactEffect({ effect, progress }: { effect: EffectEntity; progress: number }) {
  const position = toPositionArray(effect);
  const scale = effect.radius * (0.5 + 0.6 * progress);
  const fade = Math.max(0, 1 - progress);

  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh scale={[scale, scale, scale]}>
        <ringGeometry args={[0.4, 0.8, 24]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.5 * fade} />
      </mesh>
      <mesh position={[0, 0, effect.radius * 0.1]} scale={scale * 0.45}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={effect.secondaryColor ?? '#c9ffff'}
          emissive={effect.color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.5 * fade}
        />
      </mesh>
    </group>
  );
}

export function EffectVisual({ effect, currentTimeMs }: EffectVisualProps) {
  const elapsed = Math.max(0, currentTimeMs - effect.createdAt);
  const progress = effect.duration > 0 ? Math.min(1, elapsed / effect.duration) : 1;

  if (effect.effectType === 'explosion') {
    return <ExplosionEffect effect={effect} progress={progress} />;
  }

  if (effect.effectType === 'laser-impact') {
    return <LaserImpactEffect effect={effect} progress={progress} />;
  }

  return <ImpactEffect effect={effect} progress={progress} />;
}
