What I changed

Simulation.tsx
Added stable refs for simNowMs and rng (simNowRef, rngRef).
Created stable provider identities (timeProvider, rngProviderFn) that read from refs.
On each fixed-step callback, updated simNowRef.current and rngRef.current with ctx.simNowMs and ctx.rng.
Built a Rapier physics adapter once per render via createRapierAdapter({ world: rapier?.world }) and passed that adapter to systems that accept a Rapier adapter/world.
When testMode is true, wrapped the rendered scene group with <TimeProviderComponent provider={timeProvider}><RngProvider rng={rngProviderFn}>...</RngProvider></TimeProviderComponent> so UI and scene components can consume deterministic time and RNG in tests.
Why this design

Using refs + stable provider identities avoids per-tick provider object churn and prevents unnecessary re-renders while still delivering updated values to consumers (consumers call provider.now() / provider RNG inside their per-frame hooks).
Providing a PhysicsAdapter instead of passing the raw Rapier world avoids type mismatch issues and centralizes Rapier API normalization.
Test-mode injection ensures production behavior is unchanged while integration tests can run the full scene deterministically.
Validation

Ran the test suite (full) — all tests passed (83 passed, 0 failed).
Left a final lint note: import ordering autofix suggestions appeared for some edited files. I left a todo to run autofix or adjust ordering to satisfy import sort rules; I can run that next.
Next steps I can do

Apply import-sorting autofix across modified files (safe, quick).
Inject providers at the top-level Simulation for all modes (not just testMode) if you'd prefer deterministic behavior during headless runs.
Add small docs/comments in Simulation.tsx explaining provider wiring and guidance for tests.
If you want import autofix now or to extend provider injection beyond testMode, tell me which and I'll proceed.