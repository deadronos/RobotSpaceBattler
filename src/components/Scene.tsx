import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import React, { useEffect, useState } from 'react';

import useUI from '../store/uiStore';
import Simulation, { SimulationFallback } from './Simulation';

/**
 * Scene
 * A compact, clear refactor of the previous Scene implementation.
 * - Uses static imports for @react-three/fiber, @react-three/drei and @react-three/rapier
 * - Feature-detects WebGL in a client-only effect and renders a non-R3F fallback
 * - Wraps the Physics provider in an error boundary that renders a non-R3F
 *   fallback when physics initialization/rendering fails
 * - Defers mounting OrbitControls one animation frame after the Canvas mounts
 * - Reports simple diagnostics to the UI store via useUI()
 */
interface PhysicsErrorBoundaryProps {
  setRapierDebug: (msg: string | null) => void;
  onError?: (msg: string) => void;
  children?: React.ReactNode;
}

interface CanvasErrorBoundaryProps {
  setRapierDebug: (msg: string | null) => void;
  children?: React.ReactNode;
}

export default function Scene(): React.ReactElement {
  const setDreiLoading = useUI((s) => s.setDreiLoading);
  const setPhysicsAvailable = useUI((s) => s.setPhysicsAvailable);
  const setRapierDebug = useUI((s) => s.setRapierDebug);

  // null = unknown, true = supported, false = unsupported
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [showControls, setShowControls] = useState(false);

  // All Rapier components are statically imported and used directly in children.

  // Simple error-boundary that catches errors inside the Physics tree and
  // falls back to a non-R3F SimulationFallback. Implemented as a class
  // because React error boundaries must be classes.
  class PhysicsErrorBoundary extends React.Component<PhysicsErrorBoundaryProps, { hasError: boolean; msg?: string }> {
    constructor(props: PhysicsErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false };
    }
    componentDidCatch(error: unknown) {
      try {
        const e = error as { message?: unknown; stack?: unknown };
        const stack = e && e.stack ? String(e.stack).slice(0, 1000) : '<no-stack>';
        const msg = e && e.message ? String(e.message) : String(error);
        this.props.setRapierDebug?.(`physics-render-error:${msg}; stack:${stack}`);
      } catch {
        // ignore
      }
      try {
        if (this.props.onError) this.props.onError(String(error));
      } catch {
        // ignore
      }
      this.setState({ hasError: true, msg: String(error) });
    }
    render() {
      if (this.state.hasError) return React.createElement(SimulationFallback, {});
      return this.props.children as React.ReactNode;
    }
  }

  // Canvas/WebGL-level errors: fall back to non-R3F simulation if the Canvas
  // fails to mount (e.g. headless/CI without WebGL).
  class CanvasErrorBoundary extends React.Component<CanvasErrorBoundaryProps, { hasError: boolean; msg?: string }> {
    constructor(props: CanvasErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false };
    }
    componentDidCatch(error: unknown) {
      try {
        const e = error as { message?: unknown; stack?: unknown };
        const stack = e && e.stack ? String(e.stack).slice(0, 1000) : '<no-stack>';
        const msg = e && e.message ? String(e.message) : String(error);
        this.props.setRapierDebug?.(`canvas-render-error:${msg}; stack:${stack}`);
      } catch {
        // ignore
      }
      this.setState({ hasError: true, msg: String(error) });
    }
    render() {
      if (this.state.hasError) return React.createElement(SimulationFallback, {});
      return this.props.children as React.ReactNode;
    }
  }

  // Run a client-only WebGL feature-detect and initialize UI flags.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        setWebglSupported(false);
      } else {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        setWebglSupported(Boolean(gl));
      }
    } catch {
      setWebglSupported(false);
    }

    // Drei and Rapier are statically imported; update the UI store so other
    // parts of the app know they're available.
    try {
      setDreiLoading(false);
    } catch {
      /* ignore */
    }
    try {
      setPhysicsAvailable(true);
    } catch {
      /* ignore */
    }
    try {
      setRapierDebug?.('static-imports');
    } catch {
      /* ignore */
    }
  }, [setDreiLoading, setPhysicsAvailable, setRapierDebug]);

  // If WebGL context is lost, disable physics and fall back to non-WebGL
  // rendering so the app doesn't continually attempt to recreate contexts.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      try {
        setRapierDebug?.('webgl-context-lost');
        setWebglSupported(false);
        setPhysicsAvailable(false);
      } catch {
        // ignore
      }
    };
    // use the same unknown cast pattern as the original code to avoid DOM lib
    // type dependencies in environments where lib.dom isn't available.
    window.addEventListener('webglcontextlost', handler as unknown as (e: unknown) => void);
    return () => window.removeEventListener('webglcontextlost', handler as unknown as (e: unknown) => void);
  }, [setRapierDebug, setPhysicsAvailable]);

  // Defer mounting OrbitControls one frame after the Canvas is ready to avoid
  // certain R3F timing issues where controls access the store too early.
  useEffect(() => {
    if (webglSupported === false) return;
    let raf: number | undefined;
    try {
      if (typeof window !== 'undefined') {
        raf = window.requestAnimationFrame(() => setShowControls(true));
      } else {
        setShowControls(true);
      }
    } catch {
      setShowControls(true);
    }
    return () => {
      if (typeof window !== 'undefined' && raf) window.cancelAnimationFrame(raf);
      setShowControls(false);
    };
  }, [webglSupported]);

  // If we deterministically know WebGL is unavailable, render a plain
  // non-R3F fallback (still render a plain <canvas/> for layout/tests).
  if (webglSupported === false) {
    return (
      <>
        <canvas className="placeholder-canvas" aria-hidden="true" />
        <SimulationFallback />
      </>
    );
  }

  // (rapierComponents is memoized earlier) - nothing to do here.

  return (
    <CanvasErrorBoundary setRapierDebug={setRapierDebug}>
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

        <PhysicsErrorBoundary
          setRapierDebug={setRapierDebug}
          onError={(msg: string) => {
            setRapierDebug?.(`physics-mount-error:${msg}`);
            setPhysicsAvailable(false);
          }}
        >
          <Physics gravity={[0, -9.81, 0]}>
            <Simulation physics={true} />
          </Physics>
        </PhysicsErrorBoundary>

        {showControls ? <OrbitControls /> : null}
      </Canvas>
    </CanvasErrorBoundary>
  );
}
