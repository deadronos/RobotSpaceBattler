# Plan: render-cost diet — arena draw calls, lights, shadows, post-processing (#229–#233)

Status: draft. Rendering-only; simulation behaviour, the determinism goldens and
the parity tests must not change.

## Why

The 2026-11-02 assessment (`main` `8d69167`, Apple M4, ANGLE Metal, uncapped,
1440×900, `?debug`) measured **124 draw calls, about 139 fps uncapped, and about
7.0 ms of the 7.2 ms frame inside `gl.render`**. The sim is negligible, so the
frame is render-bound. The #168 merge commit measures the same today, so this is
not a regression.

Live A/B toggles on the same page:

| change                                | fps | draw calls |
| ------------------------------------- | --: | ---------: |
| current                               | 139 |        124 |
| 15 point lights off                   | 178 |        123 |
| + 4 spot and the hemisphere light off | 192 |        106 |
| `?postfx=0`                           | 230 |        116 |
| `?shadows=0`                          | 157 |         73 |
| `?postfx=0&shadows=0`                 | 323 |         65 |

Scene breakdown: 81 meshes, 77 unique materials, 23 programs and 23 lights
(ambient, hemisphere, 2 directional, 4 spot, 15 point). Two lights cast shadows.
The static arena is about 64 of the 73 main-pass draw calls. About 150k of the
210k triangles come from hidden instances at capacity.

## Acceptance criteria

1. Draw calls at the default roster ≤ 45 (from 124), with the arena main pass ≤ 6.
2. Exactly one shadow-casting light; the floor does not cast.
3. ≤ 6 scene lights.
4. Uncapped fps improves measurably over the paired 3-trial baseline, and the
   vsync p95 does not regress.
5. The neon/bloom look and team-colour readability survive, including the #166
   colour-blind palette: before/after screenshots in the PR.
6. Triangles scale with live entities, not instance capacity.
7. No new console warnings; bundle stays within budget; `npm run bench`
   unchanged; e2e smoke green.

## Measurement (step 0)

- Baseline: `npm run perf:visuals -- --label=diet-0-baseline --trials=3`.
- Add the A/B probe to the harness as an opt-in flag (for example
  `--breakdown`): a scene dump of lights by type, unique materials, programs,
  meshes grouped by material/triangles/instance count/`castShadow`, plus the
  uncapped fps and the mean ms per frame inside `gl.render` (wrap
  `window.__robotScene.gl.render`). A working prototype is
  `scripts/perf/probe-render-cost.mjs` in the starting commit; fold it into
  `scripts/perf/visuals/` and delete the prototype. Keep every file ≤ 300 lines.
- Machine noise is ±10% on uncapped fps, so the authoritative before/after is a
  paired 3-trial run of `main` versus the branch, made at the same time.

## Hillclimb

One change per step, re-measured after each, then keep or revert. Record each
step in a table in this plan and the PR (draw calls, triangles, uncapped fps,
p95, kept).

1. **#231 shadows.** Turn off `castShadow` on the `ArenaLightRig` spot light and
   on the floor. Expected: about 25 fewer draw calls.
2. **#229 merge the arena.** Build the floor, walls, pillars and lamp housings
   into one or two merged geometries (`BufferGeometryUtils.mergeGeometries`) from
   the existing config arrays in a pure module, for example
   `src/visuals/arena/arenaGeometry.ts`. Merge the neon strips, pillar rings and
   lamp faces into two or three unlit meshes (`MeshBasicMaterial`, vertex colours
   scaled above 1.0, `toneMapped: false`) so bloom still picks them up. Replace
   the 34 `NeonGeometry` `useFrame` pulses with one update per pulse group.
   Delete `NeonGeometry` if nothing else uses it.
3. **#230 lights.** Cut to about 5 or 6: ambient, hemisphere, the shadow
   directional and two or three coloured key lights. Drop the per-lamp and
   hover-beacon point lights. Tune intensities against screenshots.
4. **#232 post-processing.** Set `antialias: false` on the canvas when
   post-processing is on (it's a creation-time flag, so decide it from the
   initial quality settings). Try `multisampling` 4 and `mipmapBlur: true`; keep
   whatever wins without visible aliasing.
