import React from 'react';
import useUI from '../../store/uiStore';

export default function DevDiagnostics() {
  const rapierDebug = useUI((s) => s.rapierDebug);
  const dreiLoading = useUI((s) => s.dreiLoading);
  const physicsAvailable = useUI((s) => s.physicsAvailable);
  const visible = useUI((s) => s.devDiagnosticsVisible);

  // Only show diagnostics in development builds (Vite exposes import.meta.env.DEV)
  // Fall back to showing the panel if the env check isn't available.
  // Safely check Vite's import.meta.env.DEV without using 'any'
  const meta: unknown = typeof import.meta !== 'undefined' ? import.meta : undefined;
  let isDev = true;
  try {
    const m = meta as { env?: { DEV?: boolean } } | undefined;
    if (m && typeof m.env !== 'undefined' && typeof m.env.DEV !== 'undefined') {
      isDev = Boolean(m.env.DEV);
    }
  } catch {
    // default to true
    isDev = true;
  }
  if (!isDev) return null;
  if (!visible) return null;

  return (
    <div className="dev-diagnostics">
      <div><strong>Dev Diagnostics</strong></div>
      <div>rapierDebug: {rapierDebug ?? '—'}</div>
      <div>dreiLoading: {dreiLoading ? 'loading' : 'idle'}</div>
      <div>physicsAvailable: {physicsAvailable ? 'true' : 'false'}</div>
    </div>
  );
}
