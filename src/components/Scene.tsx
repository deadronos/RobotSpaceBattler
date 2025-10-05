import React, { Suspense, useEffect, useRef } from "react";
import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

import { ErrorBoundary } from "./ErrorBoundary";
import { useUI } from "../store/uiStore";
import { updateFixedStepMetrics } from "../utils/sceneMetrics";
import EnvironmentLayout from "./environment/EnvironmentLayout";
import EnvironmentLighting from "./environment/EnvironmentLighting";
import Simulation from "./Simulation";

// Note: You may see a deprecation warning from Rapier's wasm initializer
// like "using deprecated parameters for the initialization function; pass a single object instead".
// That warning originates from Rapier's internal wasm init. To silence it you can:
//  - Upgrade @react-three/rapier and @dimforge/rapier3d-compat to versions that support passing
//    an options object to the wasm initializer, or
//  - If the library exports an `importRapier` helper (newer releases), call it with a loader
//    function to control WASM initialization. Example (only available when the library exports it):
//      importRapier(() => import('@dimforge/rapier3d-compat'))
// If the warning is harmless you can also ignore it; it does not break simulation.

const ENABLE_ENVIRONMENT = true;

export default function Scene() {
  const paused = useUI((s) => s.paused);
  const [rapierReady, setRapierReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = (await import("@react-three/rapier")) as unknown as {
          importRapier?: (loader: () => Promise<unknown>) => void | Promise<void>;
        };
        if (typeof mod.importRapier === "function") {
          // If the loader returns a promise, await it to ensure WASM is fully
          // initialized before we mount Physics. If it is synchronous we
          // continue immediately.
          const result = mod.importRapier(() => import("@dimforge/rapier3d-compat"));
          if (result instanceof Promise) await result;
        } else {
          // Some versions of react-three-rapier don't expose importRapier.
          // In that case import the compat package directly to ensure the
          // Rapier wasm module is initialized before we create Rapier objects.
          await import("@dimforge/rapier3d-compat");
        }
      } catch (err) {
        // If loading fails we'll fallback to the library's default behavior
        // but log a helpful message to aid debugging.
        console.warn("Rapier WASM loader failed or is unavailable:", err);
      } finally {
        if (mounted) setRapierReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ErrorBoundary>
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
        {rapierReady ? (
          <Physics
            gravity={[0, -9.81, 0]}
            paused={paused}
            updateLoop="independent"
            timeStep={1/60}
          >
            <Simulation renderFloor={!ENABLE_ENVIRONMENT} />
          </Physics>
        ) : null}
        {/*<DiagnosticsOverlay updateHz={8} />*/}
      </Suspense>
      {rapierReady ? <OrbitControls makeDefault /> : null}
      {rapierReady ? <Stats /> : null}
    </Canvas>
    </ErrorBoundary>
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
      try {
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
      } catch (err) {
        // Guard the tick loop from throwing to React's render pipeline.
        // Log the error for diagnostics and swallow it so the canvas remains mounted.
        console.error('[TickDriver] error in tick:', err);
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

// Wasm loader is now triggered from inside the Scene component before
// mounting <Physics> to avoid race conditions where the wasm module isn't
// ready when react-three-rapier creates Rapier objects.

