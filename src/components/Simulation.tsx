import React from "react";

import { useSimulationWorld } from "../ecs/world";
import type { FrameSubscription } from "../systems/physicsSync";
import { usePhysicsSync } from "../systems/physicsSync";
import RobotPlaceholder from "./RobotPlaceholder";

type SimulationProps = {
  /** Optional override for frame subscription (testing). */
  useFrameHook?: FrameSubscription;
};

export default function Simulation({ useFrameHook }: SimulationProps) {
  const world = useSimulationWorld();

  usePhysicsSync({ world, useFrameHook });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#081029" />
      </mesh>

      <RobotPlaceholder position={[0, 1, 0]} team="red" />
      <RobotPlaceholder position={[2, 1, 0]} team="blue" />
    </>
  );
}
