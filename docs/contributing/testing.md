# Testing & Verification

We emphasize a Test-First (TDD) approach for core game logic and UI components.

## Testing Frameworks

- **Unit/Integration**: Vitest + React Testing Library.
- **E2E**: Playwright.

## File Organization

- Unit tests: `*.test.ts` or `*.test.tsx` located in `tests/`.
- E2E specs: Located in `playwright/`.

## Key Commands

- `npm run test` – Run all unit tests.
- `npm run test:watch` – Interactive test runner.
- `npm run test:coverage` – View code coverage.
- `npm run playwright:test` – Run end-to-end tests.

## Performance Verification

- Pathfinding system must maintain <16ms execution time for 20 robots.
- Browser violations for long-running tasks should be investigated and fixed.
