import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import React, { Suspense, useEffect, useState } from "react";

import Simulation from "./Simulation";

export default function Scene() {
  const [DreiHtml, setDreiHtml] = useState<React.ComponentType<unknown> | null>(
    null,
  );
  const [OrbitControlsComp, setOrbitControlsComp] =
    useState<React.ComponentType<unknown> | null>(null);

  useEffect(() => {
    let mounted = true;
    // dynamically import heavy drei bits only when Scene mounts
    Promise.all([
      import("@react-three/drei").then((m) => m.Html),
      import("@react-three/drei").then((m) => m.OrbitControls),
    ]).then(([HtmlComp, OrbitComp]) => {
      if (!mounted) return;
      setDreiHtml(() => HtmlComp as unknown as React.ComponentType<unknown>);
      setOrbitControlsComp(
        () => OrbitComp as unknown as React.ComponentType<unknown>,
      );
    });
    return () => {
      mounted = false;
    };
  }, []);

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
        if (!DreiHtml)
          return (
            <Suspense fallback={<div className="loadingText">Loading...</div>}>
              <div />
            </Suspense>
          );
        const DreiHtmlWrapper: React.FC = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Comp = DreiHtml as any;
          return (
            <Suspense fallback={<div className="loadingText">Loading...</div>}>
              <Comp center>
                <div className="loadingText">Loading...</div>
              </Comp>
            </Suspense>
          );
        };
        return <DreiHtmlWrapper />;
      })()}
      <Physics gravity={[0, -9.81, 0]}>
        <Simulation />
      </Physics>

      {OrbitControlsComp ? <OrbitControlsComp /> : null}
    </Canvas>
  );
}
