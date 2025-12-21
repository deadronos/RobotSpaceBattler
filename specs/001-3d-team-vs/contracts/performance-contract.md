# Performance Contract (As Implemented)

This repository does not currently implement a formal, automated performance acceptance harness.
Instead, it provides:

- Renderer frame stats captured into a global snapshot (`window.__rendererStats`).
- Manual quality toggles (instancing enablement and max instance budgets).
- Optional debug UI panels for performance tuning.

## Available Instrumentation

### Renderer Stats

The renderer frame loop records per-frame draw/memory metrics:

- `window.__rendererStats.drawCalls`
- `window.__rendererStats.triangles`
- `window.__rendererStats.geometries`
- `window.__rendererStats.textures`
- `window.__rendererStats.frameTimeMs`

See `src/visuals/rendererStats.ts`.

### Quality Settings

Quality settings can be read/modified via the global quality manager:

- `window.__qualityManager`

See `src/state/quality/QualityManager.ts`.

## Manual Validation Checklist

1. Start the dev server (`npm run dev`).
2. Run a battle to completion; verify that performance remains interactive.
3. Open Settings and enable Debug UI.
4. Toggle instancing on/off; observe impact on draw calls and visual fidelity.
5. Adjust max instances to observe projectile/effect throttling behavior.

## Not Implemented

These items were mentioned in earlier draft requirements but are not implemented:

- Automatic quality scaling based on FPS thresholds.
- Time dilation / simulation time-scale reduction.
- In-game performance warning overlays.

