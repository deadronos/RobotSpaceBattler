Suggested commands (Windows PowerShell) — Exact scripts from `package.json`:

- Install dependencies: npm install
- Dev server: npm run dev (executes `vite`)
- Build: npm run build (executes `vite build`)
- Preview production build: npm run preview
- Unit tests (Vitest): npm run test (executes `vitest run`)
- Unit tests (watch): npm run test:watch
- Playwright helpers: npm run playwright:install (executes `playwright install`)
- Playwright E2E: npm run playwright:test (executes `playwright test`)
- Lint: npm run lint
- Lint fix: npm run lint:fix
- Format: npm run format

Notes:
- Playwright tests in repo expect a dev server on port 5174 for smoke tests per the AGENTS onboarding notes; dev server default is 5173.
- See `package.json` scripts for exact command strings and versions (Playwright dependency in `devDependencies`).
