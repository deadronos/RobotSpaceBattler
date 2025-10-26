import { Physics, RigidBody } from "@react-three/rapier";
import { useMemo } from "react";

import Arena from "../render/Arena";
import Projectiles from "../render/Projectiles";
import Robots from "../render/Robots";
import { useMatchRuntime } from "../runtime/useMatchRuntime";
import { useSimulationStore } from "../state/simulationStore";

function Simulation() {
  const phase = useSimulationStore((state) => state.phase);
  const { worldRef } = useMatchRuntime();

  const physicsKey = useMemo(
    () => (phase === "victory" ? `victory-${Date.now()}` : "running"),
    [phase],
  );

  return (
    <Physics key={physicsKey} gravity={[0, -1, 0]}>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.5, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[120, 1, 120]} />
          <meshStandardMaterial color="#060914" />
        </mesh>
      </RigidBody>
      <Arena />
      <Robots worldRef={worldRef} />
      <Projectiles worldRef={worldRef} />
    </Physics>
  );
}

export default Simulation;
