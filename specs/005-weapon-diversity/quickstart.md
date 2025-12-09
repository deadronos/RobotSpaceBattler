---
# Quickstart — Weapon Diversity Feature (005)

## How to Run Deterministic Tests & Dev Flows

### 1. Automated 10v10 Observer Match
- Launch the simulation using the main UI or test harness.
- Ensure observer mode is active (no robot control).
- Verify 10 red and 10 blue robots spawn and fight autonomously.
- Observe distinct weapon visuals (rockets, lasers, guns).
- End-to-end match trace is recorded for replay.

### 2. RPS Duel Matrix Validation
- Use the test harness to run 30+ duels for each weapon pairing.
- Check win rates and damage totals in the in-memory telemetry aggregator and MatchTrace file.
- Assert advantaged archetype wins ≥70% of trials.

### 3. Rocket AoE & Laser Beam Visuals
- Trigger rocket impacts and laser firings in test scenarios.
- Confirm explosion VFX and beam/tracer alignment with damage logs.

### 4. Quality Scaling Tests
- Adjust performance/quality settings in the UI.
- Verify VFX density and simulation correctness at different frame budgets.

### 5. VFX Instancing Toggle & Perf Harness
- Enable or disable instanced rendering by setting the environment flag `REACT_APP_VFX_INSTANCING=1` (or pass `?instancing=1` in the URL for ad-hoc runs).
- Use the in-app Quality menu (or `window.__qualityManager.setInstancingEnabled(true|false)`) to flip instancing at runtime for parity checks.
- Run the automated draw-call comparison harness:

```bash
npm run perf:vfx-instancing -- --skip-build
```

- Inspect the console output for baseline vs instanced draw-call counts and recent instancing telemetry events.

### 6. Telemetry & Test Hooks
- Inspect telemetry events for weapon actions in both in-memory and persisted MatchTrace.
- Use API endpoints (see contracts) for automated event emission and duel runs.

---
## Dev Environment
- All tests and flows are deterministic and replayable.
- Placeholder assets are used for visuals until final art/sound delivery.
- See `data-model.md` and `contracts/` for entity and API details.
