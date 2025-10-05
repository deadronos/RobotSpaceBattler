import { OrbitControls, Stats } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import React, { Suspense } from "react";

import { useUI } from "../store/uiStore";
import { loadRapierOnce } from "../utils/rapierLoader";
import EnvironmentLayout from "./environment/EnvironmentLayout";
import EnvironmentLighting from "./environment/EnvironmentLighting";
import { ErrorBoundary } from "./ErrorBoundary";
import LoopDriver from "./LoopDriver";
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

// Debug toggles: flip these to help isolate stalls during development.
const DEBUG = {
  // If true, the TickDriver will be disabled and the Canvas won't be invalidated by the TickDriver.
  disableTickDriver: false,
  // If true, the FixedStepLoop will not start its autonomous RAF loop (simulation can still be stepped manually).
  disableAutonomousRaf: false,
};

export default function Scene() {
  const paused = useUI((s) => s.paused);
  const [rapierReady, setRapierReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.info('[Scene] Rapier WASM loader (singleton): start');
        await loadRapierOnce();
        console.info('[Scene] Rapier WASM loader (singleton): completed');
      } catch (err) {
        console.warn('Rapier WASM loader (singleton) failed or is unavailable:', err);
      } finally {
        console.info('[Scene] Rapier WASM loader (singleton): finished (setting ready flag)');
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
      <Suspense fallback={null}>
        {ENABLE_ENVIRONMENT ? <EnvironmentLayout /> : null}
        {rapierReady ? (
          <Physics
            gravity={[0, -9.81, 0]}
            // When LoopDriver performs manual Rapier stepping we must prevent
            // the Physics wrapper from auto-stepping. We force Physics paused
            // when manual stepping is enabled so the LoopDriver is the single
            // authority for advancing the Rapier world.
            paused={true}
             updateLoop="follow"
             timeStep={1/60}
           >
             <Simulation renderFloor={!ENABLE_ENVIRONMENT} disableAutonomousRaf={DEBUG.disableAutonomousRaf} />
             {/* Central LoopDriver: drives fixed-step simulation and invalidation.
                 manualRapierStep=false by default. If you want Rapier to be stepped
                 manually by the driver, set `manualRapierStep={true}` and ensure
                 the Physics wrapper is configured accordingly. */}
            <LoopDriver enabled={!paused && !DEBUG.disableTickDriver} hz={60} stepSeconds={1/60} manualRapierStep={true} />
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

// Removed the old TickDriver. The LoopDriver component now owns RAF and
// invalidation cadence and delegates fixed-step stepping to registered
// FixedStepLoopHandles (such as those created by Simulation via
// useFixedStepLoop). The central driver enables a single source of truth
// for stepping, easier deterministic testing, and simpler diagnostics.

