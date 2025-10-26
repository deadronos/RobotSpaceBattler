import { OrbitControls, StatsGl } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense } from "react";

import CinematicCamera from "../render/CinematicCamera";
import { useHudStore } from "../state/ui/hudStore";
import Simulation from "./Simulation";

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  color: "#9aa9ff",
  fontSize: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

function Scene() {
  const showHud = useHudStore((state) => state.showHud);
  const qualityProfile = useHudStore((state) => state.qualityProfile);
  const reducedMotion = useHudStore((state) => state.reducedMotion);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas shadows camera={{ position: [18, 16, 18], fov: 45 }}>
        <color attach="background" args={[0.015, 0.02, 0.07]} />
        <fog attach="fog" args={[0x020413, 30, 110]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} />
          <directionalLight
            castShadow
            intensity={
              qualityProfile === "High"
                ? 2.2
                : qualityProfile === "Medium"
                  ? 1.6
                  : 1.1
            }
            position={[24, 30, 16]}
            shadow-mapSize-width={qualityProfile === "Low" ? 1024 : 2048}
            shadow-mapSize-height={qualityProfile === "Low" ? 1024 : 2048}
          />
          <hemisphereLight
            groundColor="#0b0f23"
            color="#5c6acf"
            intensity={0.6}
          />
          <Simulation />
          {!reducedMotion && (
            <EffectComposer multisampling={qualityProfile === "High" ? 4 : 0}>
              <Bloom
                intensity={qualityProfile === "Low" ? 0.2 : 0.55}
                luminanceThreshold={0.6}
                radius={qualityProfile === "High" ? 0.9 : 0.4}
              />
            </EffectComposer>
          )}
        </Suspense>
        <OrbitControls
          enablePan
          enableRotate={!reducedMotion}
          enableZoom
          minDistance={8}
          maxDistance={70}
        />
        <CinematicCamera />
        <StatsGl />
      </Canvas>
      {showHud && <div style={overlayStyle}>Battle HUD Active</div>}
    </div>
  );
}

export default Scene;
