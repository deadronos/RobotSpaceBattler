import React, { useEffect, useMemo } from 'react';

import { createEmissiveMaterial } from '../../utils/materials';
import { useEmissiveFlicker } from './hooks';

export interface EmissivePanelProps {
  size?: [number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  emissiveColor?: string;
  emissiveIntensity?: number;
  flicker?: boolean;
  flickerSpeed?: number;
  flickerAmount?: number;
}

export default function EmissivePanel({
  size = [1.6, 0.6],
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  emissiveColor = '#3fd9ff',
  emissiveIntensity = 2.8,
  flicker = true,
  flickerSpeed = 2.2,
  flickerAmount = 0.12,
}: EmissivePanelProps) {
  const material = useMemo(
    () =>
      createEmissiveMaterial({
        emissive: emissiveColor,
        emissiveIntensity,
      }),
    [emissiveColor, emissiveIntensity],
  );

  useEmissiveFlicker(material, {
    enabled: flicker,
    speed: flickerSpeed,
    amount: flickerAmount,
    baseIntensity: emissiveIntensity,
  });

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh position={position} rotation={rotation} material={material}>
      <planeGeometry args={[size[0], size[1]]} />
    </mesh>
  );
}
