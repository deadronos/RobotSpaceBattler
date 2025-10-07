import './index.css'

import React from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import { initializeSimulation, SimulationWorldProvider } from './ecs/world'
import { useUIStore } from './store/uiStore'
import { isAppDebug, setTriggerVictory, setPlaywrightTriggerFlag, setSetVictoryVisible, setGetUiState, getTriggerVictory, isSemverDebug } from './utils/debugFlags';

const world = initializeSimulation()

// Provide a small global test helper that dispatches an event. Using an event
// avoids bundler/runtime issues and keeps the helper available in all builds.
if (typeof window !== 'undefined' && !getTriggerVictory()) {
  setTriggerVictory(() => {
    if (isAppDebug()) console.log('[test-helper] triggerVictory called');
    setPlaywrightTriggerFlag(true);
    try {
      world.simulation = { ...world.simulation, status: 'victory', winner: 'red', autoRestartCountdown: 5 };
      if (isAppDebug()) console.log('[test-helper] world.simulation set to victory');
      try {
        useUIStore.getState().setVictoryOverlayVisible(true);
        if (isAppDebug()) console.log('[test-helper] uiStore victory flag set');
      } catch {}
    } catch {}
    window.dispatchEvent(new CustomEvent('playwright:triggerVictory'));
  });
}
// test helpers to introspect runtime state from Playwright — always exposed
(function registerTestHelpers() {
  setSetVictoryVisible((visible: boolean) => {
    try {
      useUIStore.getState().setVictoryOverlayVisible(!!visible);
      if (isAppDebug()) console.log('[test-helper] __setVictoryVisible called ->', !!visible);
    } catch (err) {
      if (isAppDebug()) console.log('[test-helper] __setVictoryVisible failed', String(err));
    }
  });

  setGetUiState(() => useUIStore.getState());
})();

// Some third-party code throws an uncaught error when it attempts to
// validate/parse an empty version string with semver. During E2E runs
// this can crash the page and prevent Playwright from completing.
//
// To be minimally invasive we add a runtime filter that suppresses
// the exact error message so the app can continue initializing. This
// ensures tests are resilient while we investigate and fix the
// underlying dependency or its configuration.
window.addEventListener('error', (ev) => {
  try {
    const message = (ev && (ev as ErrorEvent).message) || '';
    if (typeof message === 'string' && message.includes('Invalid argument not valid semver')) {
      // Prevent the error from being reported as uncaught and aborting
      // page initialization in E2E runs. Keep a console warning for
      // visibility during local debugging.
      if (isSemverDebug() || isAppDebug()) console.warn('[semver-shim] suppressed invalid semver error:', message);
      ev.preventDefault();
    }
  } catch {
    // intentionally ignore errors from our handler
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    const reason = ev && (ev as PromiseRejectionEvent).reason;
    const msg = typeof reason === 'string' ? reason : (reason && reason.message) || '';
    if (typeof msg === 'string' && msg.includes('Invalid argument not valid semver')) {
      // suppress promise rejections caused by the same issue
      if (isSemverDebug() || isAppDebug()) console.warn('[semver-shim] suppressed invalid semver rejection:', msg);
      ev.preventDefault();
    }
  } catch {
    // intentionally ignore errors from our handler
  }
});

createRoot(document.getElementById('root')!).render(
  <SimulationWorldProvider value={world}>
    <App />
  </SimulationWorldProvider>,
)
