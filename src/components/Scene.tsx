import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import React, { Suspense, useEffect, useRef } from "react";

import { useUI } from "../store/uiStore";
import { updateFixedStepMetrics } from "../utils/sceneMetrics";
import EnvironmentLayout from "./environment/EnvironmentLayout";
import EnvironmentLighting from "./environment/EnvironmentLighting";
import Simulation from "./Simulation";

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  const paused = useUI((s) => s.paused);

  return (
    <Canvas
      shadows
      camera={{ position: [16, 12, 16], fov: 50 }}
      // Use on-demand rendering: we drive frames explicitly via TickDriver/invalidate().
      // This avoids accidental continuous renders and makes pause/unpause deterministic.
      frameloop="demand"
    >
      <color attach="background" args={[0.04, 0.05, 0.09]} />
      {ENABLE_ENVIRONMENT ? (
        <EnvironmentLighting />
      ) : (
        <ambientLight intensity={0.3} />
      )}
      {/* Heartbeat: ensure frames are enqueued across environments */}
      <TickDriver active={!paused} hz={60} />
      <Suspense fallback={null}>
        {ENABLE_ENVIRONMENT ? <EnvironmentLayout /> : null}
        {/**
         * Tie Rapier's stepping to the render loop so visuals advance with frames,
         * and use a fixed timestep for consistency across machines.
         * 
         * updateLoop="independent": Rapier runs its own physics loop independent
         * of the render frame rate. This ensures smooth physics simulation even
         * when rendering is slower. The Simulation's fixed-step loop remains
         * authoritative for game logic and determinism.
         */}
        <Physics
          gravity={[0, -9.81, 0]}
          paused={paused}
          updateLoop="independent"
          timeStep={1/60}
        >
          <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
        </Physics>
        {/*<DiagnosticsOverlay updateHz={8} />*/}
      </Suspense>
      <OrbitControls makeDefault />
      <Stats />
    </Canvas>
  );
}

function TickDriver({ active, hz = 60 }: { active: boolean; hz?: number }) {
  const { invalidate } = useThree();
  const invalidationCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!active) return;
    
    let frameId: number | null = null;
    let lastTime = performance.now();
    const frameInterval = 1000 / hz;
    let accumulated = 0;
    
    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;
      accumulated += delta;
      
      // Invalidate when enough time has accumulated
      // This batches invalidations to match the target hz
      if (accumulated >= frameInterval) {
        invalidate();
        accumulated = accumulated % frameInterval;
        invalidationCountRef.current += 1;
        
        // Update rAF metrics for diagnostics
        updateFixedStepMetrics({
          lastRafTimestamp: now,
          invalidationsPerRaf: invalidationCountRef.current,
        });
      }
      
      frameId = requestAnimationFrame(tick);
    };
    
    frameId = requestAnimationFrame(tick);
    
    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [active, hz, invalidate]);
  
  return null;
}

