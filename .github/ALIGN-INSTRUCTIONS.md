# Instruction Alignment & Cleanup

This document tracks the reorganization and optimization of instruction files in `.github/instructions` to align with `AGENTS.md` and project best practices.

## Summary of Changes

### Retained & Verified Files
These files are critical for the project context, workflow, and tech stack.

*   **`AGENTS.md`**: The root source of truth for repository guidelines.
*   **`.github/instructions/code-review-generic.instructions.md`**: Provides specific guidelines for code reviews. Useful for PR feedback.
*   **`.github/instructions/memory-bank.instructions.md`**: Core workflow documentation for the "Memory Bank" system (`.specify/`). Aligns with `AGENTS.md`.
*   **`.github/instructions/nodejs-javascript-vitest.instructions.md`**: Tech stack specific instructions (Node/JS/Vitest).
*   **`.github/instructions/playwright-typescript.instructions.md`**: Tech stack specific instructions (Playwright).
*   **`.github/instructions/prompt.instructions.md`**: Instructions on *how to write prompts*. Useful meta-documentation.
*   **`.github/instructions/reactjs.instructions.md`**: Tech stack specific instructions (React).
*   **`.github/instructions/spec-driven-workflow-v1.instructions.md`**: Core workflow documentation for the specification process. Aligns with `AGENTS.md` and `specs/`.
*   **`.github/instructions/taming-copilot.instructions.md`**: Core directives for AI agent behavior (conciseness, tool usage).
*   **`.github/instructions/typescript-5-es2022.instructions.md`**: Tech stack specific instructions (TypeScript).

### Moved Files
*   **`conventional-commit.prompt.md`**: Moved to `.github/prompts/` to align with `AGENTS.md` which states prompts belong in that directory, and the file extension convention.

### Deleted Files
These files were removed because they were generic "textbook" content not specific to this project, redundant, or incompatible with the environment.

*   **`ai-prompt-engineering-safety-best-practices.instructions.md`**: Generic educational material on prompt engineering. Not a project instruction.
*   **`github-actions-ci-cd-best-practices.instructions.md`**: Generic CI/CD best practices.
*   **`markdown.instructions.md`**: Generic Markdown guide.
*   **`performance-optimization.instructions.md`**: Generic performance advice.
*   **`security-and-owasp.instructions.md`**: Generic security textbook.
*   **`self-explanatory-code-commenting.instructions.md`**: Generic coding style advice (redundant with specific tech stack instructions).
*   **`powershell.instructions.md`**: Project is Linux/Node/React based. No PowerShell usage found.
*   **`tasksync.instructions.md`**: Relied on PowerShell (`Read-Host`) and a `run_in_terminal` tool not present in the standard Linux environment, causing compatibility issues.

## Alignment with AGENTS.md

*   **Prompts Location**: `AGENTS.md` states "Instructions/Prompts are in: `.github/prompts`". Moving `conventional-commit.prompt.md` enforces this.
*   **Workflow**: `memory-bank.instructions.md` and `spec-driven-workflow-v1.instructions.md` were kept as they document the core workflows referenced in `AGENTS.md`.
