Common developer commands for RobotSpaceBattler (PowerShell syntax):

- Install dependencies:
  npm install

- Start dev server (Vite):
  npm run dev
  (Project sets default port to 5173 in `vite.config.ts`.)

- Build production bundle:
  npm run build

- Preview production build:
  npm run preview

- Run unit tests (Vitest):
  npm run test
  npm run test:watch
  npm run test:coverage

- Playwright E2E:
  npm run playwright:install
  npm run playwright:test
  (Playwright expects the dev server on port 5174 for the smoke test.)

- Lint & format:
  npm run lint
  npm run format

- Additional utilities:
  # show git status
  git status
  # list files
  dir

Notes about Windows environment:
- When setting environment variables inline in commands, use PowerShell syntax or cross-env in scripts. Check package.json scripts for any OS-specific commands.
