import React, { useCallback, useRef } from "react";
import * as THREE from "three";

import type { RapierApi } from "../ecs/types";
import { extractRapierApi } from "../ecs/types";

type Props = {
  team: "red" | "blue";
  initialPos?: THREE.Vector3;
  onRigidBodyReady?: (rb: RapierApi) => void;
  muzzleFlash?: boolean;
  physics?: boolean;
  rapierComponents?: {
    RigidBody?: React.ComponentType<unknown>;
    CapsuleCollider?: React.ComponentType<unknown>;
  } | null;
};

export default function Robot({
  team,
  initialPos = new THREE.Vector3(),
  onRigidBodyReady,
  muzzleFlash,
  physics = true,
  rapierComponents = null,
}: Props) {
  const ref = useRef<unknown>(null);

  // Use a callback ref so we can read the attached rigidBody as soon as
  // the underlying RigidBody mounts. This is more reliable than a timing-
  // sensitive effect across versions of react-three/rapier.
  const setRef = useCallback(
    (node: unknown) => {
      ref.current = node;
      try {
        const rb = extractRapierApi(node);
        if (rb && typeof onRigidBodyReady === "function") {
          onRigidBodyReady(rb);
        }
      } catch {
        // ignore
      }
    },
    [onRigidBodyReady],
  );

  const color = team === "red" ? "#ff6b6b" : "#6ba0ff";

  if (!physics) {
    return (
      <group position={[initialPos.x, initialPos.y, initialPos.z]}>
        <group castShadow receiveShadow>
          <mesh position={[0, 0.9, 0]} castShadow>
            <boxGeometry args={[0.9, 1.2, 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 1.8, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[-0.9, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 0.8, 8]} />
            <meshStandardMaterial color="#999" />
          </mesh>
          <mesh position={[0.9, 0.9, 0.2]} castShadow>
            <boxGeometry args={[0.6, 0.2, 0.2]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          {muzzleFlash && (
            <mesh position={[1.2, 0.9, 0.2]} castShadow>
              <sphereGeometry args={[0.12, 8, 8]} />
              <meshStandardMaterial
                color={team === "red" ? "orange" : "skyblue"}
                emissive={team === "red" ? "orange" : "skyblue"}
                emissiveIntensity={2}
              />
            </mesh>
          )}
          <mesh position={[-0.25, 0.1, 0]} castShadow>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[0.25, 0.1, 0]} castShadow>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    // Use runtime-provided components to ensure they belong to the same
    // react-three-rapier module instance that provided <Physics />.
    rapierComponents && rapierComponents.RigidBody ? (
      React.createElement(
        rapierComponents.RigidBody,
        ({ ref: setRef, position: [initialPos.x, initialPos.y, initialPos.z], restitution: 0.0, friction: 1.0, colliders: false, mass: 4, enabledRotations: [false, true, false], linearDamping: 0.5, angularDamping: 1.0 } as unknown as Record<string, unknown>),
        // explicit capsule collider for stable ground contact
        rapierComponents.CapsuleCollider ? React.createElement(rapierComponents.CapsuleCollider, ({ args: [0.6, 0.35] } as unknown as Record<string, unknown>)) : null,
        // simple procedural humanoid-ish robot made with boxes and cylinders
        React.createElement(
          'group',
          { castShadow: true, receiveShadow: true },
          React.createElement(
            'mesh',
            { position: [0, 0.9, 0], castShadow: true },
            React.createElement('boxGeometry', { args: [0.9, 1.2, 0.6] }),
            React.createElement('meshStandardMaterial', { color }),
          ),
          React.createElement(
            'mesh',
            { position: [0, 1.8, 0], castShadow: true },
            React.createElement('boxGeometry', { args: [0.5, 0.5, 0.5] }),
            React.createElement('meshStandardMaterial', { color: '#222' }),
          ),
          React.createElement(
            'mesh',
            { position: [-0.9, 0.9, 0], castShadow: true },
            React.createElement('cylinderGeometry', { args: [0.12, 0.12, 0.8, 8] }),
            React.createElement('meshStandardMaterial', { color: '#999' }),
          ),
          React.createElement(
            'mesh',
            { position: [0.9, 0.9, 0.2], castShadow: true },
            React.createElement('boxGeometry', { args: [0.6, 0.2, 0.2] }),
            React.createElement('meshStandardMaterial', { color: '#222' }),
          ),
          muzzleFlash
            ? React.createElement(
                'mesh',
                { position: [1.2, 0.9, 0.2], castShadow: true },
                React.createElement('sphereGeometry', { args: [0.12, 8, 8] }),
                React.createElement('meshStandardMaterial', {
                  color: team === 'red' ? 'orange' : 'skyblue',
                  emissive: team === 'red' ? 'orange' : 'skyblue',
                  emissiveIntensity: 2,
                }),
              )
            : null,
          React.createElement(
            'mesh',
            { position: [-0.25, 0.1, 0], castShadow: true },
            React.createElement('boxGeometry', { args: [0.4, 0.8, 0.4] }),
            React.createElement('meshStandardMaterial', { color: '#333' }),
          ),
          React.createElement(
            'mesh',
            { position: [0.25, 0.1, 0], castShadow: true },
            React.createElement('boxGeometry', { args: [0.4, 0.8, 0.4] }),
            React.createElement('meshStandardMaterial', { color: '#333' }),
          ),
        ),
      )
    ) : (
      // Shouldn't reach here because physics=false handled above, but default
      // to non-physics visual when rapierComponents missing.
      <group position={[initialPos.x, initialPos.y, initialPos.z]} />
    )
  );
}
