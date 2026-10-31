# Scratch: what to work on next

_Written 2026-10-31 against `main` @ `fb5a50c`. Covers the open issues under the October 2026 review (#177)._

#151 (CI gate) and #152 (oxfmt) are closed via PR #179, so step 1 of the #177 top-5 is done. I re-checked the code for each item below and all of them still reproduce on `main`.

## Tier 1: quick live-bug fixes (S, do these first)

These are small, already pinned to file and line, and each one fixes something you can see on the deployed site.

1. **#155: duplicate `updateAISystem` call, draws, match timeout.** `battleRunner.ts:168-169` still calls it twice, which doubles AI cost and RNG draws. A match where both teams die on the same tick never ends. This is the most important small fix, and #171 and #160 both depend on it.
2. **#153: Alive HUD shows 0.** `App.tsx:116` memoizes `aliveCounts` on `[battleWorld]`. It's a visible bug and only a few lines to fix.
3. **#154: base-path 404 for the obstacle fixture, and the favicon.** `App.tsx:91` uses an absolute `fetch("/specs/...")`. Import the JSON statically and drop the fetch.
4. **#156: native DPR.** `qualityDefaults.ts:142` hard-codes `dpr = 0.5`, so the canvas renders blurry. Also delete one of the two rescalers.

All four can go in one "live quick fixes" PR or in four tiny ones. They touch mostly different files: #153 and #154 both touch `App.tsx`, so do those two in sequence.

## Tier 2: correctness and CI hygiene (S/M)

5. **#157: pathfinding worker.** This is the biggest live bug (643 console errors in about 11 s). Replace the `multithreading` serialization with a native Vite module worker. It's M-sized and cross-cutting, so give it a capable agent.
6. **#182: the `.constitution-check` bypass.** The root file is still committed, so the PR-body gate always passes. Make the call (fix the gate or drop it) and spend 30 minutes on it. Do it before #180.
7. **#181: oxlint errors in `tests/`.** `lint` is still `oxlint src`. The fixes are mechanical (86 are `require-mock-type-parameters`), and they make CI enforce lint on tests.
8. **#180: require the `CI` aggregator check.** This is a **manual repo-settings change for Lars**, not agent work. Do it after #182 so the constitution check can be required too.

## Tier 3: test foundation (M)

9. **#160: headless full-match tests and a coverage floor.** `combatSystem` has 1.6% line coverage and `battleRunner` 37%. Do this after #155 so the draw and timeout logic gets tested, and before the Tier 4 refactors, so they have a safety net.
10. **#158: Playwright smoke test that fails on console errors.** Pair it with #157 so the worker fix stays fixed.

## Tier 4: architecture (L, plan before starting)

11. **#161: fixed timestep and deterministic replays.** Builds on #160's seeded harness.
12. **#162: stop re-rendering React every frame and settle robot physics ownership.** Do it after #161. #168 (instanced robots) should wait for this.
13. **#171: AI spatial index.** Only after #155. It matters only once you want more than 20 robots.

## Lower priority / later

- **#164** (debug globals) and **#165** (root clutter): S-sized cleanups for any short window. #164 needs a `?debug` flag that the Playwright specs can use, so do it with or after #158.
- **#167** (README and Node engines): S-sized docs work for any time.
- **#169** (HUD readability), **#170** (match-end screen), **#166** (accessibility): UX polish. #170 benefits from #155's draw outcome.
- **#159** and **#184** (bundle diet and the Rapier 0.21 decision): evaluate them together. Lazy-loading Rapier is the likely path.
- **#168** (robot visuals) and **#163** (team builder, XL): feature work that should wait for Tier 4.
- **#183** (three 0.187) and **#185** (`THREE.Clock`): blocked on upstream. Check the releases now and then, nothing to do yet.

## Suggested order, in short

`#155 → #153 → #154 → #156` → `#182 → #181` (then Lars does #180) → `#157 + #158` → `#160` → `#161 → #162`

Parallel-safe pairs: #156 runs alongside #155. #181 runs alongside anything in `src/`. #182 runs alongside anything.
