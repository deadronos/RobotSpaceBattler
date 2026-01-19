# Coding Standards & Quality

We enforce strict TypeScript and React patterns to ensure a high-quality, maintainable codebase.

## Language & Frameworks

- **Standard**: TypeScript 5.9+, React 19+.
- **Formatting**: Prettier (trailing commas, single quotes, 100 char width).
- **Linting**: ESLint with `eslint-config-prettier` and strict rules.

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
