import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";

export default function DiagnosticsOverlay({
  updateHz = 8,
}: {
  updateHz?: number;
}) {
  const textRef = useRef<HTMLDivElement | null>(null);
  const samples = useMemo(
    () => ({ last: Date.now(), fps: 0, acc: 0, frames: 0 }),
    [],
  );
  const interval = 1000 / Math.max(1, updateHz);
  const nextUpdateRef = useRef(Date.now() + interval);

  useFrame((_, dt) => {
    const now = Date.now();
    samples.frames += 1;
    samples.acc += dt;
    if (now >= nextUpdateRef.current) {
      const fps = (samples.frames / (samples.acc || 1e-6)) | 0;
      samples.fps = fps;
      samples.frames = 0;
      samples.acc = 0;
      nextUpdateRef.current = now + interval;

      const el = textRef.current;
      if (el) {
        el.textContent = `FPS ${fps} | dt ${(dt * 1000).toFixed(1)}ms | t ${now.toFixed(0)}ms`;
      }
    }
  });

  // Use Html to render on top of the canvas without affecting scene
  return (
    <Html position={[0, 0, 0]} prepend zIndexRange={[1000, 2000]}>
      <div ref={textRef} className="diag-overlay">
        FPS …
      </div>
    </Html>
  );
}
