import { Canvas } from "@react-three/fiber";
import React, { useEffect, useState } from "react";

import useUI from "../store/uiStore";
import Simulation, { SimulationFallback } from "./Simulation";
export default function Scene() {
  const [DreiHtml, setDreiHtml] = useState<React.ComponentType<{ center?: boolean; children?: React.ReactNode }> | null>(null);
  const [OrbitControlsComp, setOrbitControlsComp] =
    useState<React.ComponentType | null>(null);
  const setDreiLoading = useUI((s) => s.setDreiLoading);
  const setPhysicsAvailable = useUI((s) => s.setPhysicsAvailable);
  const setRapierDebug = useUI((s) => s.setRapierDebug);
  // dreiLoading is handled by the global LoadingOverlay; Scene no longer renders an in-canvas loading DOM.
  const [PhysicsComp, setPhysicsComp] = useState<React.ComponentType<{ gravity?: number[]; rapier?: unknown }> | null>(null);
  const [rapierModule, setRapierModule] = useState<unknown | null>(null);
  const [rapierComponents, setRapierComponents] = useState<Record<string, React.ComponentType<unknown>> | null>(null);
  const [runtimeCandidates, setRuntimeCandidates] = useState<{ name: string; obj: unknown }[] | null>(null);
  const [candidateIndex, setCandidateIndex] = useState<number>(0);
  const [shouldPassRapier, setShouldPassRapier] = useState<boolean>(false);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  // Error boundary to catch errors thrown by the Physics wrapper at mount time
  type PhysicsErrorBoundaryProps = {
    setRapierDebug: (msg: string | null) => void;
    onError?: (msg: string) => void;
    children?: React.ReactNode;
  };
  class PhysicsErrorBoundary extends React.Component<PhysicsErrorBoundaryProps, { hasError: boolean; msg?: string }> {
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
        this.props.setRapierDebug(`physics-render-error:${msg}; stack:${stack ?? '<no-stack>'}`);
      } catch {
        // ignore
      }
      try {
        const w = typeof window !== 'undefined' ? (window as unknown as { console?: { error?: (...args: unknown[]) => void } }) : undefined;
        if (w && w.console && typeof w.console.error === 'function') w.console.error('Physics render error', error);
      } catch {
        // noop
      }
      // notify parent so it can attempt a different runtime candidate
      try {
        if (this.props.onError) this.props.onError(String((error as { message?: unknown })?.message ?? String(error)));
      } catch {
        // ignore
      }
      this.setState({ hasError: true, msg: (error as { message?: unknown })?.message ? String((error as { message?: unknown })!.message) : String(error) });
    }
    render() {
      if (this.state.hasError) {
        // render a non-physics fallback simulation so app remains usable while
        // the parent may choose to retry with another runtime candidate.
        return React.createElement(Simulation, { physics: false, rapierComponents: null });
      }
      // render children (the Physics component)
      return this.props.children as React.ReactNode;
    }
  }

  // Error boundary to catch Canvas / WebGL errors (e.g. WebGL context creation)
  class CanvasErrorBoundary extends React.Component<{ setRapierDebug: (msg: string | null) => void; children?: React.ReactNode }, { hasError: boolean; msg?: string }> {
    constructor(props: { setRapierDebug: (msg: string | null) => void; children?: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }
    componentDidCatch(error: unknown) {
      try {
        const e = error as { message?: unknown; stack?: unknown };
        const stack = e && e.stack ? String(e.stack).slice(0, 1000) : undefined;
        const msg = e && e.message ? String(e.message) : String(error);
        this.props.setRapierDebug?.(`canvas-render-error:${msg}; stack:${stack ?? '<no-stack>'}`);
      } catch {
        // ignore
      }
      try {
        const w = typeof window !== 'undefined' ? (window as unknown as { console?: { error?: (...args: unknown[]) => void } }) : undefined;
        if (w && w.console && typeof w.console.error === 'function') w.console.error('Canvas render error', error);
      } catch {
        // noop
      }
      this.setState({ hasError: true, msg: (error as { message?: unknown })?.message ? String((error as { message?: unknown })!.message) : String(error) });
    }
    render() {
      if (this.state.hasError) {
        // Render a non-Canvas fallback so the app stays usable in environments
        // without WebGL (CI/headless). The Simulation component supports a
        // non-physics/non-webgl fallback via its props.
        return React.createElement(Simulation, { physics: false, rapierComponents: null });
      }
      return this.props.children as React.ReactNode;
    }
  }

  useEffect(() => {
    // Quick synchronous feature-detect for WebGL availability. We run this
    // inside an effect so it's client-only and doesn't run during SSR.
    try {
      if (typeof window === 'undefined') {
        setWebglSupported(false);
      } else {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || (canvas.getContext as any)('experimental-webgl');
        setWebglSupported(Boolean(gl));
      }
    } catch {
      setWebglSupported(false);
    }

    let mounted = true;
    // dynamically import heavy drei bits only when Scene mounts
    // signal loading start
    setDreiLoading(true);
    // safety timeout: if drei doesn't finish loading within 15s, clear the flag
    let timeoutId: number | undefined = undefined;
    if (typeof window !== 'undefined') {
      timeoutId = window.setTimeout(() => {
      if (mounted) {
        try { setRapierDebug('drei-timeout'); } catch { /* ignore */ }
        setDreiLoading(false);
      }
      }, 15000);
    }
    (async () => {
      try {
        // Start drei imports immediately so we can render DOM quickly.
        const dreiPromise = Promise.all([
          import("@react-three/drei").then((m) => m.Html),
          import("@react-three/drei").then((m) => m.OrbitControls),
        ]);

        // Start Rapier detection in the background so it doesn't block UI mounting.
        if (typeof window !== "undefined") {
          (async () => {
            try {
              // First ensure the Rapier wasm/runtime is imported and initialized.
              let rapierPkg: unknown;
              if (typeof window !== 'undefined') {
                rapierPkg = await import('@dimforge/rapier3d');
              } else {
                const rapierPkgName = "@dimforge/rapier3d";
                rapierPkg = await import(/* @vite-ignore */ rapierPkgName);
              }

              let rapierRuntime: unknown = rapierPkg;
              try {
                type InitFn = () => Promise<unknown> | unknown;
                const pkgWithInit = rapierPkg as { init?: InitFn } | undefined;
                if (pkgWithInit && typeof pkgWithInit.init === "function") {
                  const maybe = await pkgWithInit.init();
                  if (maybe) rapierRuntime = maybe;
                }
                const pkgWithDefault = rapierPkg as { default?: { init?: InitFn } | InitFn | unknown } | undefined;
                if (
                  pkgWithDefault &&
                  typeof pkgWithDefault.default === "object" &&
                  typeof (pkgWithDefault.default as { init?: InitFn }).init === "function"
                ) {
                  const maybe = await (pkgWithDefault.default as { init: InitFn }).init();
                  if (maybe) rapierRuntime = maybe;
                }
                if (pkgWithDefault && typeof pkgWithDefault.default === "function") {
                  const maybe = await (pkgWithDefault.default as InitFn)();
                  if (maybe) rapierRuntime = maybe;
                }
              } catch {
                // initialization attempt failed; fall back to the raw package.
              }

              try {
                let rapierWrapper: unknown;
                if (typeof window !== 'undefined') {
                  rapierWrapper = await import('@react-three/rapier');
                } else {
                  const rapierWrapperName = "@react-three/rapier";
                  rapierWrapper = await import(/* @vite-ignore */ rapierWrapperName);
                }
                const rapierWrapperTyped = rapierWrapper as unknown as Record<string, unknown> | undefined;
                if (rapierWrapperTyped && rapierWrapperTyped.Physics) {
                  if (mounted) {
                    // Try to pick the most appropriate Rapier runtime shape to pass
                    // into the wrapper. Some builds export the WASM runtime on
                    // `.default`, or under other wrapper shapes. We'll examine a
                    // few candidates and choose the first one exposing the
                    // low-level symbol we care about (raweventqueue_new).
                    const candidates: { name: string; obj: unknown }[] = [];
                    candidates.push({ name: 'pkg', obj: rapierPkg });
                    // pkg.default if present
                    const pkgDefault = (rapierPkg as unknown as { default?: unknown })?.default;
                    if (typeof pkgDefault !== 'undefined') candidates.push({ name: 'pkg.default', obj: pkgDefault });
                    candidates.push({ name: 'runtime', obj: rapierRuntime });
                    const runtimeDefault = (rapierRuntime as unknown as { default?: unknown })?.default;
                    if (typeof runtimeDefault !== 'undefined') candidates.push({ name: 'runtime.default', obj: runtimeDefault });
                    // also try common nested names
                    const pkgRapier = (rapierPkg as unknown as Record<string, unknown>)?.['Rapier'];
                    if (typeof pkgRapier !== 'undefined') candidates.push({ name: 'pkg.Rapier', obj: pkgRapier });
                    const runtimeRapier = (rapierRuntime as unknown as Record<string, unknown>)?.['Rapier'];
                    if (typeof runtimeRapier !== 'undefined') candidates.push({ name: 'runtime.Rapier', obj: runtimeRapier });

                    let chosen: unknown = null;
                    let chosenName = '';
                    const perCandidateKeys: string[] = [];
                    const findNested = (obj: unknown): { found?: unknown; label?: string } => {
                      if (!obj) return {};
                      const asRec = obj as Record<string, unknown>;
                      if (asRec['raweventqueue_new']) return { found: asRec, label: '' };
                      // common nested shapes
                      if (asRec['raw'] && (asRec['raw'] as Record<string, unknown>)['raweventqueue_new']) return { found: asRec['raw'], label: '.raw' };
                      if (asRec['Module'] && (asRec['Module'] as Record<string, unknown>)['raweventqueue_new']) return { found: asRec['Module'], label: '.Module' };
                      if ((asRec['default'] as Record<string, unknown>) && (asRec['default'] as Record<string, unknown>)['raweventqueue_new']) return { found: (asRec['default'] as Record<string, unknown>)['raweventqueue_new'] ? (asRec['default'] as Record<string, unknown>) : undefined, label: '.default' };
                      // last-ditch: sometimes the default is a function that returns the module
                      try {
                        const def = (obj as unknown as Record<string, unknown>)['default'];
                        if (typeof def === 'object' && def && (def as Record<string, unknown>)['raweventqueue_new']) return { found: def, label: '.default' };
                      } catch {
                        // ignore
                      }
                      return {};
                    };
                    for (const c of candidates) {
                      try {
                        if (!c.obj) {
                          perCandidateKeys.push(`${c.name}:<null>`);
                          continue;
                        }
                        const keys = Object.keys(c.obj as Record<string, unknown>);
                        perCandidateKeys.push(`${c.name}:${keys.join(',')}`);
                        if (!chosen) {
                          const res = findNested(c.obj);
                          if (res && res.found) {
                            chosen = res.found;
                            chosenName = `${c.name}${res.label ?? ''}`;
                            break;
                          }
                        }
                      } catch {
                        perCandidateKeys.push(`${c.name}:<error>`);
                      }
                    }
                    // fallback to runtime or pkg if none matched
                    if (!chosen) {
                      chosen = rapierRuntime ?? rapierPkg ?? null;
                      chosenName = rapierRuntime ? 'runtime-fallback' : rapierPkg ? 'pkg-fallback' : 'none';
                    }

                    // store the full candidate list so we can retry different
                    // runtime shapes if the Physics wrapper errors at mount time.
                    setRuntimeCandidates(candidates);
                    setCandidateIndex(0);
                    // Some Rapier builds nest the low-level symbols under
                    // properties like `raw`, `Module` or `default`. Prefer a
                    // nested shape that actually exposes `raweventqueue_new` so
                    // we pass the correct runtime into the wrapper.
                    const unwrapNested = (obj: unknown) => {
                      // Try a set of plausible nested access paths and return the
                      // first object that exposes `raweventqueue_new`. Also record
                      // attempted paths for richer diagnostics.
                      const attempts: string[] = [];
                      const tryPath = (root: unknown, path: string) => {
                        try {
                          if (!root) return undefined;
                          const parts = path.split('.').filter(Boolean);
                          let cur: any = root;
                          for (const p of parts) {
                            if (typeof cur !== 'object' || cur === null) return undefined;
                            cur = cur[p];
                          }
                          if (cur && (cur as Record<string, unknown>)['raweventqueue_new']) return cur as unknown;
                        } catch {
                          // ignore
                        }
                        return undefined;
                      };
                      if (!obj) return obj;
                      const candidatesToTry = ['','raw','Module','default','default.Module','default.raw','Rapier','Rapier.raw','rapier','rapier.default','Module.raw'];
                      for (const p of candidatesToTry) {
                        const label = p === '' ? '<self>' : p;
                        attempts.push(label);
                        const found = tryPath(obj, p);
                        if (found) {
                          // stash attemptedPaths for later debug output via closure
                          (unwrapNested as any).__attempts = attempts;
                          return found;
                        }
                      }
                      (unwrapNested as any).__attempts = attempts;
                      return obj;
                    };
                    const chosenUnwrapped = unwrapNested(chosen);
                    setRapierModule(chosenUnwrapped);
                    setPhysicsAvailable(true);
                    try {
                      const wrapperKeys = Object.keys(rapierWrapperTyped as Record<string, unknown>);
                        const hasRawEventQueue = Boolean(
                          (chosenUnwrapped && (chosenUnwrapped as Record<string, unknown>)['raweventqueue_new']) ||
                          (rapierWrapperTyped && (rapierWrapperTyped as Record<string, unknown>)['raweventqueue_new'])
                        );
                        // Only pass the rapier module into Physics when the chosen
                        // candidate exposes the low-level symbol; otherwise allow
                        // the wrapper to initialize its own runtime.
                        setShouldPassRapier(hasRawEventQueue);
                        const attempts = (unwrapNested as any).__attempts as string[] | undefined;
                        setRapierDebug(`wrapper-loaded; chosen:${chosenName}; hasRawevent:${hasRawEventQueue}; attempts:${JSON.stringify(attempts ?? [])}; candidates:[${perCandidateKeys.join('|')}]; wrapperKeys:${wrapperKeys.join(',')}`);
                    } catch {
                      try { setRapierDebug(`wrapper-loaded; chosen:${chosenName}; candidates:[${perCandidateKeys.join('|')}]`); } catch { /* ignore */ }
                    }
                    setPhysicsComp(() => rapierWrapperTyped.Physics as React.ComponentType<React.PropsWithChildren<{ gravity?: number[]; rapier?: unknown }>>);
                    setRapierComponents(() => ({
                      RigidBody: rapierWrapperTyped.RigidBody as React.ComponentType<unknown>,
                      CuboidCollider: rapierWrapperTyped.CuboidCollider as React.ComponentType<unknown>,
                      CapsuleCollider: rapierWrapperTyped.CapsuleCollider as React.ComponentType<unknown>,
                      BallCollider: rapierWrapperTyped.BallCollider as React.ComponentType<unknown>,
                    } as Record<string, React.ComponentType<unknown>>));
                  }
                } else {
                  if (mounted) {
                    setRapierModule(null);
                    setPhysicsAvailable(false);
                    try { setRapierDebug('wrapper-missing-exports'); } catch { /* ignore */ };
                  }
                }
              } catch (err) {
                if (typeof window !== 'undefined') {
                  try {
                    const w = window as unknown as { console?: { warn?: (...args: unknown[]) => void } };
                    if (w.console && typeof w.console.warn === 'function') {
                      w.console.warn('Failed to import @react-three/rapier wrapper', err);
                    }
                  } catch {
                    // swallow
                  }
                }
                if (mounted) {
                  setRapierModule(null);
                  setPhysicsAvailable(false);
                  try { setRapierDebug('wrapper-import-error'); } catch { /* ignore */ };
                }
              }
            } catch {
              if (mounted) {
                setPhysicsAvailable(false);
                try { setRapierDebug('rapier-pkg-import-failed'); } catch { /* ignore */ };
              }
            }
          })();
        }

    const [HtmlComp, OrbitComp] = await dreiPromise;

    if (!mounted) return;
    setDreiHtml(() => HtmlComp as React.ComponentType<{ center?: boolean; children?: React.ReactNode }>);
    setOrbitControlsComp(() => OrbitComp as React.ComponentType);
    // Clear the drei loading flag as soon as Html/OrbitControls are mounted so
    // the overlay goes away promptly.
    if (mounted) setDreiLoading(false);
      } finally {
        // signal loading finished
        if (mounted) setDreiLoading(false);
  if (typeof window !== 'undefined' && typeof timeoutId !== 'undefined') window.clearTimeout(timeoutId);
      }
    })();
    return () => {
  if (typeof window !== 'undefined' && typeof timeoutId !== 'undefined') window.clearTimeout(timeoutId);
      mounted = false;
    };
  }, [setDreiLoading, setPhysicsAvailable, setRapierDebug]);

  // Listen for WebGL context loss and gracefully fall back to the
  // non-WebGL Simulation so the app doesn't repeatedly attempt to create
  // a context and doesn't leave Rapier in a half-destroyed state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      try {
        setRapierDebug?.('webgl-context-lost');
        setWebglSupported(false);
        // disable physics to prevent wasm destroy races
        setPhysicsAvailable(false);
        setRapierModule(null);
      } catch {
        // ignore
      }
    };
    window.addEventListener('webglcontextlost', handler as EventListener);
    return () => {
      window.removeEventListener('webglcontextlost', handler as EventListener);
    };
  }, [setRapierDebug, setPhysicsAvailable]);

  // If we deterministically detect WebGL is unavailable, avoid mounting the
  // Canvas entirely and render a fallback Simulation. If detection hasn't
  // completed (null) we optimistically render the CanvasErrorBoundary so the
  // app can still attempt to create a context; the boundary will catch errors.
  if (webglSupported === false) {
    // Render a non-r3f fallback that does minimal ECS bootstrapping but
    // doesn't mount any r3f hooks/components.
    return React.createElement(SimulationFallback, { physics: false });
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
      {/* drei Html is loaded for external DOM usage but we avoid rendering any
          in-canvas DOM here to prevent persistent in-canvas loading text.
          The app-level LoadingOverlay (outside the Canvas) shows the loading UI. */}
      {PhysicsComp ? (
        // When Physics wrapper is available, render Simulation inside it (physics enabled).
        // We mount Physics inside an error boundary that will call back to
        // Scene to allow retrying with a different runtime candidate if it
        // throws during mount. Changing the key forces a remount for retries.
        React.createElement(
          PhysicsErrorBoundary as React.ComponentType<{
            setRapierDebug: (msg: string | null) => void;
            onError?: (msg: string) => void;
            children?: React.ReactNode;
          }>,
          { key: `physics-${candidateIndex}`, setRapierDebug, onError: (msg: string) => {
            // try next candidate if available
            try {
              const nextIndex = (candidateIndex ?? 0) + 1;
              if (runtimeCandidates && nextIndex < runtimeCandidates.length) {
                const next = runtimeCandidates[nextIndex];
                setCandidateIndex(nextIndex);
                setRapierModule(next.obj);
                if (typeof setRapierDebug === 'function') setRapierDebug(`physics-candidate-error:${msg}; trying:${next.name}`);
                return;
              }
            } catch {
              // ignore
            }
            // no more candidates: mark physics unavailable
            if (typeof setRapierDebug === 'function') setRapierDebug(`physics-failed-all-candidates:${msg}`);
            setPhysicsAvailable(false);
            setRapierModule(null);
          } },
            React.createElement(
              PhysicsComp as React.ComponentType<{ gravity?: number[]; rapier?: unknown }>,
              // Pass the (possibly unwrapped) candidate runtime into Physics so
              // the wrapper can use it to initialize. Prefer passing only the
              // runtime that actually exposes the low-level symbol; otherwise
              // allow the wrapper to initialize its own runtime.
              { gravity: [0, -9.81, 0], rapier: shouldPassRapier ? rapierModule : undefined },
              React.createElement(Simulation, { physics: true, rapierComponents }),
            )
        )
      ) : (
        // If Rapier isn't ready, render the Simulation component without physics.
        // This keeps tests and server environments from crashing; the Simulation
        // will render a non-physics fallback when physics=false.
        React.createElement(Simulation, { physics: false, rapierComponents: null })
      )}

      {OrbitControlsComp ? <OrbitControlsComp /> : null}
      </Canvas>
    </CanvasErrorBoundary>
  );
}
