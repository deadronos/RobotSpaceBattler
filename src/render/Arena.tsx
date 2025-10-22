/* eslint-disable react/no-unknown-property */
import { memo } from "react";

function Arena() {
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial
          color="#101428"
          metalness={0.2}
          roughness={0.65}
        />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[44, 45, 64]} />
        <meshStandardMaterial
          color="#2a3f7b"
          emissive="#1f3b84"
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.1, 0]}>
        <ringGeometry args={[30, 31, 64]} />
        <meshStandardMaterial
          color="#343d66"
          emissive="#384d9d"
          emissiveIntensity={0.45}
        />
      </mesh>
      <pointLight
        position={[0, 12, 0]}
        intensity={1.2}
        distance={80}
        color="#446bff"
      />
      <spotLight
        position={[0, 24, 0]}
        angle={0.7}
        penumbra={0.6}
        intensity={1.4}
        color="#6b89ff"
        castShadow
      />
    </group>
  );
}

export default memo(Arena);
