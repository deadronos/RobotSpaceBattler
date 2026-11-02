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

Machine: Apple M4, ANGLE Metal, headed Chrome, 1440×900, `?debug`, 10 s rAF
sample per trial, uncapped run with vsync disabled. Each step is a build of that
commit, measured with the same harness.

**Method.** The first pass measured the steps one after another over about
50 minutes and the machine drifted by up to 40 %: `main` itself measured 139.8
fps at the start of the session and 205.0 fps an hour later, with no code change
(both 124 draw calls). The table below therefore comes from a second pass where
every step was built into its own worktree and the builds were measured
**interleaved, three single-trial rounds per build**, and it uses the median of
the three rounds. That reproduces within-run spread of about ±1 % (the exception
is a first-run-in-round outlier, still visible in the raw numbers).

| step | change                     | draw calls | triangles | uncapped fps | vsync p95 ms | kept |
| ---- | -------------------------- | ---------: | --------: | -----------: | -----------: | ---- |
| 0    | `main` `8d69167`           |        124 |   210 411 |        205.0 |         18.2 | –    |
| 1    | #231 one shadow light      |        106 |   196 676 |        203.2 |         18.3 | yes  |
| 2    | #229 merged arena + neon   |         36 |   197 027 |        213.5 |         18.3 | yes  |
| 3    | #230 23 lights → 6         |         36 |   197 028 |        310.4 |         18.3 | yes  |
| 4    | #232 antialias off, msaa 4 |         36 |   197 028 |        372.3 |         18.4 | yes  |
| 5    | #233 live instance counts  |         35 |    15 227 |        380.3 |         18.3 | yes  |

Per-round uncapped fps, in measurement order:

| step | round 1 | round 2 | round 3 | median |
| ---- | ------: | ------: | ------: | -----: |
| 0    |   204.6 |   204.7 |   205.8 |  205.0 |
| 1    |   204.0 |   202.5 |   203.1 |  203.2 |
| 2    |   213.6 |   213.5 |   211.6 |  213.5 |
| 3    |   295.6 |   310.4 |   311.9 |  310.4 |
| 4    |   353.1 |   380.0 |   372.3 |  372.3 |
| 5    |   380.3 |   378.4 |   383.1 |  380.3 |

**Paired before/after:** `main` 205.0 fps → branch 380.3 fps (+85 %), 124 → 35
draw calls (−72 %), 210 411 → 15 227 triangles (−93 %). vsync mean is 16.65 ms
(60 fps) on both sides and p95 moves 18.2 → 18.3 ms, i.e. inside the
launch-to-launch jitter: p95 flips between 17.4 and 18.4 ms between browser
launches _for the same build_, and every frame stays under 19 ms, so no frame is
dropped in either.

### Step 1 (#231) shadows

- 124 → 106 draw calls and 210 411 → 196 676 triangles at a default roster: the
  second spot light's shadow map (all static casters) is gone, and the floor no
  longer casts.
- Uncapped fps is flat (205.0 → 203.2, −1 %, inside noise) because the frame is
  GPU-bound elsewhere at this point; `gl.render` time drops 6.8 → 5.7 ms per
  frame in the `--breakdown` sample. Robots still cast readable floor shadows.
- Kept for the acceptance criterion (exactly one shadow-casting light) and the
  lower vertex/shadow-map cost on weaker GPUs, not for the M4 frame rate.

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
  lit strips added a diffuse term on top of the emissive one: at the old numbers
  the bloom halo around a strip was roughly half as bright as `main`'s.

### Step 3 (#230) lights

- 23 lights → 6: ambient, hemisphere, the shadow directional, a fill
  directional and two coloured key spots. The rig is data in
  `src/visuals/lightRig.ts` with a budget test.
- The 15 point lights (6 lamp panels, 4 corridor, 4 hover beacon, 1 centre) and
  the arena spot are gone. Measured contribution of those 15 lights with a
  runtime A/B in one frame (render the scene with and without them, then diff
  the pixels): **mean 0.25/255 per channel, 0.3 % of channels above 6 levels**.
  Their `distance`/`decay` made them nearly invisible on the dark floor, so fake
  additive floor pools were tried and then dropped: reproducing them would have
  made the floor _more_ coloured than `main`, which is a look change.
- Team colour statistics before/after (mean of the saturated red and blue pixels
  in the screenshot): red (182,75,76) → (175,74,76), blue (35,75,125) →
  (36,73,120). No measurable contrast loss, default or colour-blind palette.

### Step 4 (#232) post-processing

Three variants, each rebuilt and measured interleaved (three single-trial
rounds):

| variant (all with `antialias: false` on the canvas) | draw calls | textures | uncapped fps | kept |
| --------------------------------------------------- | ---------: | -------: | -----------: | ---- |
| `multisampling` 4, `mipmapBlur: false`              |         36 |        8 |        379.4 | yes  |
| `multisampling` 8, `mipmapBlur: false`              |         36 |        8 |        380.1 | –    |
| `multisampling` 4, `mipmapBlur: true`               |         45 |       20 |        373.9 | no   |

- The win is `antialias: false` on the canvas: with the composer running, the
  default framebuffer was still multisampled and resolved on every present.
- `multisampling` 4 and 8 are the same speed here, so 4 stays: half the
  multisample buffer for no measured cost, and edge screenshots show no
  aliasing.
- `mipmapBlur: true` costs 1.4 % fps plus 9 draw calls and 12 textures, and the
  bloom halo already matches `main` without it, so it stays off.
- A `multisampling: 0` + SMAA variant was measured against a stale build by
  mistake and dropped: it only pays off if MSAA were the bottleneck, and the two
  rows above show it is not.
- Caveat: `antialias` is a creation-time flag, so it is captured on the first
  render (`resolveCanvasAntialias`). Turning reduced motion on at runtime drops
  the composer and leaves the canvas without MSAA until a reload.

### Step 5 (#233) live instance counts

- Triangles drawn fell from 197 028 to 15 227 at a default roster: 92 % of the
  old triangles were hidden instance capacity.
- Draw calls 35 on average; with the roster emptied they drop to 21 because a
  layer whose `count` reaches 0 no longer issues its draw call. That is the one
  behaviour change against the #168 note "count stays at capacity": the count is
  now a floor, never a growth path.
- Uncapped fps 372.3 → 380.3 (+2 %) and vsync p95 18.4 → 18.3: the M4 barely
  notices, but the per-frame vertex work is now proportional to what is on
  screen, which is what mobile GPUs pay for.

## Outcome against the acceptance criteria

| criterion                                                             | result                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Draw calls ≤ 45 at the default roster, arena main pass ≤ 6            | 35 total, 6 arena meshes (floor, merged solid, 4 neon groups)                                         |
| Exactly one shadow-casting light, floor does not cast                 | yes (`#231`; `tests/visuals/lightRig.spec.ts`)                                                        |
| ≤ 6 scene lights                                                      | 6 (`SCENE_LIGHTS`, budget test)                                                                       |
| Uncapped fps up, vsync p95 no regression                              | 205.0 → 380.3 fps; p95 18.2 → 18.3 ms inside launch jitter, no dropped frames                         |
| Neon/bloom and team colours survive, #166 palette included            | before/after screenshots in both palettes; red/blue pixel means within 4 %                            |
| Triangles scale with live entities, not capacity                      | 197 028 → 15 227                                                                                      |
| No new console warnings, bundle in budget, bench unchanged, e2e green | only the existing `THREE.Clock` deprecation; 417.5/493.7 kB gzip; 1.72 ms/tick at 200 robots; 7/7 e2e |

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
