import "./index.css";

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { world } from "./ecs/miniplexStore";
import { resetAndSpawnDefaultTeams } from "./robots/spawnControls";

// Ensure the world has the default teams populated before React mounts so
// that any query connections created during the first render will see the
// initial entities and render them immediately.
if (world.entities.length === 0) {
  try {
    resetAndSpawnDefaultTeams();
  } catch {
    // ignore errors during early dev-time boot
  }
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// DEV: expose ECS world for end-to-end debugging and automated checks
// dev-only debug hooks removed
