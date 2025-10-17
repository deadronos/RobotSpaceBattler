# research.md

## Purpose
Resolve NEEDS CLARIFICATION items and capture Phase 0 decisions for feature `003-extend-placeholder-create`.

### Decision: Renderer-Simulation Timing Strategy
- Decision: Hybrid approach. The simulation is the source of truth; the renderer follows simulation timestamps but uses interpolation/extrapolation to smooth visuals. A developer-facing frame-step debug mode is supported.
- Rationale: Keeps authoritative simulation decoupled from rendering frame rate while preserving deterministic replay and preventing simulation state corruption when the renderer lags.
- Alternatives considered: renderer-locked playback (simpler but may drop simulation accuracy on low framerate) and simulation-locked playback (may cause janky visuals). Rejected due to lack of determinism or poor UX.

### Decision: MatchTrace Timestamp Format
- Decision: Include both `timestampMs` (integer ms since match start) and optional `frameIndex` (integer). Each event also includes an optional `sequenceId` to break ties.
- Rationale: `timestampMs` serves as the primary monotonic timebase; `frameIndex` allows frame-stepped debugging and deterministic replay when needed. `sequenceId` ensures stable ordering.
- Alternatives: Use only frameIndex (fragile for variable frame rates) or only timestampMs (ok but loses frame-step debugging). Both rejected.

### Decision: Deterministic Replays & RNG
- Decision: Record and expose a single integer `rngSeed` in MatchTrace metadata. Replays must seed the RNG with this value and use the same RNG algorithm to reproduce results.
- Rationale: Guarantees reproducible simulation outcomes across replay runs and environments where the RNG algorithm is stable.
- Notes: Implementation will document RNG algorithm choice and provide a compatibility note for future changes.

### Decision: Contract Validator Implementation
- Decision: Implement a TypeScript JSON Schema validator using `ajv` and write Vitest tests. Place schemas under `specs/003-extend-placeholder-create/schemas/` and tests under `tests/`.
- Rationale: Aligns with repo TypeScript toolchain and allows CI integration.
- Alternatives: Python-based validator or manual checks. Rejected due to mismatch with PM's requirement for TypeScript and repo stack.

### Decision: MatchTrace Event Types and Shape
- Decision: Support event types: `spawn`, `move`, `fire`, `hit`, `damage`, `death`, `score`. `hit` and `damage` are separate events with defined shapes to allow precise replay validation.
- Rationale: Separating collision detection (`hit`) from health changes (`damage`) makes replay verification clearer and allows decoupling of physics and game rules.

### Implementation Notes / Next Steps
- Create JSON Schemas:
  - `specs/003-extend-placeholder-create/schemas/team.schema.json`
  - `specs/003-extend-placeholder-create/schemas/matchtrace.schema.json`
- Add a contract validator test `tests/contract-validator.spec.ts` that loads example payloads and asserts schema validity using `ajv`.
- Update plan.md with Technical Context (language, deps) during Phase 1.

# End of research
