import { Canvas } from "@react-three/fiber";
import React, { Suspense, useEffect, useState } from "react";

import useUI from "../store/uiStore";
import Simulation from "./Simulation";

export default function Scene() {
  const [DreiHtml, setDreiHtml] = useState<React.ComponentType<unknown> | null>(
    null,
  );
  const [OrbitControlsComp, setOrbitControlsComp] =
    useState<React.ComponentType<unknown> | null>(null);
  const setDreiLoading = useUI((s) => s.setDreiLoading);
  const [PhysicsComp, setPhysicsComp] = useState<React.ComponentType<unknown> | null>(null);
  const [RapierModule, setRapierModule] = useState<unknown | null>(null);

  useEffect(() => {
    let mounted = true;
    // dynamically import heavy drei bits only when Scene mounts
    // signal loading start
    setDreiLoading(true);
    (async () => {
      try {
        if (typeof window !== "undefined") {
          try {
            // First ensure the Rapier wasm/runtime is imported and initialized.
            // Use /* @vite-ignore */ to avoid Vite pre-transform heuristics if the
            // wasm package would otherwise be transformed incorrectly.
            // @vite-ignore
            const rapierPkg = await import(/* @vite-ignore */ "@dimforge/rapier3d");

            // Some builds expose an init function (or default.init). Call it if present
            // so the wasm module is fully initialized before react-three-rapier uses it.
            const maybeInit = (rapierPkg as any)?.init ?? (rapierPkg as any)?.default?.init;
            if (typeof maybeInit === "function") {
              // init may return a promise
              await maybeInit();
            }

            if (mounted) setRapierModule(rapierPkg);

            // Now import the react-three-rapier wrapper and obtain the Physics component.
            // @vite-ignore
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const rapierWrapper = await import(/* @vite-ignore */ "@react-three/rapier");
            if (mounted && rapierWrapper?.Physics) setPhysicsComp(() => (rapierWrapper.Physics as unknown) as React.ComponentType<unknown>);
          } catch (err) {
            window?.console?.warn?.("Failed to load rapier packages (physics disabled).", err);
          }
        }

        const [HtmlComp, OrbitComp] = await Promise.all([
          import("@react-three/drei").then((m) => m.Html),
          import("@react-three/drei").then((m) => m.OrbitControls),
        ]);

        if (!mounted) return;
        setDreiHtml(() => HtmlComp as unknown as React.ComponentType<unknown>);
        setOrbitControlsComp(() => OrbitComp as unknown as React.ComponentType<unknown>);
      } finally {
        // signal loading finished
        if (mounted) setDreiLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setDreiLoading]);

  return (
    <Canvas shadows camera={{ position: [0, 20, 30], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        intensity={0.9}
        position={[10, 20, 15]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      {/* helper wrapper to render dynamically loaded Html with minimal lint exceptions */}
      {(() => {
        // While drei Html is loading, render nothing inside the Canvas (DOMs are not allowed here).
        if (!DreiHtml) return null;
        const DreiHtmlWrapper: React.FC = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Comp = DreiHtml as any;
          return (
            // When Html is available, it's safe to render DOM inside it. Keep Suspense fallback null
            // because DOM fallback content would otherwise be rendered directly inside the Canvas.
            <Suspense fallback={null}>
              <Comp center>
                <div className="loadingText">Loading...</div>
              </Comp>
            </Suspense>
          );
        };
        return <DreiHtmlWrapper />;
      })()}
      {PhysicsComp ? (
        // When Physics wrapper is available, render Simulation inside it (physics enabled).
        React.createElement(PhysicsComp as any, { gravity: [0, -9.81, 0] }, <Simulation physics={true} />)
      ) : (
        // If Rapier isn't ready, render the Simulation component without physics.
        // This keeps tests and server environments from crashing; the Simulation
        // will render a non-physics fallback when physics=false.
        <Simulation physics={false} />
      )}

      {OrbitControlsComp ? <OrbitControlsComp /> : null}
    </Canvas>
  );
}
