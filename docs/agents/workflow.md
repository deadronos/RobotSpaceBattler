# Workflow: issue → plan → implement

1. **Start from a GitHub issue.** Read it and anything it links. Current priorities are in
   [scratch.md](../../scratch.md).
2. **Plan non-trivial work.** Write a short plan in `docs/plans/YYYY-MM-DD-<topic>.md`:
   goal, acceptance criteria, steps, and how each step is tested. Small fixes can skip this.
3. **Implement test-first.** Write a failing test, make it pass, then refactor.
   Keep each step small and each file at or below 300 lines.
4. **Verify** with the pre-PR command list in [AGENTS.md](../../AGENTS.md). For UI or
   rendering changes, also run the app or the Playwright smoke test.
5. **Open a PR** ([git-and-prs.md](git-and-prs.md)). After merge, move the plan to
   `docs/archive/plans/`.

Agents work in their own worktree and branch (see [tooling.md](tooling.md)).
Ask the maintainer before changing CI, release flow, or anything that needs secrets.
