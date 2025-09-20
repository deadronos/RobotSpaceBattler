## Husky hooks removed

This repository previously used Husky for Git hooks, but Husky has been removed to simplify installs across different developer environments (particularly on Windows).

Recommended local checks to run before committing or opening a PR:

- Run linting and auto-fixes: `npm run lint:fix`
- Run the test suite: `npm run test`
- Format changes: `npm run format`

If you want to re-enable Husky locally, install it and recreate hooks with:

```bash
# install husky
npm install husky --save-dev
# setup hooks
npx husky install
# add hook examples
npx husky add .husky/pre-commit "npm run lint && npm test"
```

CI will still run linting and tests for pull requests; this note is to help local contributors keep code quality checks before pushing.
