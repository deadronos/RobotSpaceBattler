import { CapsuleCollider, RigidBody } from '@react-three/rapier';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

import store from '../ecs/miniplexStore';
import type { RapierApi } from '../ecs/types';
import { extractRapierApi } from '../ecs/types';
import { markEntityDestroying } from '../utils/rapierCleanup';

type Props = {
  id?: string;
  team: "red" | "blue";
  initialPos?: THREE.Vector3;
  onRigidBodyReady?: (rb: RapierApi) => void;
  muzzleFlash?: boolean;
  physics?: boolean;
};

export default function Robot({
  id,
  team,
  initialPos = new THREE.Vector3(),
  onRigidBodyReady,
  muzzleFlash,
  physics = true,
}: Props) {
  const ref = useRef<unknown>(null);

  // Use a callback ref so we can read the attached rigidBody as soon as
  // the underlying RigidBody mounts. This is more reliable than a timing-
  // sensitive effect across versions of react-three/rapier.
  // no standalone setRef; inline the callback on the RigidBody to let TS infer the param type

  // cleanup on unmount: clear any lingering rapier API references on the
  // backing ECS entity so that rapid unmount/remount sequences do not leave
  // stale references which may be used concurrently by Rapier's wasm layer.
  useEffect(() => {
    return () => {
      try {
        if (!id) return;
        const ent = [...store.entities.values()].find(
          (e) => (e as { id?: string }).id === id,
        );
        if (ent) {
          try {
            markEntityDestroying(ent as unknown as Record<string, unknown>);
          } catch {
            try {
              delete (ent as unknown as Record<string, unknown>).rb;
            } catch {
              /* ignore */
            }
            try {
              delete (ent as unknown as Record<string, unknown>).collider;
            } catch {
              /* ignore */
            }
            try {
              (ent as unknown as Record<string, unknown>).__destroying =
                true as unknown as never;
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // swallow cleanup errors
      }
    };
  }, [id]);

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

  return physics ? (
    <RigidBody
      ref={(node) => {
        ref.current = node as unknown;
        try {
          const rb = extractRapierApi(node as unknown);
          if (rb && typeof onRigidBodyReady === 'function') {
            onRigidBodyReady(rb);
          }
        } catch {
          // ignore
        }
      }}
      position={[initialPos.x, initialPos.y, initialPos.z]}
      restitution={0.0}
      friction={1.0}
      colliders={false}
      mass={4}
      enabledRotations={[false, true, false]}
      linearDamping={0.5}
      angularDamping={1.0}
    >
      <CapsuleCollider args={[0.6, 0.35]} />
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
              color={team === 'red' ? 'orange' : 'skyblue'}
              emissive={team === 'red' ? 'orange' : 'skyblue'}
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
    </RigidBody>
  ) : (
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
              color={team === 'red' ? 'orange' : 'skyblue'}
              emissive={team === 'red' ? 'orange' : 'skyblue'}
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
