import { useEffect, useRef } from 'react';
import type { CameraControlsResult } from '../hooks/useCameraControls';
import type { UiAdapter } from './uiAdapter';

interface CameraUiIntegratorProps {
  adapter: UiAdapter;
  controls: CameraControlsResult;
}

export function CameraUiIntegrator({ adapter, controls }: CameraUiIntegratorProps) {
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = performance.now();

      // compute delta in seconds and call controls.update so keyboard-driven
      // motion is reflected in the controls' computed position/target
      const last = lastTime.current ?? now;
      const deltaMs = Math.max(0, now - last);
      const deltaSec = deltaMs / 1000;
      lastTime.current = now;

      try {
        // Some control implementations expect seconds; protect with try/catch
        if (typeof controls.update === 'function') controls.update(deltaSec);
      } catch (e) {
        // swallow to avoid breaking the render loop in tests
      }

      const pos = controls.position;
      const tgt = controls.target;

      const snapshot = {
        camera: {
          position: [pos.x, pos.y, pos.z] as [number, number, number],
          target: [tgt.x, tgt.y, tgt.z] as [number, number, number],
          up: [0, 1, 0] as [number, number, number],
        },
        time: now,
        interpolationFactor: 1,
      };

      // Forward the live camera snapshot into the adapter (allocation-light via adapter implementation)
      try {
        adapter.setFrameSnapshot(snapshot);
      } catch (e) {
        // tolerate missing adapter implementations during tests
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [adapter, controls]);

  return null;
}

export default CameraUiIntegrator;
