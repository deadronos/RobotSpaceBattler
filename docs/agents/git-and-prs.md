# Git, commits and PRs

- Branch from `main`: `fix/<issue>-<slug>`, `feat/...`, `perf/...`, `chore/...`.
- Commit subjects are short and imperative, with an area prefix:
  `fix(pathfinding): re-request stale paths (#217)`.
- One concern per PR. Put `Closes #<n>` in the body.
- Fill in `.github/pull_request_template.md`: summary, checks run, screenshots for UI changes.
- `CI` must pass (see [tooling.md](tooling.md)). Don't merge your own PR unless the maintainer asks.
- Releases: pushing a `v*` tag deploys to GitHub Pages.
