import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export function useFpsSampler(
  checkIntervalMs: number,
  onSample: (fps: number) => void,
) {
  const onSampleRef = useRef(onSample);
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());

  useEffect(() => {
    onSampleRef.current = onSample;
  }, [onSample]);

  useFrame(() => {
    frameCount.current += 1;
    const time = performance.now();
    const elapsed = time - lastTime.current;

    if (elapsed >= checkIntervalMs) {
      const fps = (frameCount.current * 1000) / elapsed;
      frameCount.current = 0;
      lastTime.current = time;
      onSampleRef.current(fps);
    }
  });
}
