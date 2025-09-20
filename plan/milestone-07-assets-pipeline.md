Milestone 07 — Assets & Art Pipeline
===================================

Goal
----
Provide a documented, repeatable pipeline for artists and engineers to produce game-ready assets (primarily glTF) for RobotSpaceBattler. This milestone delivers a repository layout, export/import guidelines, a small set of example assets, a validator script to catch common export problems, and CI checks that ensure required assets exist and meet minimal constraints.

Contract (inputs/outputs)
-------------------------
- Inputs: source art files (Blender .blend, high-res textures), artist-provided glTF exports.
- Outputs: optimized glTF(s) and texture bundles placed under `public/assets/` for runtime loading.
- Error modes: missing required files, glTF schema issues, incorrect units/orientation, missing metadata.
- Success criteria: runtime can load placeholder example assets; CI validates required assets and the validator script exits 0 on known-good assets and non-zero on bad exports.

Scope & assumptions
-------------------
- Focus on glTF (GLB) as canonical runtime format. Assume artists use Blender or similar to export glTF.
- We'll keep tooling lightweight (Node.js + small dependency set), no large native tooling.
- The repo uses Vite dev server; assets placed under `public/` will be served as-is.

High-level tasks
----------------
1. Create repository asset layout and docs.
2. Add `docs/assets.md` with naming conventions and glTF/Blender export settings.
3. Add small example GLB(s) into `public/assets/examples/` (placeholder robot and simple material + texture).
4. Implement `scripts/validate-assets.ts` (Node script) to check GLB presence and basic validation (has nodes, unit scale metadata, up-axis if present, required metadata fields).
5. Wire a Vitest test or CI step to run the validator against the examples and required assets.
6. Document developer and artist workflows in README and `plan/` files.

Detailed implementation steps
-----------------------------

Task A — Repository layout (files to add)
- Create `assets/` (source-only docs) with subfolders:
  - `assets/sources/` (artist source files, not committed if large) — include a README explaining recommended use and .gitignore guidance.
  - `assets/exports/` (intermediate exported GLTFs/GLBs)
  - `assets/pipeline/` (tools and scripts; small helper scripts may live in `scripts/` instead)
  - `public/assets/examples/` (committed small GLB examples + textures)

Task B — `docs/assets.md`
- Create `docs/assets.md` covering:
  - Naming conventions (kebab-case for files, prefixing robot types: robot-[type]-v01.glb)
  - Units: meters, Blender scale 1.0, apply transforms before export
  - Up axis: +Y (if project uses Y-up) — if repo uses Z-up, document accordingly (check `SPEC.md`); include exact exporter toggles.
  - Materials: PBR metallic-roughness, baseColor texture + normal + metallicRoughness/ORM where possible.
  - Texture formats: PNG for sRGB color maps, KTX2/ETC2 for compressed target (optional), normal maps linear.
  - LODs: recommended naming `modelname_lod0.glb`, `modelname_lod1.glb`.
  - Metadata: include a top-level `asset.extras` object with fields: author, source (filename), version, date.
  - Checklist pre-commit: apply transforms, clear unused nodes, pack textures, set origin/pivot, check scale.
  - Blender export settings: sample toggles for export (Export Selected, +Y Up or +Z Up, Apply Modifiers, Include Tangents, etc.)

Task C — Example assets
- Add a small robot placeholder GLB (single mesh, simple material, 512px texture, under 150KB if possible) into `public/assets/examples/robot-placeholder.glb` and a README describing how to regenerate it.
- Keep assets permissively licensed (public domain / CC0) and document provenance.

Task D — Validator script
- Implement `scripts/validate-assets.ts` (TypeScript Node script) with these responsibilities:
  - Walk a configured list of required assets (config inline or `package.json` field).
  - For each GLB: use `@loaders.gl/gltf` or `gltf-transform` (lean choice: `gltf-validator` or `gltf-pipeline`) to perform a quick schema check.
  - Check for metadata: confirm `asset.extras.author` and `asset.extras.source` exist.
  - Check file sizes and texture presence (warn if textures missing or if file too large > 5MB default).
  - Exit status: 0 if all pass, non-zero with helpful diagnostics if failures.

Implementation notes and minimal dependency choices
--------------------------------------------------
- Prefer `gltf-validator` (npm package `gltf-validator`) for schema validation and `gltf-pipeline` for optional optimization / draco compress.
- Keep dependencies optional and behind a `npm run assets:validate` script.

Task E — CI and tests
- Add a `vitest` unit test in `tests/asset-validation.test.ts` that imports and runs the validator against `public/assets/examples/robot-placeholder.glb` to assert exit code 0 and no critical warnings.
- Add `npm` scripts:
  - `assets:validate` — run Node script
  - `assets:optimize` — optional, runs `gltf-pipeline` with draco
  - `assets:check-ci` — same as validate but configured for CI failure on any warning

Task F — Documentation and onboarding
- Update `README.md` with a short section "Assets & art pipeline" linking to `docs/assets.md` and `plan/milestone-07-assets-pipeline.md`.
- Add a short `plan/handover.md` note describing how to hand this to artists.

Timeline (suggested)
--------------------
- Day 1: Add docs and repo layout, commit example GLB
- Day 2: Implement validator script and npm scripts, add Vitest test
- Day 3: Add CI job to run validator and finalize docs

Acceptance criteria
-------------------
- A minimal GLB example loads in the dev build without errors.
- Validator script runs locally and in CI, failing the build on missing or invalid required assets.
- `docs/assets.md` clearly instructs artists how to export compatible glTF files.

Risks & mitigations
--------------------
- Large source files: Keep `assets/sources/` gitignored; suggest an LFS or external art repo.
- Native compressors/tooling (e.g., Draco) may require native binaries on CI—use lightweight, pure-node options or prebuilt binaries; document optional steps for artists.

Next steps / follow-ups
----------------------
- Implement automatic thumbnail generation for asset browser.
- Add KTX2 transcoding step to support GPU-efficient textures.
- Create a small web-based asset browser page under `docs/` for artists to preview exports.

Files added/edited
------------------
- New: `plan/milestone-07-assets-pipeline.md` (this file)
- New (suggested): `docs/assets.md`
- New (suggested): `public/assets/examples/robot-placeholder.glb` and supporting textures
- New (suggested): `scripts/validate-assets.ts`
- New (suggested): `tests/asset-validation.test.ts`

Verification
------------
- Local: run `npm run assets:validate` and `npm run test tests/asset-validation.test.ts`
- CI: add a job that checks out the repo and runs `npm ci && npm run assets:check-ci`

Status
------
Planned: documentation created, implementation work remains (scripts, CI, example assets).
