# Contributing

Small notes to ensure developer workflow (especially on Windows) runs pre-commit hooks reliably.

- Preferred on Windows: Use Git Bash or WSL when possible. These provide a POSIX shell that Husky's default hooks expect.
- If you must use PowerShell or CMD: ensure `node` is on PATH and the repository includes `.husky/pre-commit.cmd` (this repo includes a Windows hook that calls a Node wrapper).
- If hooks fail on your machine with `env: unknown option -- help/_/pre-commit`: try using Git Bash or run commits with:

  git -c core.hooksPath=/dev/null commit -m "..."

  Then run `npx lint-staged` manually before pushing.

- CI: this repo includes a GitHub Actions workflow to run linting and formatting checks on pull requests.

Thanks for contributing — please run the test suite locally (`npm run test`) before open a PR.

See `CONTRIBUTING-HUSKY.md` for information about Husky hooks being removed and recommended local checks.
