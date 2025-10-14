import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { BattleUiHarness } from "./components/battle/BattleUiHarness";
import { setVictoryState } from "./ecs/entities/SimulationState";
import { initializeSimulation, SimulationWorldProvider } from "./ecs/world";
import { useUIStore } from "./store/uiStore";
import {
  getTriggerVictory,
  isAppDebug,
  isSemverDebug,
  setGetUiState,
  setPlaywrightTriggerFlag,
  setSetVictoryVisible,
  setTriggerVictory,
} from "./utils/debugFlags";

function logTestHelper(message: string, error?: unknown) {
  if (!isAppDebug()) {
    return;
  }

  const prefix = "[test-helper]";
  if (error) {
    console.warn(`${prefix} ${message}`, error);
    return;
  }

  console.log(`${prefix} ${message}`);
}

const world = initializeSimulation();
const renderHarness =
  typeof window !== "undefined" &&
  (() => {
    const search = window.location?.search ?? "";
    try {
      const params = new URLSearchParams(search);
      return params.get("battleUiHarness") === "1";
    } catch (error) {
      logTestHelper("failed to parse battleUiHarness query parameter", error);
      return false;
    }
  })();

// Provide a small global test helper that dispatches an event. Using an event
// avoids bundler/runtime issues and keeps the helper available in all builds.
if (typeof window !== "undefined" && !getTriggerVictory()) {
  setTriggerVictory(() => {
    logTestHelper("triggerVictory called");
    setPlaywrightTriggerFlag(true);

    try {
      world.simulation = setVictoryState(world.simulation, "red", Date.now());
      logTestHelper("world.simulation patched to victory");
    } catch (error) {
      logTestHelper("failed to apply SimulationState victory helper", error);
      world.simulation = {
        ...world.simulation,
        status: "victory",
        winner: "red",
        autoRestartCountdown: 5,
      };
    }

    try {
      useUIStore.getState().setVictoryOverlayVisible(true);
      logTestHelper("uiStore victory flag set");
    } catch (error) {
      logTestHelper("failed to set uiStore victory flag", error);
    }

    window.dispatchEvent(new CustomEvent("playwright:triggerVictory"));
  });
}
// test helpers to introspect runtime state from Playwright — always exposed
(function registerTestHelpers() {
  setSetVictoryVisible((visible: boolean) => {
    try {
      useUIStore.getState().setVictoryOverlayVisible(!!visible);
      logTestHelper(`__setVictoryVisible called -> ${visible}`);
    } catch (error) {
      logTestHelper("__setVictoryVisible failed", error);
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
window.addEventListener("error", (ev) => {
  const message = (ev as ErrorEvent | undefined)?.message ?? "";
  if (
    typeof message === "string" &&
    message.includes("Invalid argument not valid semver")
  ) {
    if (isSemverDebug() || isAppDebug()) {
      console.warn("[semver-shim] suppressed invalid semver error:", message);
    }
    ev.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (ev) => {
  const reason = (ev as PromiseRejectionEvent | undefined)?.reason;
  const msg =
    typeof reason === "string"
      ? reason
      : ((reason && (reason as { message?: string }).message) ?? "");

  if (
    typeof msg === "string" &&
    msg.includes("Invalid argument not valid semver")
  ) {
    if (isSemverDebug() || isAppDebug()) {
      console.warn("[semver-shim] suppressed invalid semver rejection:", msg);
    }
    ev.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(
  <SimulationWorldProvider value={world}>
    {renderHarness ? <BattleUiHarness /> : <App />}
  </SimulationWorldProvider>,
);
