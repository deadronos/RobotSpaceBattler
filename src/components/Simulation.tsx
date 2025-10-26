import { useFrame } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { updateAiSystem } from "../ecs/systems/aiSystem";
import { cleanupSystem } from "../ecs/systems/cleanupSystem";
import { updateMovementSystem } from "../ecs/systems/movementSystem";
import { spawnTeams } from "../ecs/systems/spawnSystem";
import { updateVictorySystem } from "../ecs/systems/victorySystem";
import {
  updateProjectileSystem,
  updateWeaponSystem,
} from "../ecs/systems/weaponSystem";
import { BattleWorld, createBattleWorld } from "../ecs/world";
import Arena from "../render/Arena";
import Projectiles from "../render/Projectiles";
import Robots from "../render/Robots";
import { useSimulationStore } from "../state/simulationStore";

function Simulation() {
  const setBattleWorld = useSimulationStore((state) => state.setBattleWorld);
  const phase = useSimulationStore((state) => state.phase);
  const restartTimer = useSimulationStore((state) => state.restartTimer);
  const setRestartTimer = useSimulationStore((state) => state.setRestartTimer);
  const resetStore = useSimulationStore((state) => state.reset);
  const initializeStore = useSimulationStore((state) => state.initialize);
  const hasInitialMatch = useSimulationStore(
    (state) => state.initialMatch !== null,
  );

  const worldRef = useRef<BattleWorld | null>(null);

  const setupWorld = useCallback(() => {
    const { initialMatch } = useSimulationStore.getState();
    if (!initialMatch) {
      throw new Error("Cannot setup world before initial match data loads");
    }

    const battleWorld = createBattleWorld();
    worldRef.current = battleWorld;
    setBattleWorld(battleWorld);
    spawnTeams(battleWorld, initialMatch.seed);
    cleanupSystem(battleWorld);
    initializeStore();
  }, [initializeStore, setBattleWorld]);

  useEffect(() => {
    if (!hasInitialMatch) {
      return;
    }

    setupWorld();

    return () => {
      setBattleWorld(null);
      worldRef.current = null;
    };
  }, [hasInitialMatch, setBattleWorld, setupWorld]);

  useFrame((_, delta) => {
    const world = worldRef.current;
    if (!world) {
      return;
    }

    const store = useSimulationStore.getState();

    if (store.phase === "paused") {
      return;
    }

    const deltaSeconds = Math.min(delta, 0.05);

    updateAiSystem(world);
    updateMovementSystem(world, deltaSeconds);
    updateWeaponSystem(world, deltaSeconds);
    updateProjectileSystem(world, deltaSeconds);
    cleanupSystem(world);
    updateVictorySystem(world);

    store.setElapsedMs(store.elapsedMs + deltaSeconds * 1000);

    if (store.phase === "victory" && store.restartTimer !== null) {
      const nextTimer = Math.max(0, store.restartTimer - deltaSeconds * 1000);
      store.setRestartTimer(nextTimer);
      if (nextTimer <= 0) {
        resetStore();
        setupWorld();
      }
    }
  });

  useEffect(() => {
    if (phase !== "victory") {
      return;
    }

    if (restartTimer === null) {
      setRestartTimer(5000);
    }
  }, [phase, restartTimer, setRestartTimer]);

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
