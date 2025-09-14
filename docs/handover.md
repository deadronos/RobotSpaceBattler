Handover summary for the next AI agent
Below is a concise, actionable handover describing what was done, the current state, observed failure, and the prioritized next steps. Paste this into the new session or issue to pick up where we left off.

High-level summary
Project: RobotSpaceBattler (React + TypeScript + Vite + react-three-fiber + Rapier physics).
Goal: Avoid mounting <Physics/> until both the Rapier WASM/runtime and the @react-three/rapier wrapper are ready, avoid wrapper/runtime instance mismatches, surface diagnostics when physics isn't available, and keep the app usable when physics fails.
Work completed:
Removed in-canvas DOM that caused "Div is not part of the THREE namespace!" and added an app-level LoadingOverlay controlled by a Zustand dreiLoading flag.
Dynamically (runtime) imported heavy packages (@react-three/drei, @dimforge/rapier3d, @react-three/rapier) in Scene.tsx.
Implemented permissive Rapier init attempts (pkg.init, pkg.default.init, default-as-fn) and built a list of runtime "candidates" to search for the low-level symbol raweventqueue_new.
Captured wrapper exports at runtime and passed rapierComponents down to Simulation so prefabs don't import wrapper statically.
Added PhysicsErrorBoundary to catch mount-time wrapper crashes and attempt retries with alternate runtime candidates; fallbacks to non-physics Simulation exist.
Added rapierDebug string in the Zustand UI store and a DevDiagnostics UI to expose diagnostics.
Added a 15s safety timeout to clear stuck drei loading.
Current failing symptom:
Browser console shows an error from rapier_wasm3d.js like "TypeError: cannot read property 'raweventqueue_new' of undefined" and then WebGL context lost.
The app's diagnostics (DevDiagnostics/StatusBox) report hasRawevent:false — no inspected candidate exposed the required low-level symbol.
Key files touched
Scene.tsx — orchestrates dynamic imports, candidate detection, Physics mount gating, PhysicsErrorBoundary, and retry logic.
Simulation.tsx — receives rapierComponents and runs with physics=false when rapier not available.
uiStore.ts — added rapierDebug, dreiLoading, physicsAvailable, devDiagnosticsVisible state/actions.
DevDiagnostics.tsx & StatusBox — UI to display rapier debug strings and toggles.
What we already tried
Built candidate list: pkg, pkg.default, runtime, runtime.default, pkg.Rapier, runtime.Rapier.
Looked for raweventqueue_new under each candidate and some common nested props (.raw, .Module, .default).
If a candidate exposing raweventqueue_new is found, we set shouldPassRapier=true and pass the chosen runtime into <Physics rapier={chosen}>. Otherwise we let the wrapper initialize by not passing rapier.
The wrapper still crashed because raweventqueue_new was missing in all inspected shapes; hence hasRawevent:false.
Immediate next steps (handover todo list — highest priority first)
Collect rapier diagnostics (in-progress)

Open the running dev server (Vite URL; check the terminal output for the actual URL/port).
In the running app, open DevDiagnostics / StatusBox and copy the rapierDebug string (it contains chosen candidate name, hasRawevent boolean, per-candidate key lists, wrapper keys).
Open browser DevTools Console and copy the full rapier_wasm3d.js TypeError stack trace (the exact message and stack). Also copy any related warnings.
In DevTools Network tab, find rapier-related assets (.js, .wasm) and copy their request URL, HTTP status, and any messages (404, blocked, CORS). Paste all three items into the issue/session.
Purpose: determine whether a nested object has raweventqueue_new or whether the WASM file didn't load/initialize.
Save full runtime candidate snapshot

Save or paste the per-candidate key lists from rapierDebug for offline review. This shows which nested object (if any) might contain the low-level symbol.
Try passing alternative nested runtime into <Physics>

If rapierDebug shows a nested object (e.g. pkg.default.Module or pkg.Rapier.raw) with raweventqueue_new, change Scene.tsx to pass that nested object explicitly as the rapier prop to <Physics> and remount.
Keep the change minimal and add an explanatory comment. Example:
rapierCandidate = chosen['raw'] ?? chosen['Module'] ?? chosen['default'] ?? chosen;
<Physics rapier={rapierCandidate} ...>
Re-run and observe console.
If still no rawevent symbol, inspect Vite/WASM handling

Check vite.config.ts for any special wasm or plugin settings.
Inspect Network tab: is the rapier wasm fetched? is it blocked? is the server returning 404?
If the wasm isn't loaded, try a static import or ensure the runtime is initialized by the same instance the wrapper consumes (avoid duplicate rapier packages).
Possible fixes:
Ensure @dimforge/rapier3d is a single version and not duplicated by transitive deps.
Use static import: import rapier from '@dimforge/rapier3d'; then pass rapier.default or rapier.raw depending on what's present.
Add Vite config to handle wasm: add { build: { assetsInlineLimit: 0 } } or relevant plugin, or copy the wasm into public/ and import via URL to guarantee it's served.
Add dev-only diagnostic helpers

Add a small dev-only UI that prints:
typeof window.WebAssembly
navigator.userAgent
the runtimeCandidates snapshot
last wrapper error stack
This will reduce back-and-forth during debugging.
Clean up TypeScript & run tests

Fix error typing in PhysicsErrorBoundary.componentDidCatch (narrow error properly before accessing .message/.stack).
Remove leftover variables introduced during iterative edits (if any).
Run npm run lint and npm run test; fix issues until green.
Finalize fallback UI & docs

If physics can't be enabled by the environment/bundler, implement a user-facing fallback message and document the steps to debug or enable physics in README.md / SPEC.md.
Diagnostic artifacts to include in your handoff
The exact rapierDebug string shown in the UI (copy/paste).
The browser console rapier_wasm3d.js TypeError (full stack).
Network tab entries for rapier wasm/js assets (URLs + HTTP status).
The package.json dependency versions for @dimforge/rapier3d and @react-three/rapier.
Any Vite config customizations from vite.config.ts.
Helpful pointers and notes for the next agent
The relevant code is Scene.tsx (runtime imports + candidate logic) and Simulation.tsx (uses rapierComponents).
The app intentionally avoids static imports of Rapier wrapper to prevent module-instance mismatch; when passing the runtime candidate into <Physics rapier={...} /> the wrapper will try to use that runtime rather than initializing its own.
The low-level symbol is raweventqueue_new. In some Rapier builds it is nested (e.g., under Module, raw, or default) or present on .Rapier. The rapierDebug string lists per-candidate keys—inspect them carefully.
If you need to make code changes, keep them minimal and type-safe. Add unit tests for the non-physics fallback path if you change behavior.
If you can't reproduce in dev but CI/e2e fails, compare installed versions to ensure no duplication: run npm ls @dimforge/rapier3d and npm ls @react-three/rapier to see resolved versions.
If you want, I can now:

Edit Scene.tsx to pass a specific nested candidate (once you paste rapierDebug), fix TypeScript typings, run the tests and lint, and verify in the running dev server.