5. **#233 live instance counts.** Set `mesh.count` to the live high-water mark in
   the instanced VFX, health-bar, marker and robot meshes instead of drawing
   capacity with hidden slots.
6. **Docs.** Update `docs/technical/instancing.md` (the arena path, live counts),
   `docs/agents/architecture.md` if the code map changes, and `scratch.md`.

## Results (hillclimb)

Machine: Apple M4, ANGLE Metal, headed Chrome, uncapped run with vsync disabled,
1440×900, `?debug`, 10 s rAF sample per trial. Each row is a `perf:visuals`
run, uncapped fps and vsync p95 averaged over the trials shown. The paired
`main` row is measured in the same session as the final row, so only that pair is
authoritative for the noise-sensitive numbers (machine noise is ±10%).

| step | change                                     | trials | draw calls | triangles | uncapped fps | vsync p95 ms | kept |
| ---- | ------------------------------------------ | -----: | ---------: | --------: | -----------: | -----------: | ---- |
| 0    | baseline (`main` content)                  |      3 |        124 |   210 411 |        139.8 |        17.37 | –    |
| 1    | #231 one shadow light, floor does not cast |      3 |        106 |   196 675 |        140.5 |        18.23 | yes  |
| 2    | #229 merged arena + unlit neon groups      |      3 |         36 |   197 028 |        147.5 |        18.23 | yes  |
| 3    | #230 23 lights → 6                         |      3 |         36 |   197 028 |        197.3 |        17.43 | yes  |

### Measured scene (baseline `--breakdown`)

- lights: 1 ambient, 1 hemisphere, 2 directional, 4 spot, 15 point (23);
  2 cast shadows.
- 81 meshes, 77 unique materials, 23 programs.
- uncapped: 142.7 fps, 7.01 ms per frame, 6.81 ms of it inside `gl.render` (97%).

### Step 2 (#229) arena structure

- The environment is 6 main-pass meshes: floor, one merged solid (walls,
  pillars, lamp housings) and 4 unlit neon groups (`wall-top`, `wall-bottom`,
  `pillar-rings`, `lamp-faces`). One environment shadow caster.
- 23 meshes in the whole scene, 19 unique materials, 24 programs.
- One `useFrame` drives every neon pulse group (was 34 `NeonGeometry` callbacks).
- The unlit strips carry `colour × intensity` in vertex colours with
  `toneMapped: false`, so they land above the bloom threshold like the old
  emissive materials did. The intensities were re-tuned against screenshots
  (2.4 / 1.8 / 3.4 / 5.0 instead of the old 2 / 1.5 / 3 / 4.2), because the old
  lit strips added a diffuse term on top of the emissive one.

### Step 3 (#230) lights

- 23 lights → 6: ambient, hemisphere, the shadow directional, a fill
  directional and two coloured key spots. The rig is data in
  `src/visuals/lightRig.ts` with a budget test.
- The 15 point lights (6 lamp panels, 4 corridor, 4 hover beacon, 1 centre) and
  the arena spot are gone. Measured contribution of those 15 lights with a
  runtime A/B on the same frame (render the scene with and without them, then
  diff the pixels): **mean 0.25/255 per channel, 0.3 % of channels above 6
  levels**. Their `distance`/`decay` made them nearly invisible on the dark
  floor, so fake additive pools were tried and then dropped: they were more
  visible than the lights they replaced, which would have changed the look.
- Team colour statistics before/after (mean of the saturated red and blue
  pixels in the screenshot): red (182,75,76) → (175,74,76), blue (35,75,125) →
  (36,73,120). No measurable contrast loss.

## Tests

- `arenaGeometry`: merged vertex/index counts and bounding boxes match the
  wall/pillar/lamp configs; the neon groups carry the expected vertex colours.
- Pulse logic as a pure function, if it's extracted.
- Live-count logic: the high-water mark grows and shrinks with allocations
  (extend `tests/visuals/visualInstanceManager.spec.ts`).
- Existing visuals, instancing and smoke tests stay green; the sim tests are
  untouched.

## Verification

`npm run lint && npm run format:check && npm run typecheck && npm test && npm run build`,
`npm run check:bundle`, `npm run playwright:preview`, `npm run bench`, and the
paired `npm run perf:visuals -- --trials=3` against `main`.
