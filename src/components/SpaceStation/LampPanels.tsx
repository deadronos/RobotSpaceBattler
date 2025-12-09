import { useMemo } from 'react';
import { Euler, Vector3 } from 'three';

type LampPanel = {
  position: Vector3;
  rotation: Euler;
  color: string;
};

/**
 * Renders decorative glowing lamp panels around the arena walls.
 * Adds visual variety and color cues to the environment.
 */
export function LampPanels() {
  const lampPanels = useMemo<LampPanel[]>(
    () => [
      {
        position: new Vector3(0, 3.5, -48.9),
        rotation: new Euler(0, 0, 0),
        color: '#7ecbff',
      },
      {
        position: new Vector3(0, 3.5, 48.9),
        rotation: new Euler(0, Math.PI, 0),
        color: '#7ecbff',
      },
      {
        position: new Vector3(-48.9, 3.5, 0),
        rotation: new Euler(0, Math.PI / 2, 0),
        color: '#ffb36c',
      },
      {
        position: new Vector3(48.9, 3.5, 0),
        rotation: new Euler(0, -Math.PI / 2, 0),
        color: '#ff6f9f',
      },
      {
        position: new Vector3(-20, 3.25, -20),
        rotation: new Euler(0, Math.PI / 4, 0),
        color: '#8ce2ff',
      },
      {
        position: new Vector3(20, 3.25, 20),
        rotation: new Euler(0, -Math.PI / 4, 0),
        color: '#9cffb5',
      },
    ],
    [],
  );

  return (
    <>
      {lampPanels.map((panel, index) => (
        <group key={`lamp-${index}`} position={panel.position} rotation={panel.rotation}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2, 2.2, 0.3]} />
            <meshStandardMaterial color="#141724" metalness={0.6} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.25]} castShadow receiveShadow>
            <boxGeometry args={[3.4, 1.6, 0.2]} />
            <meshStandardMaterial
              color="#070a12"
              emissive={panel.color}
              emissiveIntensity={4.2}
              metalness={0.2}
              roughness={0.15}
            />
          </mesh>
          <pointLight
            position={[0, 0, 1.3]}
            intensity={1.65}
            distance={32}
            decay={1.9}
            color={panel.color}
            // Decorative light; casting shadows for each would be too expensive.
            castShadow={false}
          />
        </group>
      ))}
    </>
  );
}
