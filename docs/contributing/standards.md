# Coding Standards & Quality

We enforce strict TypeScript and React patterns to ensure a high-quality, maintainable codebase.

## Language & Frameworks

- **Standard**: TypeScript 5.9+, React 19+.
- **Formatting**: oxfmt, configured in `.oxfmtrc.json` (Prettier-compatible defaults: double quotes, semicolons, trailing commas everywhere, 80 char width). Run `npm run format`; CI runs `npm run format:check`.
- **Linting**: oxlint, configured in `.oxlintrc.json` (react, react-hooks, jsx-a11y, import and vitest rules).

## Core Principles

- **Strict TypeScript**: No `any`. Strict null checks enabled.
- **Functional React**: Functional components and Hooks only.
- **Small Systems**: Keep files <300 lines where possible.
- **Pure Functions**: Export testable logic; avoid side effects in core simulation.
- **ES Modules Policy**: Use ESM (`import`/`export`) for all code and scripts. Avoid `require()`. Use `.cjs` only if CommonJS is strictly required.

## Naming Conventions

- **Components**: PascalCase (`RobotPanel.tsx`).
- **Files/Variables**: camelCase.
- **Types/Interfaces**: PascalCase.
