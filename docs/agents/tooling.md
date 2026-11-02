# Tooling

## Lint and format

- **oxlint** (`.oxlintrc.json`). `npm run lint` uses `--deny-warnings`, so fix warnings
  rather than ignoring them. It also runs `scripts/check_source_size.js`.
- **oxfmt** (`.oxfmtrc.json`): double quotes, semicolons, trailing commas, 80 columns.
  `npm run format` writes and `npm run format:check` verifies. oxfmt ignores
  `.oxfmtrc.json` if it contains a `$schema` key; ignores go in `ignorePatterns`.
- Formatting-only commits are listed in `.git-blame-ignore-revs`. Run this once:
  `git config blame.ignoreRevsFile .git-blame-ignore-revs`

## Build

- Vite with SWC React, glsl, svgr, auto-import and type-checker plugins. `npm run build` writes `dist/` and a
  bundle treemap at `dist/stats.html`.
- `vite.config.ts` splits `node_modules` into `react`, `three`, `r3f` and `vendor` chunks with
  rolldown's `advancedChunks`, so no single chunk dominates (#159). Debug tooling
  (`ObstacleEditor`, `ObstacleSpawner`, `PerfToggles`) and the `r3f-perf` overlay are lazy
  imports and stay out of the initial load. `r3f-perf`/`stats-gl` are excluded from the
  startup groups on purpose: adding them to `vendor` pulls ~25 kB gzip into first paint.
- `npm run bundle:size` prints every emitted asset with raw and gzip size, and separates the
  initial load (what `dist/index.html` fetches: entry, `modulepreload`s, stylesheets, the
  document) from the lazy chunks. It gzips at `zlib` level 9, which is a few percent smaller
  than Vite's own reporter, so only compare numbers produced by the script.
  `node scripts/bundle-size.js <dist>` measures another build (e.g. a baseline worktree).
- `npm run check:bundle` enforces `scripts/bundle-budget.json` (initial-load and total gzip,
  plus a per-chunk ceiling) using the same measurement code. CI runs it right after the build.
  The treemap is for diagnosis; the budget is the gate.

## Worktrees and agents

- Do agent work in a git worktree on its own branch (for example `.claude/worktrees/<name>`),
  never directly on `main`. `.claude/` and `.worktrees/` are gitignored.
- Worktrees have no `node_modules` of their own. Node resolution walks up to the main
  checkout (#204). If a tool still cannot find packages, symlink the main checkout's
  `node_modules` into the worktree, and don't commit the symlink.

## CI (`.github/workflows/`)

- `ci.yml`: lint (with size check), format check, typecheck, coverage tests and build on
  Node 22/24/26, plus a Playwright smoke run on a production preview. `CI` is the required check.
- `publish-pages.yml`: a `v*` tag deploys to GitHub Pages, then runs a live smoke test.
- Dependabot: `.github/dependabot.yml`.
