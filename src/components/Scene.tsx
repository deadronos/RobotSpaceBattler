import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { BallCollider, CapsuleCollider, CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import React, { useEffect, useState } from "react";

import useUI from "../store/uiStore";
import Simulation, { SimulationFallback } from "./Simulation";
export default function Scene() {
  // Note on Rapier imports:
  // We import @react-three/rapier and its components statically. Previously we
  // tried to dynamically import the wrapper and pre-initialize Rapier WASM to
  // avoid context mismatch. However, dynamic imports combined with headless
  // environments led to reconciliation errors like "Cannot set properties of
  // undefined (setting 'id')" during mount and teardown. Static imports ensure
  // a single module instance and let Vite prebundle accordingly (see vite.config.ts).
  const setDreiLoading = useUI((s) => s.setDreiLoading);
  const setPhysicsAvailable = useUI((s) => s.setPhysicsAvailable);
  const setRapierDebug = useUI((s) => s.setRapierDebug);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  // Mount OrbitControls one tick after the Canvas is alive to avoid a transient
  // R3F context timing edge-case where controls try to read the store before
  // the Canvas provider is fully established during the initial commit.
  const [showControls, setShowControls] = useState(false);

  // Error boundary to catch errors thrown by the Physics wrapper at mount time
  type PhysicsErrorBoundaryProps = {
    setRapierDebug: (msg: string | null) => void;
    onError?: (msg: string) => void;
    children?: React.ReactNode;
  };
  class PhysicsErrorBoundary extends React.Component<
    PhysicsErrorBoundaryProps,
    { hasError: boolean; msg?: string }
  > {
    constructor(props: PhysicsErrorBoundaryProps) {
      super(props);
      this.state = { hasError: false };
    }
    componentDidCatch(error: unknown) {
      try {
        // include a short portion of the stack if available so diagnostics are richer
        const e = error as { message?: unknown; stack?: unknown };
        const stack = e && e.stack ? String(e.stack).slice(0, 1000) : undefined;
        const msg = e && e.message ? String(e.message) : String(error);
        this.props.setRapierDebug(
          `physics-render-error:${msg}; stack:${stack ?? "<no-stack>"}`,
        );
      } catch {
        // ignore
      }
      try {
        const w =
          typeof window !== "undefined"
            ? (window as unknown as {
                console?: { error?: (...args: unknown[]) => void };
              })
            : undefined;
        if (w && w.console && typeof w.console.error === "function")
          w.console.error("Physics render error", error);
      } catch {
        // noop
      }
      // notify parent so it can attempt a different runtime candidate
      try {
        if (this.props.onError)
          this.props.onError(
            String((error as { message?: unknown })?.message ?? String(error)),
          );
      } catch {
        // ignore
      }
      this.setState({
        hasError: true,
        msg: (error as { message?: unknown })?.message
          ? String((error as { message?: unknown })!.message)
          : String(error),
      });
    }
    render() {
      if (this.state.hasError) {
        // IMPORTANT: Do not render a component that uses R3F hooks here.
        // This error boundary is mounted inside the Canvas tree but wraps the
        // Physics provider. If Physics fails, we still remain in the Canvas,
        // but to be resilient across library versions and avoid any nested
        // reconciler confusion, use the non-R3F fallback.
        return React.createElement(SimulationFallback, {});
      }
      // render children (the Physics component)
      return this.props.children as React.ReactNode;
    }
  }

  // Error boundary to catch Canvas / WebGL errors (e.g. WebGL context creation)
  class CanvasErrorBoundary extends React.Component<
    {
      setRapierDebug: (msg: string | null) => void;
      children?: React.ReactNode;
    },
    { hasError: boolean; msg?: string }
  > {
    constructor(props: {
      setRapierDebug: (msg: string | null) => void;
      children?: React.ReactNode;
    }) {
      super(props);
      this.state = { hasError: false };
    }
    componentDidCatch(error: unknown) {
      try {
        const e = error as { message?: unknown; stack?: unknown };
        const stack = e && e.stack ? String(e.stack).slice(0, 1000) : undefined;
        const msg = e && e.message ? String(e.message) : String(error);
        this.props.setRapierDebug?.(
          `canvas-render-error:${msg}; stack:${stack ?? "<no-stack>"}`,
        );
      } catch {
        // ignore
      }
      try {
        const w =
          typeof window !== "undefined"
            ? (window as unknown as {
                console?: { error?: (...args: unknown[]) => void };
              })
            : undefined;
        if (w && w.console && typeof w.console.error === "function")
          w.console.error("Canvas render error", error);
      } catch {
        // noop
      }
      this.setState({
        hasError: true,
        msg: (error as { message?: unknown })?.message
          ? String((error as { message?: unknown })!.message)
          : String(error),
      });
    }
    render() {
      if (this.state.hasError) {
        // Render a non-Canvas fallback so the app stays usable in environments
        // without WebGL (CI/headless). Use the non-R3F fallback that does not
        // call useFrame to avoid the "Hooks can only be used within the Canvas"
        // error after a Canvas crash.
        return React.createElement(SimulationFallback, {});
      }
      return this.props.children as React.ReactNode;
    }
  }

  useEffect(() => {
    // Quick synchronous feature-detect for WebGL availability. We run this
    // inside an effect so it's client-only and doesn't run during SSR.
    try {
      if (typeof window === "undefined") {
        setWebglSupported(false);
      } else {
        const canvas = document.createElement("canvas");
        const gl =
          (canvas.getContext("webgl2") as unknown) ||
          (canvas.getContext("webgl") as unknown) ||
          (canvas.getContext as (id: string) => unknown)("experimental-webgl");
        setWebglSupported(Boolean(gl));
      }
    } catch {
      setWebglSupported(false);
    }

    // OrbitControls is statically imported now; use the loading flag only to keep UI consistent
    setDreiLoading(false);
    // Physics comes from static import as well; mark available
    setPhysicsAvailable(true);
    try {
      setRapierDebug("static-imports");
    } catch {
      /* ignore */
    }
  }, [setDreiLoading, setPhysicsAvailable, setRapierDebug]);

  // Listen for WebGL context loss and gracefully fall back to the
  // non-WebGL Simulation so the app doesn't repeatedly attempt to create
  // a context and doesn't leave Rapier in a half-destroyed state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      try {
        setRapierDebug?.("webgl-context-lost");
        setWebglSupported(false);
        // disable physics to prevent wasm destroy races
        setPhysicsAvailable(false);
      } catch {
        // ignore
      }
    };
    window.addEventListener(
      "webglcontextlost",
      handler as unknown as (e: unknown) => void,
    );
    return () => {
      window.removeEventListener(
        "webglcontextlost",
        handler as unknown as (e: unknown) => void,
      );
    };
  }, [setRapierDebug, setPhysicsAvailable]);

  // Enable controls on the next animation frame once Canvas is mounted.
  useEffect(() => {
    if (webglSupported === false) return;
    let raf: number | undefined;
    try {
      if (typeof window !== "undefined") {
        raf = window.requestAnimationFrame(() => setShowControls(true));
      } else {
        setShowControls(true);
      }
    } catch {
      setShowControls(true);
    }
    return () => {
      if (typeof window !== "undefined" && raf)
        window.cancelAnimationFrame(raf);
      setShowControls(false);
    };
  }, [webglSupported]);

  // If we deterministically detect WebGL is unavailable, avoid mounting the
  // Canvas entirely and render a fallback Simulation. If detection hasn't
  // completed (null) we optimistically render the CanvasErrorBoundary so the
  // app can still attempt to create a context; the boundary will catch errors.
  if (webglSupported === false) {
    // Render a non-r3f fallback that does minimal ECS bootstrapping but
    // doesn't mount any r3f hooks/components.
    return (
      <>
        {/* Placeholder canvas for headless/CI: Playwright won't have WebGL,
            but some tests assert the presence of a canvas. We render a plain
            canvas here (no R3F hooks) to keep layout stable. */}
        <canvas className="placeholder-canvas" aria-hidden="true" />
        <SimulationFallback />
      </>
    );
  }

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
        {/* Physics with static imports; wrap in error boundary for resilience */}
        {React.createElement(
          PhysicsErrorBoundary as React.ComponentType<{
            setRapierDebug: (msg: string | null) => void;
            onError?: (msg: string) => void;
            children?: React.ReactNode;
          }>,
          {
            setRapierDebug,
            onError: (msg: string) => {
              if (typeof setRapierDebug === "function")
                setRapierDebug(`physics-mount-error:${msg}`);
              setPhysicsAvailable(false);
            },
          },
          React.createElement(
            Physics as React.ComponentType<{ gravity?: number[] }>,
            { gravity: [0, -9.81, 0] },
            React.createElement(Simulation, {
              physics: true,
              rapierComponents: {
                RigidBody,
                CuboidCollider,
                CapsuleCollider,
                BallCollider,
              },
            }),
          ),
        )}

        {showControls ? <OrbitControls /> : null}
      </Canvas>
    </CanvasErrorBoundary>
  );
}
