import { useFrame } from "@react-three/fiber";
import React, { useRef } from "react";
import { Mesh, Quaternion, Vector3 } from "three";

const UP_VECTOR = new Vector3(0, 1, 0);
const STREAK_WIDTH = 0.06;
const MIN_VISIBLE_SPEED = 0.05;
const MIN_LENGTH = 0.25;
const MAX_LENGTH = 2.0;
const LENGTH_SCALE = 0.03;

export interface MutableStreakState {
  visible: boolean;
  length: number;
  nx: number;
  ny: number;
  nz: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
}

const createStreakState = (): MutableStreakState => ({
  visible: false,
  length: 0,
  nx: 0,
  ny: 1,
  nz: 0,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
});

export function updateStreakState(
  state: MutableStreakState,
  velocity?: [number, number, number],
): MutableStreakState {
  if (!velocity) {
    state.visible = false;
    state.length = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.offsetZ = 0;
    return state;
  }

  const [vx, vy, vz] = velocity;
  const speedSq = vx * vx + vy * vy + vz * vz;
  if (speedSq <= MIN_VISIBLE_SPEED * MIN_VISIBLE_SPEED) {
    state.visible = false;
    state.length = 0;
    state.offsetX = 0;
    state.offsetY = 0;
    state.offsetZ = 0;
    return state;
  }

  const speed = Math.sqrt(speedSq);
  const length = Math.min(
    MAX_LENGTH,
    Math.max(MIN_LENGTH, speed * LENGTH_SCALE),
  );
  const inv = 1 / speed;
  const nx = vx * inv;
  const ny = vy * inv;
  const nz = vz * inv;
  const halfLength = length * 0.5;

  state.visible = true;
  state.length = length;
  state.nx = nx;
  state.ny = ny;
  state.nz = nz;
  state.offsetX = -nx * halfLength;
  state.offsetY = -ny * halfLength;
  state.offsetZ = -nz * halfLength;
  return state;
}

export function ProjectileStreak({
  velocity,
  color,
  opacity = 0.7,
}: {
  velocity?: [number, number, number];
  color: string;
  opacity?: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const dir = useRef(new Vector3());
  const quat = useRef(new Quaternion());
  const offset = useRef(new Vector3());
  const stateRef = useRef<MutableStreakState>(createStreakState());

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const state = updateStreakState(stateRef.current, velocity);
    if (!state.visible) {
      mesh.visible = false;
      return;
    }

    dir.current.set(state.nx, state.ny, state.nz);
    quat.current.setFromUnitVectors(UP_VECTOR, dir.current);
    mesh.setRotationFromQuaternion(quat.current);

    mesh.scale.set(STREAK_WIDTH, state.length, STREAK_WIDTH);

    offset.current.set(state.offsetX, state.offsetY, state.offsetZ);
    mesh.position.copy(offset.current);

    mesh.visible = true;
  });

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      castShadow={false}
      name="ProjectileStreak"
    >
      <cylinderGeometry args={[0.5, 0.5, 1, 6, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  );
}
